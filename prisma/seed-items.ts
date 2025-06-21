import { PrismaClient, ItemRarity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = [
    {
      id: '507f1f77bcf86cd799439041',
      name: 'Crystal Sword',
      description: 'A legendary sword made of pure crystal.',
      price: 1000,
      imageUrl: '⚔️',
      category: 'Weapon',
      rarity: ItemRarity.LEGENDARY,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    },
    {
      id: '507f1f77bcf86cd799439042',
      name: 'Health Potion',
      description: 'Restores 50 health points.',
      price: 50,
      imageUrl: '🧪',
      category: 'Consumable',
      rarity: ItemRarity.COMMON,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    },
    {
      id: '507f1f77bcf86cd799439043',
      name: 'Dragon Scale Armor',
      description: 'Armor made from the scales of an ancient dragon.',
      price: 800,
      imageUrl: '🛡️',
      category: 'Armor',
      rarity: ItemRarity.EPIC,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    },
    {
      id: '507f1f77bcf86cd799439044',
      name: 'Magic Amulet',
      description: 'Increases magic power by 20%.',
      price: 500,
      imageUrl: '💠',
      category: 'Accessory',
      rarity: ItemRarity.RARE,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    },
  ];

  for (const item of items) {
    await prisma.item.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        category: item.category,
        rarity: item.rarity,
      },
      create: item,
    });
  }
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