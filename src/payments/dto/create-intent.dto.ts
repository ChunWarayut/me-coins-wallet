import { IsNumber, IsOptional, IsString, IsObject, Min, IsEmail } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(1, { message: 'Amount must be at least 1 satang (0.01 THB)' })
  amount: number; // จำนวนเงินในหน่วยสตางค์ (satang)

  @IsOptional()
  @IsString()
  currency?: string = 'thb';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string; // Email สำหรับ PromptPay (จำเป็นสำหรับการ refund)

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

