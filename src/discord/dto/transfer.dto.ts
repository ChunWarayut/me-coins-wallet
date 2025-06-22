import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class TransferDto {
  @IsNotEmpty()
  @IsString()
  receiverAccountNumber: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  comment?: string;
}
