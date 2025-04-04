import { PrismaClient, DepositStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.depositRequest.createMany({
    data: [
      {
        id: '507f1f77bcf86cd799439041',
        userId: '507f1f77bcf86cd799439012', // johndoe
        username: 'johndoe',
        amount: 200,
        slipImage: '/placeholder.svg',
        status: DepositStatus.PENDING,
        createdAt: new Date('2023-04-10T08:30:00Z'),
        updatedAt: new Date('2023-04-10T08:30:00Z'),
      },
      {
        id: '507f1f77bcf86cd799439042',
        userId: '507f1f77bcf86cd799439013', // alice
        username: 'alice',
        amount: 500,
        slipImage: '/placeholder.svg',
        status: DepositStatus.PENDING,
        createdAt: new Date('2023-04-12T14:20:00Z'),
        updatedAt: new Date('2023-04-12T14:20:00Z'),
      },
    ],
  });
}

main()
  .then(() => {
    console.log('Seeded deposit requests successfully');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
