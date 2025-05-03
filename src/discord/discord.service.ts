import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Deposit, User, Withdrawal } from '@prisma/client';

interface DiscordWebhookResponse {
  id: string;
  type: number;
  content: string;
  channel_id: string;
  author: {
    bot: boolean;
    id: string;
    username: string;
  };
  attachments: any[];
  embeds: any[];
  mentions: any[];
  mention_roles: any[];
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  timestamp: string;
  edited_timestamp: string | null;
  flags: number;
  components: any[];
}

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly depositWebhookUrl: string;
  private readonly withdrawalWebhookUrl: string;

  constructor(private configService: ConfigService) {
    const depositUrl = this.configService.get<string>(
      'DISCORD_DEPOSIT_WEBHOOK_URL',
    );
    const withdrawalUrl = this.configService.get<string>(
      'DISCORD_WITHDRAWAL_WEBHOOK_URL',
    );

    if (!depositUrl || !withdrawalUrl) {
      throw new Error('Webhook URLs must be defined');
    }

    this.depositWebhookUrl = depositUrl;
    this.withdrawalWebhookUrl = withdrawalUrl;
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
      const response = await fetch(this.depositWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });
      const responseBody = (await response.json()) as DiscordWebhookResponse;
      this.logger.debug('Deposit notification sent', responseBody);
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
      const response = await fetch(this.withdrawalWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });
      const responseBody = (await response.json()) as DiscordWebhookResponse;
      this.logger.debug('Withdrawal notification sent', responseBody);
    } catch (error) {
      console.error('Failed to send withdrawal notification:', error);
    }
  }
}
