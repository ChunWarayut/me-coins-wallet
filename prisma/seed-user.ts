import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      id: '507f1f77bcf86cd799439011',
      username: 'admin',
      email: 'admin@coinquest.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      discordId: '543063777101217802',
      wallet: {
        create: {
          balance: 0,
        },
      },
      avatar: '/placeholder.svg',
      createdAt: new Date('2023-01-01T00:00:00Z'),
    },
    {
      id: '507f1f77bcf86cd799439012',
      username: 'johndoe',
      email: 'john@example.com',
      password: hashedPassword,
      role: UserRole.USER,
      discordId: '543063777101217802',
      wallet: {
        create: {
          balance: 500,
        },
      },
      avatar: '/placeholder.svg',
      createdAt: new Date('2023-01-15T00:00:00Z'),
    },
    {
      id: '507f1f77bcf86cd799439013',
      username: 'alice',
      email: 'alice@example.com',
      password: hashedPassword,
      role: UserRole.PREMIUM,
      discordId: '543063777101217802',
      wallet: {
        create: {
          balance: 2500,
        },
      },
      avatar: '/placeholder.svg',
      createdAt: new Date('2023-02-01T00:00:00Z'),
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        discordId: user.discordId,
      },
      create: user,
    });
  }
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
