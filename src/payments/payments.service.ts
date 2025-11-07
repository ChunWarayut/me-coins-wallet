import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-intent.dto';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;
  private readonly callbackSecret?: string;

  constructor(private readonly prisma: PrismaService) {
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

      // ถ้าสถานะยังไม่เสร็จสิ้น ให้ตรวจสอบจาก Stripe
      if (
        localPayment &&
        !['SUCCEEDED', 'FAILED', 'CANCELED'].includes(localPayment.status)
      ) {
        const paymentIntent =
          await this.stripe.paymentIntents.retrieve(paymentIntentId);

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
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return this.attachCallbackSignature({
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
        qrCodeUrl: null, // ไม่มี QR ถ้าดึงจาก Stripe โดยตรง
      });
    } catch (error) {
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
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw error;
    }
  }

  async handleWebhookEvent(event: Stripe.Event) {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const succeededIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(`Payment succeeded: ${succeededIntent.id}`);
        await this.updatePaymentStatus(succeededIntent.id, 'SUCCEEDED');
        // TODO: เพิ่มเงินเข้า wallet หรือส่งการแจ้งเตือน
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
}
