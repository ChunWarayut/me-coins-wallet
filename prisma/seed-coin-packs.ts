import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const coinPacks = [
    {
      packNumber: 1,
      price: 10,
      bonus: 0.0,
      baseCopper: 2090,
      totalCopper: 2090,
      isActive: true,
    },
    {
      packNumber: 2,
      price: 29,
      bonus: 1.5,
      baseCopper: 6061,
      totalCopper: 6152,
      isActive: true,
    },
    {
      packNumber: 3,
      price: 59,
      bonus: 3.0,
      baseCopper: 12331,
      totalCopper: 12701,
      isActive: true,
    },
    {
      packNumber: 4,
      price: 99,
      bonus: 4.5,
      baseCopper: 20691,
      totalCopper: 21623,
      isActive: true,
    },
    {
      packNumber: 5,
      price: 199,
      bonus: 6.0,
      baseCopper: 41591,
      totalCopper: 44087,
      isActive: true,
    },
    {
      packNumber: 6,
      price: 399,
      bonus: 7.5,
      baseCopper: 83391,
      totalCopper: 89646,
      isActive: true,
    },
    {
      packNumber: 7,
      price: 999,
      bonus: 9.0,
      baseCopper: 208791,
      totalCopper: 227583,
      isActive: true,
    },
    {
      packNumber: 8,
      price: 2999,
      bonus: 10.5,
      baseCopper: 626791,
      totalCopper: 692605,
      isActive: true,
    },
    {
      packNumber: 9,
      price: 5999,
      bonus: 12.0,
      baseCopper: 1253791,
      totalCopper: 1404246,
      isActive: true,
    },
    {
      packNumber: 10,
      price: 9999,
      bonus: 13.0,
      baseCopper: 2089791,
      totalCopper: 2361464,
      isActive: true,
    },
  ];

  for (const pack of coinPacks) {
    await prisma.coinPack.upsert({
      where: { packNumber: pack.packNumber },
      update: {
        price: pack.price,
        bonus: pack.bonus,
        baseCopper: pack.baseCopper,
        totalCopper: pack.totalCopper,
        isActive: pack.isActive,
      },
      create: pack,
    });
  }

  console.log('Seeded coin packs successfully');
}

main()
  .then(() => {
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

