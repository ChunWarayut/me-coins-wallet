import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      {
        id: '507f1f77bcf86cd799439011',
        username: 'admin',
        email: 'admin@coinquest.com',
        role: UserRole.ADMIN,
        balance: 10000,
        avatar: '/placeholder.svg',
        createdAt: new Date('2023-01-01T00:00:00Z'),
      },
      {
        id: '507f1f77bcf86cd799439012',
        username: 'johndoe',
        email: 'john@example.com',
        role: UserRole.NORMAL,
        balance: 500,
        avatar: '/placeholder.svg',
        createdAt: new Date('2023-01-15T00:00:00Z'),
      },
      {
        id: '507f1f77bcf86cd799439013',
        username: 'alice',
        email: 'alice@example.com',
        role: UserRole.PREMIUM,
        balance: 2500,
        avatar: '/placeholder.svg',
        createdAt: new Date('2023-02-01T00:00:00Z'),
      },
    ],
  });
}

main()
  .then(() => {
    console.log('Seeded users successfully');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
