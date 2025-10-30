import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  Header,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-intent.dto';
import { Request, Response } from 'express';
import { join } from 'path';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intents')
  @HttpCode(HttpStatus.CREATED)
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getPaymentStatus(@Param('id') id: string) {
    return this.paymentsService.getPaymentIntentStatus(id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // ใช้ rawBody ที่ได้จาก middleware
    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const event = this.paymentsService.constructWebhookEvent(
      rawBody,
      signature,
    );

    return this.paymentsService.handleWebhookEvent(event);
  }
}

// Controller สำหรับ serve หน้า payment UI
@Controller('payment')
export class PaymentPageController {
  @Get(':id')
  servePage(@Param('id') id: string, @Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'payment.html'));
  }
}

