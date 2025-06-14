import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ItemRarity } from '@prisma/client';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  category: string;

  @IsEnum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])
  rarity: ItemRarity;
}
