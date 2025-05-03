import { IsNumber } from 'class-validator';

export class CreateWithdrawDto {
  @IsNumber()
  amount: number;
}
