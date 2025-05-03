import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Transaction,
  Deposit,
  Withdrawal,
  User,
  TransactionType,
} from '@prisma/client';
import { RequestStatus } from './dto/update-request-status.dto';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
  ) {}

  // Transactions
  async getTransactions(user: User): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
    });
  }

  // Deposits
  async createDepositRequest(data: {
    amount: number;
    slipImage: string;
    userId: string;
  }): Promise<Deposit> {
    const deposit = await this.prisma.deposit.create({
      data: {
        amount: data.amount,
        slipImage: data.slipImage,
        status: 'PENDING',
        user: {
          connect: {
            id: data.userId,
          },
        },
      },
      include: {
        user: true,
      },
    });

    await this.discordService.notifyDeposit(deposit);
    return deposit;
  }

  async getDepositRequests(): Promise<Deposit[]> {
    return this.prisma.deposit.findMany();
  }

  async updateDepositStatus(
    id: string,
    status: RequestStatus,
    comment?: string,
  ): Promise<Deposit> {
    const deposit = await this.prisma.deposit.update({
      where: { id },
      data: {
        status,
        comment,
      },
      include: {
        user: true,
      },
    });

    if (status === RequestStatus.APPROVED) {
      await this.createTransaction({
        userId: deposit.userId,
        amount: deposit.amount,
        type: TransactionType.DEPOSIT,
        depositId: deposit.id,
      });
    }

    return deposit;
  }

  // Withdrawals
  async createWithdrawRequest(data: {
    amount: number;
    userId: string;
  }): Promise<Withdrawal> {
    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        amount: data.amount,
        status: 'PENDING',
        user: {
          connect: {
            id: data.userId,
          },
        },
      },
      include: {
        user: true,
      },
    });

    await this.discordService.notifyWithdrawal(withdrawal);
    return withdrawal;
  }

  async getWithdrawRequests(): Promise<Withdrawal[]> {
    return this.prisma.withdrawal.findMany();
  }

  async updateWithdrawStatus(
    id: string,
    status: RequestStatus,
    comment?: string,
  ): Promise<Withdrawal> {
    const withdrawal = await this.prisma.withdrawal.update({
      where: { id },
      data: {
        status,
        comment,
      },
      include: {
        user: true,
      },
    });

    if (status === RequestStatus.APPROVED) {
      await this.createTransaction({
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        type: TransactionType.WITHDRAWAL,
        withdrawalId: withdrawal.id,
      });
    }

    return withdrawal;
  }

  private async createTransaction(data: {
    userId: string;
    amount: number;
    type: TransactionType;
    depositId?: string;
    withdrawalId?: string;
  }): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        amount: data.amount,
        type: data.type,
        status: 'COMPLETED',
        wallet: {
          connect: {
            id: data.userId,
          },
        },
        user: {
          connect: {
            id: data.userId,
          },
        },
        deposit: data.depositId
          ? {
              connect: {
                id: data.depositId,
              },
            }
          : undefined,
        withdrawal: data.withdrawalId
          ? {
              connect: {
                id: data.withdrawalId,
              },
            }
          : undefined,
      },
    });
  }
}
