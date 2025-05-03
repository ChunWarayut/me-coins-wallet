import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Deposit, User, Withdrawal } from '@prisma/client';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly depositWebhookUrl: string;
  private readonly withdrawalWebhookUrl: string;
  private readonly depositApproveWebhookUrl: string;
  private readonly depositRejectWebhookUrl: string;

  constructor(private configService: ConfigService) {
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
}
