import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-intent.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';
import { createHmac } from 'crypto';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;
  private readonly callbackSecret?: string;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DiscordService))
    private readonly discordService: DiscordService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not configured in environment variables',
      );
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });
    this.callbackSecret = process.env.CALLBACK_SIGNATURE_SECRET;
    if (!this.callbackSecret) {
      this.logger.warn(
        'CALLBACK_SIGNATURE_SECRET is not configured; callback redirects will not be signed.',
      );
    }
  }

  onModuleInit() {
    // เริ่ม polling สำหรับ payment ที่ยังไม่เสร็จสิ้น
    this.startPaymentPolling();
  }

  private startPaymentPolling() {
    // Polling ทุก 5 วินาที
    const pollInterval = 5000; // 5 seconds

    this.logger.log(
      `[PaymentPolling] Starting payment status polling every ${pollInterval / 1000} seconds`,
    );

    this.pollingInterval = setInterval(() => {
      void this.pollPendingPayments();
    }, pollInterval);
  }

  private async pollPendingPayments() {
    try {
      // ดึง payment ที่ยังไม่เสร็จสิ้น
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pendingPayments = await (this.prisma as any).payment.findMany({
        where: {
          status: {
            notIn: ['SUCCEEDED', 'FAILED', 'CANCELED'],
          },
        },
        take: 10, // จำกัดจำนวนเพื่อไม่ให้ overload
      });

      if (pendingPayments.length === 0) {
        this.logger.debug('[PaymentPolling] No pending payments found');
        return;
      }

      const paymentIds = pendingPayments.map(
        (p: any) => p.stripePaymentIntentId,
      );
      this.logger.debug(
        `[PaymentPolling] Checking ${pendingPayments.length} pending payments: ${paymentIds.join(', ')}`,
      );

      // ตรวจสอบสถานะของแต่ละ payment
      for (const payment of pendingPayments) {
        const paymentId = payment.stripePaymentIntentId;
        this.logger.debug(
          `[PaymentPolling] Checking payment: ${paymentId}, current status: ${payment.status}`,
        );
        try {
          await this.getPaymentIntentStatus(paymentId);
        } catch (error: any) {
          // ถ้า payment ไม่พบใน Stripe (อาจถูกลบหรือเป็น payment เก่า)
          if (error?.code === 'resource_missing' || error?.statusCode === 404) {
            this.logger.warn(
              `[PaymentPolling] Payment ${payment.stripePaymentIntentId} not found in Stripe. Marking as CANCELED.`,
            );
            // อัปเดตสถานะเป็น CANCELED
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (this.prisma as any).payment.update({
                where: { stripePaymentIntentId: payment.stripePaymentIntentId },
                data: { status: 'CANCELED' },
              });
              this.logger.log(
                `[PaymentPolling] Payment ${payment.stripePaymentIntentId} marked as CANCELED`,
              );
            } catch (updateError) {
              this.logger.error(
                `[PaymentPolling] Failed to update payment ${payment.stripePaymentIntentId}:`,
                updateError,
              );
            }
          } else {
            this.logger.error(
              `[PaymentPolling] Error checking payment ${payment.stripePaymentIntentId}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('[PaymentPolling] Error polling payments:', error);
    }
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    try {
      const {
        amount,
        currency = 'thb',
        description,
        email,
        callbackUrl,
        cancelUrl,
        metadata,
      } = dto;

      this.logger.log(`Creating PaymentIntent: ${amount} ${currency}`);

      // เลือกอีเมลเริ่มต้น หาก client ไม่ได้ส่งมา
      const emailToUse =
        email || process.env.PROMPTPAY_DEFAULT_EMAIL || 'humansaees0@gmail.com';

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        payment_method_types: ['promptpay'],
        description,
        metadata: metadata || {},
        confirm: true, // ✨ ยืนยันทันทีเพื่อสร้าง QR Code
        payment_method_data: {
          type: 'promptpay', // ✨ ระบุ payment method เป็น PromptPay
          billing_details: {
            email: emailToUse, // ✨ Email สำหรับ PromptPay (จำเป็นสำหรับ refund)
          },
        },
      });

      // อ่านข้อมูล QR Code จาก next_action
      let qrData: { imageUrl: string | null; data: string } | null = null;
      let qrCodeUrl: string | null = null;

      this.logger.log(
        `Payment Intent Status: ${paymentIntent.status}, Next Action Type: ${paymentIntent.next_action?.type}`,
      );

      if (
        paymentIntent.status === 'requires_action' &&
        paymentIntent.next_action
      ) {
        const nextAction = paymentIntent.next_action as any;

        // ลองหลายรูปแบบของ property name
        const qrCode =
          nextAction.promptpay_display_qr_code ||
          nextAction.display_qr_code ||
          nextAction.qr_code ||
          null;

        if (qrCode) {
          qrCodeUrl =
            qrCode.image_url_png || qrCode.image_url_svg || qrCode.hosted_instructions_url || null;
          const qrDataString = qrCode.data || qrCode.qr_data || '';

          this.logger.log(`QR Code found: ${qrCodeUrl ? 'Yes' : 'No'}`);

          qrData = {
            imageUrl: qrCodeUrl,
            data: qrDataString,
          };
        } else {
          this.logger.warn(
            `QR Code not found. Next action type: ${nextAction.type}. Available properties: ${JSON.stringify(Object.keys(nextAction))}`,
          );
        }
      } else if (paymentIntent.status !== 'requires_action') {
        this.logger.warn(
          `Payment Intent status is "${paymentIntent.status}", expected "requires_action" for QR code`,
        );
      }

      // บันทึกลงฐานข้อมูล (รวม callback URLs และ QR URL)
      const metadataJson = metadata
        ? JSON.parse(JSON.stringify(metadata))
        : null;
      const enhancedMetadata = {
        ...metadataJson,
        callbackUrl: callbackUrl || null,
        cancelUrl: cancelUrl || null,
        qrCodeUrl: qrCodeUrl || null, // เพิ่ม QR URL ใน metadata เพื่อให้หน้า payment.html ดึงได้
      };

      await this.prisma['payment'].create({
        data: {
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
          description: description || null,
          metadata: enhancedMetadata,
          qrCodeUrl: qrCodeUrl,
          userId: metadata?.userId || null,
        },
      });

      this.logger.log(`Payment record created: ${paymentIntent.id}`);
      this.logger.log(
        `[Payment Created] PaymentIntent ID: ${paymentIntent.id}, Status: ${paymentIntent.status}, Amount: ${paymentIntent.amount} ${paymentIntent.currency}`,
      );

      // ถ้าไม่มี QR Code ให้แจ้งเตือนแต่ยังคืนค่ากลับไป
      if (!qrData && paymentIntent.status === 'requires_action') {
        this.logger.error(
          'PromptPay QR Code not available. This might be because: 1) Using Test Mode (Test Mode may not support PromptPay fully), 2) Stripe account not configured for PromptPay, 3) API version mismatch',
        );
      }

      // สร้าง payment URL สำหรับ redirect
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const paymentUrl = `${baseUrl}/payment/${paymentIntent.id}`;

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        qr: qrData,
        paymentUrl: paymentUrl, // URL สำหรับ redirect ไปหน้าชำระเงิน
        error:
          !qrData && paymentIntent.status === 'requires_action'
            ? 'QR Code not available. Please check: 1) Use Live Mode instead of Test Mode, 2) Ensure Stripe account supports PromptPay in Thailand'
            : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to create PaymentIntent', error);
      throw error;
    }
  }

  async getPaymentIntentStatus(paymentIntentId: string) {
    try {
      // ดึงข้อมูลจากฐานข้อมูลก่อน (เร็วกว่า)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const localPayment = await (this.prisma as any).payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!localPayment) {
        this.logger.warn(
          `[getPaymentIntentStatus] Payment ${paymentIntentId} not found in database`,
        );
      } else {
        this.logger.debug(
          `[getPaymentIntentStatus] Payment ${paymentIntentId} found in database with status: ${localPayment.status}`,
        );
      }

      // ถ้าสถานะยังไม่เสร็จสิ้น ให้ตรวจสอบจาก Stripe
      if (
        localPayment &&
        !['SUCCEEDED', 'FAILED', 'CANCELED'].includes(localPayment.status)
      ) {
        this.logger.log(
          `[getPaymentIntentStatus] Checking Stripe for payment ${paymentIntentId}, current status: ${localPayment.status}`,
        );
        let paymentIntent;
        try {
          paymentIntent =
            await this.stripe.paymentIntents.retrieve(paymentIntentId);
          this.logger.log(
            `[getPaymentIntentStatus] Stripe status for ${paymentIntentId}: ${paymentIntent.status}`,
          );
        } catch (error: any) {
          // ถ้า payment ไม่พบใน Stripe
          if (error?.code === 'resource_missing' || error?.statusCode === 404) {
            this.logger.warn(
              `Payment ${paymentIntentId} not found in Stripe. Marking as CANCELED.`,
            );
            // อัปเดตสถานะเป็น CANCELED
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (this.prisma as any).payment.update({
              where: { stripePaymentIntentId: paymentIntentId },
              data: { status: 'CANCELED' },
            });
            // Return status as canceled
            return this.attachCallbackSignature({
              id: paymentIntentId,
              status: 'canceled',
              amount: localPayment.amount || 0,
              currency: localPayment.currency || 'thb',
              description: localPayment.description || '',
              metadata: localPayment.metadata || {},
              qrCodeUrl: localPayment.qrCodeUrl,
            });
          }
          throw error;
        }

        // อัปเดตสถานะในฐานข้อมูล
        const updatedStatus = this.mapStripeStatusToPaymentStatus(
          paymentIntent.status,
        );
        if (updatedStatus !== localPayment.status) {
          this.logger.log(
            `Status changed: ${localPayment.status} -> ${updatedStatus} for ${paymentIntentId}`,
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (this.prisma as any).payment.update({
            where: { stripePaymentIntentId: paymentIntentId },
            data: {
              status: updatedStatus,
              paidAt:
                updatedStatus === 'SUCCEEDED'
                  ? new Date()
                  : localPayment.paidAt,
            },
          });
          
          // อัปเดต localPayment สำหรับ return
          localPayment.status = updatedStatus;

          // ถ้าสถานะเปลี่ยนเป็น SUCCEEDED ให้เรียก handlePaymentSuccess
          // (รองรับกรณีที่ webhook ไม่ trigger เช่น local development)
          if (updatedStatus === 'SUCCEEDED') {
            this.logger.log(
              `[getPaymentIntentStatus] Payment succeeded, calling handlePaymentSuccess for ${paymentIntentId}`,
            );
            // เรียกแบบไม่ await เพื่อไม่ให้ block response
            this.handlePaymentSuccess(paymentIntentId).catch((error) => {
              this.logger.error(
                `[getPaymentIntentStatus] Error in handlePaymentSuccess: ${error}`,
              );
            });
          }
        }

        return this.attachCallbackSignature({
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          description: paymentIntent.description,
          metadata: localPayment?.metadata || paymentIntent.metadata, // ใช้ metadata จาก DB (มี callback URLs)
          qrCodeUrl: localPayment?.qrCodeUrl, // เพิ่ม QR Code URL
        });
      }

      // ถ้าสถานะเสร็จสิ้นแล้ว ใช้ข้อมูลจากฐานข้อมูล
      if (localPayment) {
        return this.attachCallbackSignature({
          id: localPayment.stripePaymentIntentId,
          status: this.mapPaymentStatusToStripeStatus(localPayment.status),
          amount: localPayment.amount,
          currency: localPayment.currency,
          description: localPayment.description,
          metadata: localPayment.metadata,
          qrCodeUrl: localPayment.qrCodeUrl, // เพิ่ม QR Code URL
        });
      }

      // ถ้าไม่มีในฐานข้อมูล ดึงจาก Stripe
      let paymentIntent;
      try {
        paymentIntent =
          await this.stripe.paymentIntents.retrieve(paymentIntentId);
      } catch (error: any) {
        // ถ้า payment ไม่พบใน Stripe
        if (error?.code === 'resource_missing' || error?.statusCode === 404) {
          this.logger.warn(
            `Payment ${paymentIntentId} not found in Stripe and not in database.`,
          );
          throw new Error(`Payment ${paymentIntentId} not found`);
        }
        throw error;
      }

      return this.attachCallbackSignature({
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
        qrCodeUrl: null, // ไม่มี QR ถ้าดึงจาก Stripe โดยตรง
      });
    } catch (error: any) {
      // ถ้าเป็น error ที่จัดการแล้ว (payment not found) ให้ throw ต่อ
      if (error?.message?.includes('not found')) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve PaymentIntent: ${paymentIntentId}`,
        error,
      );
      throw error;
    }
  }

  constructWebhookEvent(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    this.logger.log(`Verifying webhook signature with secret: ${webhookSecret.substring(0, 10)}...`);

    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
      this.logger.log(`Webhook signature verified successfully. Event type: ${event.type}`);
      return event;
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      this.logger.error(`Raw body length: ${rawBody.length}`);
      this.logger.error(`Signature: ${signature.substring(0, 50)}...`);
      throw error;
    }
  }

  async handleWebhookEvent(event: Stripe.Event) {
    this.logger.log(`Processing webhook event: ${event.type}`);
    this.logger.log(`Event ID: ${event.id}`);
    this.logger.log(`Event created: ${new Date(event.created * 1000).toISOString()}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const succeededIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(`Payment succeeded: ${succeededIntent.id}`);
        this.logger.log(`Payment amount: ${succeededIntent.amount} ${succeededIntent.currency}`);
        this.logger.log(`Payment metadata: ${JSON.stringify(succeededIntent.metadata)}`);
        
        // ตรวจสอบว่า payment นี้ถูกสร้างจากระบบของเราหรือไม่
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingPayment = await (this.prisma as any).payment.findUnique({
          where: { stripePaymentIntentId: succeededIntent.id },
        });

        if (!existingPayment) {
          this.logger.warn(
            `Payment ${succeededIntent.id} not found in database. This might be a test payment from Stripe CLI. Skipping...`,
          );
          break;
        }

        this.logger.log(
          `Payment ${succeededIntent.id} found in database. Processing...`,
        );
        
        await this.updatePaymentStatus(succeededIntent.id, 'SUCCEEDED');
        // อัปเดต embed และเพิ่มเงินเข้า wallet
        await this.handlePaymentSuccess(succeededIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.warn(`Payment failed: ${failedIntent.id}`);
        await this.updatePaymentStatus(failedIntent.id, 'FAILED');
        break;
      }

      case 'payment_intent.canceled': {
        const canceledIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(`Payment canceled: ${canceledIntent.id}`);
        await this.updatePaymentStatus(canceledIntent.id, 'CANCELED');
        break;
      }

      case 'payment_intent.processing': {
        const processingIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(`Payment processing: ${processingIntent.id}`);
        await this.updatePaymentStatus(processingIntent.id, 'PROCESSING');
        break;
      }

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async updatePaymentStatus(
    paymentIntentId: string,
    status:
      | 'PENDING'
      | 'REQUIRES_ACTION'
      | 'PROCESSING'
      | 'SUCCEEDED'
      | 'FAILED'
      | 'CANCELED',
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingPayment = await (this.prisma as any).payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!existingPayment) {
        this.logger.warn(
          `Payment record not found for: ${paymentIntentId}. This might be a test payment from Stripe CLI or a payment not created through our system.`,
        );
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.prisma as any).payment.update({
        where: { stripePaymentIntentId: paymentIntentId },
        data: {
          status,
          paidAt: status === 'SUCCEEDED' ? new Date() : undefined,
        },
      });
      this.logger.log(
        `Payment status updated: ${paymentIntentId} -> ${status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update payment status: ${paymentIntentId}`,
        error,
      );
    }
  }

  private mapStripeStatusToPaymentStatus(
    stripeStatus: string,
  ):
    | 'PENDING'
    | 'REQUIRES_ACTION'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELED' {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
        return 'PENDING';
      case 'requires_action':
        return 'REQUIRES_ACTION';
      case 'processing':
        return 'PROCESSING';
      case 'succeeded':
        return 'SUCCEEDED';
      case 'canceled':
        return 'CANCELED';
      default:
        return 'PENDING';
    }
  }

  private mapPaymentStatusToStripeStatus(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'PENDING':
        return 'requires_confirmation';
      case 'REQUIRES_ACTION':
        return 'requires_action';
      case 'PROCESSING':
        return 'processing';
      case 'SUCCEEDED':
        return 'succeeded';
      case 'FAILED':
        return 'requires_payment_method';
      case 'CANCELED':
        return 'canceled';
      default:
        return 'requires_confirmation';
    }
  }

  private attachCallbackSignature<T extends { id: string; amount: number }>(
    payload: T,
  ): T & { callbackSignature?: string } {
    if (!this.callbackSecret) {
      return payload;
    }

    const hmac = createHmac('sha256', this.callbackSecret)
      .update(`${payload.id}:${payload.amount}`)
      .digest('hex');

    return {
      ...payload,
      callbackSignature: hmac,
    };
  }

  private async handlePaymentSuccess(paymentIntentId: string) {
    try {
      this.logger.log(`[handlePaymentSuccess] Processing payment success for: ${paymentIntentId}`);
      
      // ดึงข้อมูล payment จากฐานข้อมูล
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payment = await (this.prisma as any).payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      this.logger.log(`[handlePaymentSuccess] Payment found: ${payment ? 'Yes' : 'No'}`);
      
      if (!payment) {
        this.logger.warn(`[handlePaymentSuccess] Payment not found for: ${paymentIntentId}`);
        return;
      }

      if (!payment.metadata) {
        this.logger.warn(`[handlePaymentSuccess] Payment metadata is missing for: ${paymentIntentId}`);
        return;
      }

      const metadata = payment.metadata as any;
      this.logger.log(`[handlePaymentSuccess] Metadata: ${JSON.stringify(metadata)}`);
      
      const messageId = metadata.messageId;
      const channelId = metadata.channelId;
      const guildId = metadata.guildId;
      const userId = metadata.userId;
      const type = metadata.type;

      this.logger.log(
        `[handlePaymentSuccess] Extracted values: type=${type}, userId=${userId}, messageId=${messageId}, channelId=${channelId}`,
      );

      if (!messageId || !channelId) {
        this.logger.warn(
          `[handlePaymentSuccess] No message ID or channel ID found for payment ${paymentIntentId}. messageId: ${messageId}, channelId: ${channelId}`,
        );
        return;
      }

      this.logger.log(`[handlePaymentSuccess] Updating embed for message ${messageId} in channel ${channelId}`);

      // อัปเดต embed ผ่าน DiscordService
      await this.discordService.updatePaymentEmbed(
        messageId,
        channelId,
        guildId,
        payment,
        metadata,
      );
      
      this.logger.log(`[handlePaymentSuccess] Embed update completed for payment ${paymentIntentId}`);

      // เพิ่มเงินเข้า wallet ถ้าเป็น coin pack หรือ topup
      if (type === 'coin_pack' && userId) {
        const coinsAmount = parseFloat(metadata.coinsAmount || '0');
        this.logger.log(
          `[handlePaymentSuccess] Processing coin_pack: userId=${userId}, coinsAmount=${coinsAmount}`,
        );
        if (coinsAmount > 0) {
          this.logger.log(`[handlePaymentSuccess] Calling addCoinsToWallet for userId=${userId}, amount=${coinsAmount}`);
          await this.addCoinsToWallet(userId, coinsAmount, paymentIntentId);
        } else {
          this.logger.warn(
            `[handlePaymentSuccess] coinsAmount is 0 or invalid for payment ${paymentIntentId}`,
          );
        }
      } else if (type === 'discord_topup' && userId) {
        const paymentAmount = parseFloat(metadata.paymentAmount || '0');
        this.logger.log(
          `[handlePaymentSuccess] Processing discord_topup: userId=${userId}, paymentAmount=${paymentAmount}`,
        );
        if (paymentAmount > 0) {
          this.logger.log(`[handlePaymentSuccess] Calling addCoinsToWallet for userId=${userId}, amount=${paymentAmount}`);
          await this.addCoinsToWallet(userId, paymentAmount, paymentIntentId);
        } else {
          this.logger.warn(
            `[handlePaymentSuccess] paymentAmount is 0 or invalid for payment ${paymentIntentId}`,
          );
        }
      } else {
        this.logger.warn(
          `[handlePaymentSuccess] Payment type mismatch or missing userId. type=${type}, userId=${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle payment success: ${paymentIntentId}`,
        error,
      );
    }
  }

  private async addCoinsToWallet(
    userId: string,
    amount: number,
    paymentIntentId: string,
  ) {
    try {
      this.logger.log(
        `[addCoinsToWallet] Starting: userId=${userId}, amount=${amount}, paymentIntentId=${paymentIntentId}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user || !user.wallet) {
        this.logger.warn(`[addCoinsToWallet] User or wallet not found for userId: ${userId}`);
        return;
      }

      this.logger.log(
        `[addCoinsToWallet] User found: ${user.id}, current balance: ${user.wallet.balance}, adding: ${amount}`,
      );

      // เพิ่มเงินเข้า wallet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedWallet = await (this.prisma as any).wallet.update({
        where: { id: user.wallet.id },
        data: { balance: user.wallet.balance + amount },
      });

      this.logger.log(`[addCoinsToWallet] Wallet updated: new balance: ${updatedWallet.balance}`);

      // สร้าง transaction record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transaction = await (this.prisma as any).transaction.create({
        data: {
          amount,
          type: 'COIN_PACK',
          status: 'COMPLETED',
          userId: user.id,
          walletId: user.wallet.id,
        },
      });

      this.logger.log(`[addCoinsToWallet] Transaction created: ${transaction.id}`);

      this.logger.log(
        `Added ${amount} coins to wallet for user ${userId} from payment ${paymentIntentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add coins to wallet for user ${userId}`,
        error,
      );
    }
  }
}
