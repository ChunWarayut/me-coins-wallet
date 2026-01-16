import { Module, forwardRef } from '@nestjs/common';
import {
  PaymentsController,
  PaymentPageController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DiscordModule)],
  controllers: [PaymentsController, PaymentPageController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

