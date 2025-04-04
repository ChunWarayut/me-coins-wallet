import { PrismaClient, ItemRarity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.item.createMany({
    data: [
      {
        id: '507f1f77bcf86cd799439031',
        name: 'Crystal Sword',
        description: 'A legendary sword made of pure crystal.',
        price: 1000,
        image: '/placeholder.svg',
        category: 'Weapon',
        rarity: ItemRarity.LEGENDARY,
      },
      {
        id: '507f1f77bcf86cd799439032',
        name: 'Health Potion',
        description: 'Restores 50 health points.',
        price: 50,
        image: '/placeholder.svg',
        category: 'Consumable',
        rarity: ItemRarity.COMMON,
      },
      {
        id: '507f1f77bcf86cd799439033',
        name: 'Dragon Scale Armor',
        description: 'Armor made from the scales of an ancient dragon.',
        price: 800,
        image: '/placeholder.svg',
        category: 'Armor',
        rarity: ItemRarity.EPIC,
      },
      {
        id: '507f1f77bcf86cd799439034',
        name: 'Magic Amulet',
        description: 'Increases magic power by 20%.',
        price: 500,
        image: '/placeholder.svg',
        category: 'Accessory',
        rarity: ItemRarity.RARE,
      },
    ],
  });
}

main()
  .then(() => {
    console.log('Seeded items successfully');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
