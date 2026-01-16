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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    console.log('[Webhook] Received webhook request');
    console.log('[Webhook] Signature:', signature ? 'Present' : 'Missing');
    console.log('[Webhook] Headers:', JSON.stringify(request.headers, null, 2));

    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    // ใช้ rawBody ที่ได้จาก middleware
    const rawBody = request.rawBody;
    if (!rawBody) {
      console.error('[Webhook] Missing raw body');
      throw new BadRequestException('Missing raw body');
    }

    console.log('[Webhook] Raw body length:', rawBody.length);

    try {
      const event = this.paymentsService.constructWebhookEvent(
        rawBody,
        signature,
      );

      console.log('[Webhook] Event constructed successfully:', event.type);
      return this.paymentsService.handleWebhookEvent(event);
    } catch (error) {
      console.error('[Webhook] Error processing webhook:', error);
      throw error;
    }
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getPaymentStatus(@Param('id') id: string) {
    return this.paymentsService.getPaymentIntentStatus(id);
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

