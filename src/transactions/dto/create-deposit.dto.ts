import { IsNumber, IsUrl } from 'class-validator';

export class CreateDepositDto {
  @IsNumber()
  amount: number;

  @IsUrl()
  slipImage: string;
}
