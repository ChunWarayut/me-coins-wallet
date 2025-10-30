/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import {
  TransactionType,
  TransactionStatus,
  TransferStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async createTransfer(userId: string, createTransferDto: CreateTransferDto) {
    const { receiverAccountNumber, amount, comment } = createTransferDto;

    // Get sender's user and wallet
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!sender?.wallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    // Get receiver's user and wallet
    const receiver = await this.prisma.user.findUnique({
      where: { accountNumber: receiverAccountNumber },
      include: { wallet: true },
    });

    if (!receiver?.wallet) {
      throw new NotFoundException('Receiver account not found');
    }

    // Check if sender and receiver are the same
    if (sender.accountNumber === receiverAccountNumber) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Check if sender has enough balance
    if (sender.wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create transfer and update balances in a transaction
    return this.prisma.$transaction(async (prisma) => {
      // Create transfer record
      const transfer = await prisma.transfer.create({
        data: {
          amount,
          status: TransferStatus.PENDING,
          senderId: userId,
          receiverId: receiver.id,
          comment,
        },
      });

      // Create transaction record for sender
      await prisma.transaction.create({
        data: {
          amount: -amount,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.PENDING,
          userId,
          walletId: sender.wallet!.id,
          transferId: transfer.id,
        },
      });

      // Create transaction record for receiver
      await prisma.transaction.create({
        data: {
          amount: amount,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.PENDING,
          userId: receiver.id,
          walletId: receiver.wallet!.id,
          transferId: transfer.id,
        },
      });

      // Update sender's balance
      await prisma.wallet.update({
        where: { id: sender.wallet!.id },
        data: { balance: sender.wallet!.balance - amount },
      });

      // Update receiver's balance
      await prisma.wallet.update({
        where: { id: receiver.wallet!.id },
        data: { balance: receiver.wallet!.balance + amount },
      });

      // Update transfer and transaction status
      await prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.COMPLETED },
      });

      await prisma.transaction.updateMany({
        where: { transferId: transfer.id },
        data: { status: TransactionStatus.COMPLETED },
      });

      return {
        ...transfer,
        receiver: {
          id: receiver.id,
          username: receiver.username,
          accountNumber: receiver.accountNumber,
        },
      } satisfies Prisma.TransferGetPayload<{
        include: {
          receiver: {
            select: {
              id: true;
              username: true;
              accountNumber: true;
            };
          };
        };
      }>;
    });
  }

  async createTransferFromDiscord(
    discordId: string,
    createTransferDto: CreateTransferDto,
  ) {
    const { receiverAccountNumber, amount, comment } = createTransferDto;

    // Get sender's user and wallet
    const sender = await this.prisma.user.findFirst({
      where: { discordId },
      include: { wallet: true },
    });

    if (!sender?.wallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    // Get receiver's user and wallet
    const receiver = await this.prisma.user.findUnique({
      where: { accountNumber: receiverAccountNumber },
      include: { wallet: true },
    });

    if (!receiver?.wallet) {
      throw new NotFoundException('Receiver account not found');
    }

    // Check if sender and receiver are the same
    if (sender.accountNumber === receiverAccountNumber) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Check if sender has enough balance
    if (sender.wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create transfer and update balances in a transaction
    return this.prisma.$transaction(async (prisma) => {
      // Create transfer record
      const transfer = await prisma.transfer.create({
        data: {
          amount,
          status: TransferStatus.PENDING,
          senderId: sender.id,
          receiverId: receiver.id,
          comment,
        },
      });

      // Create transaction record for sender
      await prisma.transaction.create({
        data: {
          amount: -amount,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.PENDING,
          userId: sender.id,
          walletId: sender.wallet!.id,
          transferId: transfer.id,
        },
      });

      // Create transaction record for receiver
      await prisma.transaction.create({
        data: {
          amount: amount,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.PENDING,
          userId: receiver.id,
          walletId: receiver.wallet!.id,
          transferId: transfer.id,
        },
      });

      // Update sender's balance
      await prisma.wallet.update({
        where: { id: sender.wallet!.id },
        data: { balance: sender.wallet!.balance - amount },
      });

      // Update receiver's balance
      await prisma.wallet.update({
        where: { id: receiver.wallet!.id },
        data: { balance: receiver.wallet!.balance + amount },
      });

      // Update transfer and transaction status
      await prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.COMPLETED },
      });

      await prisma.transaction.updateMany({
        where: { transferId: transfer.id },
        data: { status: TransactionStatus.COMPLETED },
      });

      return {
        ...transfer,
        receiver: {
          id: receiver.id,
          username: receiver.username,
          accountNumber: receiver.accountNumber,
        },
      } satisfies Prisma.TransferGetPayload<{
        include: {
          receiver: {
            select: {
              id: true;
              username: true;
              accountNumber: true;
            };
          };
        };
      }>;
    });
  }

  async getTransferHistory(userId: string) {
    return this.prisma.transfer.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            accountNumber: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            accountNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
