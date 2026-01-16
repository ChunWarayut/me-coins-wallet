import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Deposit, User, Withdrawal } from '@prisma/client';
import { Client, EmbedBuilder } from 'discord.js';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private readonly depositWebhookUrl: string;
  private readonly withdrawalWebhookUrl: string;
  private readonly depositApproveWebhookUrl: string;
  private readonly depositRejectWebhookUrl: string;

  private client: Client | null = null;

  constructor(
    private configService: ConfigService,
    @Optional() @Inject('DISCORD_CLIENT') private readonly discordClient?: Client,
  ) {
    const depositUrl = this.configService.get<string>(
      'DISCORD_DEPOSIT_WEBHOOK_URL',
    );
    const withdrawalUrl = this.configService.get<string>(
      'DISCORD_WITHDRAWAL_WEBHOOK_URL',
    );
    const depositApproveUrl = this.configService.get<string>(
      'DISCORD_DEPOSIT_APPROVE_WEBHOOK_URL',
    );
    const depositRejectUrl = this.configService.get<string>(
      'DISCORD_DEPOSIT_REJECT_WEBHOOK_URL',
    );

    if (
      !depositUrl ||
      !withdrawalUrl ||
      !depositApproveUrl ||
      !depositRejectUrl
    ) {
      throw new Error('Webhook URLs must be defined');
    }

    this.depositWebhookUrl = depositUrl;
    this.withdrawalWebhookUrl = withdrawalUrl;
    this.depositApproveWebhookUrl = depositApproveUrl;
    this.depositRejectWebhookUrl = depositRejectUrl;
  }

  onModuleInit() {
    // ตั้งค่า Discord client จาก injected client หรือจาก DiscordCommands
    if (this.discordClient) {
      this.client = this.discordClient;
      this.logger.log('Discord client initialized from injection');
    } else {
      this.logger.warn('Discord client not injected, will be set from interaction');
    }
  }

  async notifyDeposit(deposit: Deposit & { user: User }) {
    if (!this.depositWebhookUrl) return;

    const embed = {
      title: 'New Deposit Request',
      color: 0x00ff00,
      fields: [
        {
          name: 'Amount',
          value: `${deposit.amount} coins`,
          inline: true,
        },
        {
          name: 'User',
          value: `<@${deposit.user.discordId}>`,
          inline: true,
        },
        {
          name: 'Status',
          value: deposit.status,
          inline: true,
        },
      ],
      image: {
        url: deposit.slipImage as string,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(this.depositWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });
      this.logger.debug('Deposit notification sent');
    } catch (error) {
      console.error('Failed to send deposit notification:', error);
    }
  }

  async notifyWithdrawal(withdrawal: Withdrawal & { user: User }) {
    if (!this.withdrawalWebhookUrl) return;

    const embed = {
      title: 'New Withdrawal Request',
      color: 0xff0000,
      fields: [
        {
          name: 'Amount',
          value: `${withdrawal.amount} coins`,
          inline: true,
        },
        {
          name: 'User',
          value: `<@${withdrawal.user.discordId}>`,
          inline: true,
        },
        {
          name: 'Status',
          value: withdrawal.status,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(this.withdrawalWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });
      this.logger.debug('Withdrawal notification sent');
    } catch (error) {
      console.error('Failed to send withdrawal notification:', error);
    }
  }

  async notifyDepositApproval(deposit: Deposit & { user: User }) {
    if (!this.depositApproveWebhookUrl) return;

    const embed = {
      title: 'Deposit Request Approved',
      color: 0x00ff00,
      fields: [
        {
          name: 'Amount',
          value: `${deposit.amount} coins`,
          inline: true,
        },
        {
          name: 'User',
          value: `<@${deposit.user.discordId}>`,
          inline: true,
        },
        {
          name: 'Transaction ID',
          value: deposit.id,
          inline: true,
        },
      ],
      image: {
        url: deposit.slipImage as string,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(this.depositApproveWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });
      this.logger.debug('Deposit approval notification sent');
    } catch (error) {
      console.error('Failed to send deposit approval notification:', error);
    }
  }

  async notifyDepositRejection(deposit: Deposit & { user: User }) {
    if (!this.depositRejectWebhookUrl) return;

    const embed = {
      title: 'Deposit Request Rejected',
      color: 0xff0000,
      fields: [
        {
          name: 'Amount',
          value: `${deposit.amount} coins`,
          inline: true,
        },
        {
          name: 'User',
          value: `<@${deposit.user.discordId}>`,
          inline: true,
        },
        {
          name: 'Transaction ID',
          value: deposit.id,
          inline: true,
        },
      ],
      image: {
        url: deposit.slipImage as string,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(this.depositRejectWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });
      this.logger.debug('Deposit rejection notification sent');
    } catch (error) {
      console.error('Failed to send deposit rejection notification:', error);
    }
  }

  setClient(client: Client | null) {
    this.client = client;
  }

  async updatePaymentEmbed(
    messageId: string,
    channelId: string,
    guildId: string | null,
    payment: any,
    metadata: any,
  ) {
    try {
      this.logger.log(`[updatePaymentEmbed] Starting update for message ${messageId} in channel ${channelId}`);
      this.logger.log(`[updatePaymentEmbed] Client available: ${this.client ? 'Yes' : 'No'}`);
      
      // ถ้า client ยังไม่มี ให้ลองใช้ injected client อีกครั้ง
      if (!this.client && this.discordClient) {
        this.client = this.discordClient;
        this.logger.log('[updatePaymentEmbed] Discord client retrieved from injection');
      }

      if (!this.client) {
        this.logger.error('[updatePaymentEmbed] Discord client not available, cannot update embed');
        this.logger.error('[updatePaymentEmbed] Please ensure client is set via setClient() from interaction');
        return;
      }

      this.logger.log(`[updatePaymentEmbed] Fetching channel ${channelId}`);

      const channel = await this.client.channels.fetch(channelId);
      this.logger.log(`[updatePaymentEmbed] Channel fetched: ${channel ? 'Yes' : 'No'}`);

      if (!channel) {
        this.logger.error(`[updatePaymentEmbed] Channel ${channelId} not found`);
        return;
      }

      if (!channel.isTextBased()) {
        this.logger.error(`[updatePaymentEmbed] Channel ${channelId} is not text-based`);
        return;
      }

      // Type guard: ตรวจสอบว่า channel มี method send()
      if (!('send' in channel)) {
        this.logger.error(`[updatePaymentEmbed] Channel ${channelId} does not support sending messages`);
        return;
      }

      this.logger.log(`[updatePaymentEmbed] Fetching message ${messageId}`);
      let message;
      let messageNotFound = false;
      try {
        message = await channel.messages.fetch(messageId);
      } catch (error: any) {
        // ถ้า message ไม่พบ (Unknown Message - 10008) หรือถูกลบ
        if (error?.code === 10008 || error?.status === 404) {
          this.logger.warn(
            `[updatePaymentEmbed] Message ${messageId} not found in channel ${channelId}. Message may have been deleted. Will send a new message instead.`,
          );
          messageNotFound = true;
        } else {
          // ถ้าเป็น error อื่น ให้ throw ต่อ
          throw error;
        }
      }
      
      if (!message && !messageNotFound) {
        this.logger.warn(`[updatePaymentEmbed] Message ${messageId} not found in channel ${channelId}`);
        messageNotFound = true;
      }

      // ถ้า message ไม่พบ ให้ส่ง message ใหม่แทน
      if (messageNotFound) {
        this.logger.log(`[updatePaymentEmbed] Message not found, sending new message to channel ${channelId} instead`);
        try {
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ ชำระเงินสำเร็จ')
            .setDescription(
              `**สถานะ:** ✅ ชำระเงินสำเร็จ\n\n**จำนวนเงิน:** ${(payment.amount / 100).toFixed(2)} THB\n**เวลาที่ชำระ:** <t:${Math.floor(new Date().getTime() / 1000)}:R>`,
            )
            .setColor(0x00ff00) // สีเขียว
            .setFooter({
              text: 'ชำระเงินสำเร็จแล้ว',
            })
            .setTimestamp();

          // Type assertion: channel.isTextBased() แล้ว และมี 'send' in channel แล้ว
          const sentMessage = await (channel as any).send({
            embeds: [successEmbed],
          });
          this.logger.log(`[updatePaymentEmbed] Successfully sent new payment success message (ID: ${sentMessage.id}) to channel ${channelId}`);
        } catch (sendError: any) {
          this.logger.error(
            `[updatePaymentEmbed] Failed to send new message to channel ${channelId}:`,
            sendError,
          );
        }
        return;
      }

      this.logger.log(`[updatePaymentEmbed] Message found, updating embed`);

      // สร้าง embed ใหม่ที่แสดงสถานะชำระเงินสำเร็จ
      const oldEmbed = message.embeds[0];
      const newEmbed = new EmbedBuilder()
        .setTitle(
          oldEmbed?.title?.replace('💳', '✅').replace('💰', '✅') ||
            '✅ ชำระเงินสำเร็จ',
        )
        .setDescription(
          `**สถานะ:** ✅ ชำระเงินสำเร็จ\n\n${oldEmbed?.description || ''}\n\n**จำนวนเงิน:** ${(payment.amount / 100).toFixed(2)} THB\n**เวลาที่ชำระ:** <t:${Math.floor(new Date().getTime() / 1000)}:R>`,
        )
        .setColor(0x00ff00) // สีเขียว
        .setFooter({
          text: 'ชำระเงินสำเร็จแล้ว',
        })
        .setTimestamp();

      // คัดลอก image จาก embed เดิมถ้ามี
      if (oldEmbed?.image) {
        newEmbed.setImage(oldEmbed.image.url);
      }

      // ลบ components (ปุ่ม) ออก
      this.logger.log(`[updatePaymentEmbed] Editing message ${messageId}`);
      await message.edit({
        embeds: [newEmbed],
        components: [],
      });

      this.logger.log(`[updatePaymentEmbed] Successfully updated payment embed for message ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update payment embed for message ${messageId}`,
        error,
      );
    }
  }
}
