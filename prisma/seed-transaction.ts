import {
  PrismaClient,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const transactions = [
    {
      id: '507f1f77bcf86cd799439021',
      user: { connect: { id: '507f1f77bcf86cd799439012' } },
      amount: 100,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date('2023-03-15T10:30:00Z'),
      updatedAt: new Date('2023-03-15T11:00:00Z'),
      slipImage: '/slip1.jpg',
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439012',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439022',
      user: { connect: { id: '507f1f77bcf86cd799439013' } },
      amount: 500,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date('2023-03-20T14:45:00Z'),
      updatedAt: new Date('2023-03-20T15:30:00Z'),
      slipImage: '/slip2.jpg',
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439013',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439023',
      user: { connect: { id: '507f1f77bcf86cd799439013' } },
      amount: 200,
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.PENDING,
      createdAt: new Date('2023-04-01T09:15:00Z'),
      updatedAt: new Date('2023-04-01T09:15:00Z'),
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439013',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439024',
      user: { connect: { id: '507f1f77bcf86cd799439012' } },
      amount: 50,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date('2023-04-05T16:20:00Z'),
      updatedAt: new Date('2023-04-05T16:20:00Z'),
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439012',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439025',
      user: { connect: { id: '507f1f77bcf86cd799439011' } },
      amount: 1000,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date('2023-04-10T08:00:00Z'),
      updatedAt: new Date('2023-04-10T08:30:00Z'),
      slipImage: '/slip3.jpg',
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439011',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439026',
      user: { connect: { id: '507f1f77bcf86cd799439012' } },
      amount: 300,
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date('2023-04-12T15:20:00Z'),
      updatedAt: new Date('2023-04-12T16:00:00Z'),
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439012',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439027',
      user: { connect: { id: '507f1f77bcf86cd799439013' } },
      amount: 150,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.FAILED,
      createdAt: new Date('2023-04-15T11:45:00Z'),
      updatedAt: new Date('2023-04-15T12:00:00Z'),
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439013',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439028',
      user: { connect: { id: '507f1f77bcf86cd799439012' } },
      amount: 200,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      createdAt: new Date('2023-04-18T09:30:00Z'),
      updatedAt: new Date('2023-04-18T09:30:00Z'),
      slipImage: '/slip4.jpg',
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439012',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439029',
      user: { connect: { id: '507f1f77bcf86cd799439013' } },
      amount: 1000,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date('2023-04-20T14:15:00Z'),
      updatedAt: new Date('2023-04-20T14:30:00Z'),
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439013',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439030',
      user: { connect: { id: '507f1f77bcf86cd799439011' } },
      amount: 500,
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.CANCELLED,
      createdAt: new Date('2023-04-22T10:00:00Z'),
      updatedAt: new Date('2023-04-22T10:30:00Z'),
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439011',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439031',
      user: { connect: { id: '507f1f77bcf86cd799439012' } },
      amount: 750,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date('2023-04-25T13:45:00Z'),
      updatedAt: new Date('2023-04-25T14:15:00Z'),
      slipImage: '/slip5.jpg',
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439012',
        },
      },
    },
    {
      id: '507f1f77bcf86cd799439032',
      user: { connect: { id: '507f1f77bcf86cd799439013' } },
      amount: 300,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.COMPLETED,
      createdAt: new Date('2023-04-28T16:30:00Z'),
      updatedAt: new Date('2023-04-28T16:45:00Z'),
      wallet: {
        connect: {
          userId: '507f1f77bcf86cd799439013',
        },
      },
    },
  ];

  for (const transaction of transactions) {
    await prisma.transaction.upsert({
      where: { id: transaction.id },
      update: {},
      create: transaction,
    });
  }
}

main()
  .then(() => {
    console.log('Seeded transactions successfully');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
