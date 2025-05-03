import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum UserRole {
  ADMIN = 'ADMIN',
  NORMAL = 'NORMAL',
  PREMIUM = 'PREMIUM',
}

export class UpdateUserDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
