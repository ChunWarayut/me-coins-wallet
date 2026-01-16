import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ItemRarity } from '@prisma/client';

export class CreateItemDto {
  @ApiProperty({ description: 'ชื่อไอเทม', example: 'Health Potion' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'คำอธิบายไอเทม',
    example: 'ฟื้นฟูพลังชีวิต 50 หน่วย',
  })
  @IsString()
  description: string;

  @ApiProperty({ description: 'ราคาไอเทม (Copper)', example: 100 })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'URL รูปภาพไอเทม (ไม่บังคับ)',
    example: 'https://example.com/image.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'หมวดหมู่ไอเทม', example: 'Consumable' })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'ความหายากของไอเทม',
    enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    example: 'COMMON',
  })
  @IsEnum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])
  rarity: ItemRarity;
}
