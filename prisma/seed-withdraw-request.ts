import { PrismaClient, WithdrawStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.withdrawRequest.createMany({
    data: [
      {
        id: '507f1f77bcf86cd799439051',
        userId: '507f1f77bcf86cd799439013', // alice
        username: 'alice',
        amount: 300,
        status: WithdrawStatus.PENDING,
        createdAt: new Date('2023-04-15T10:45:00Z'),
        updatedAt: new Date('2023-04-15T10:45:00Z'),
      },
    ],
  });
}

main()
  .then(() => {
    console.log('Seeded withdraw requests successfully');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
