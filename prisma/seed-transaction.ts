import {
  PrismaClient,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.transaction.createMany({
    data: [
      {
        id: '507f1f77bcf86cd799439021',
        userId: '507f1f77bcf86cd799439012', // johndoe
        amount: 100,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.APPROVED,
        createdAt: new Date('2023-03-15T10:30:00Z'),
        updatedAt: new Date('2023-03-15T11:00:00Z'),
        slipImage: '/placeholder.svg',
      },
      {
        id: '507f1f77bcf86cd799439022',
        userId: '507f1f77bcf86cd799439013', // alice
        amount: 500,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.APPROVED,
        createdAt: new Date('2023-03-20T14:45:00Z'),
        updatedAt: new Date('2023-03-20T15:30:00Z'),
        slipImage: '/placeholder.svg',
      },
      {
        id: '507f1f77bcf86cd799439023',
        userId: '507f1f77bcf86cd799439013', // alice
        amount: 200,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        createdAt: new Date('2023-04-01T09:15:00Z'),
        updatedAt: new Date('2023-04-01T09:15:00Z'),
      },
      {
        id: '507f1f77bcf86cd799439024',
        userId: '507f1f77bcf86cd799439012', // johndoe
        amount: 50,
        type: TransactionType.PURCHASE,
        status: TransactionStatus.APPROVED,
        createdAt: new Date('2023-04-05T16:20:00Z'),
        updatedAt: new Date('2023-04-05T16:20:00Z'),
      },
    ],
  });
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
