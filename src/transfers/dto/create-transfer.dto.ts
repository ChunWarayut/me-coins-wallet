import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateTransferDto {
  @IsNotEmpty()
  @IsString()
  receiverAccountNumber: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  comment?: string;
}
