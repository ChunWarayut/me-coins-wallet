import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  discordId: string;

  @ApiProperty({ example: 'avatar.png' })
  @IsString()
  @IsOptional()
  avatar: string;
}
