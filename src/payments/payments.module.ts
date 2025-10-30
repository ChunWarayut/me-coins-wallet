import { Module } from '@nestjs/common';
import {
  PaymentsController,
  PaymentPageController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, PaymentPageController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

