import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.gift.createMany({
    data: [
      {
        id: '507f1f77bcf86cd799439061',
        senderId: '507f1f77bcf86cd799439013', // alice
        recipientId: '507f1f77bcf86cd799439012', // johndoe
        itemId: '507f1f77bcf86cd799439032', // Health Potion
        message: 'Hope this helps in your quest!',
        createdAt: new Date('2023-04-08T11:30:00Z'),
      },
      {
        id: '507f1f77bcf86cd799439062',
        senderId: '507f1f77bcf86cd799439012', // johndoe
        recipientId: '507f1f77bcf86cd799439013', // alice
        amount: 100,
        message: 'Thanks for your help last time!',
        createdAt: new Date('2023-04-09T15:45:00Z'),
      },
    ],
  });
}

main()
  .then(() => {
    console.log('Seeded gifts successfully');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
