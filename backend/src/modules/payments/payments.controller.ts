import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RetryPaymentDto } from './dto/retry-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for an owned booking' })
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: JwtUser,
  ): Promise<{ paymentId: string; clientSecret: string }> {
    return this.paymentsService.createPaymentForBooking(
      dto.bookingType,
      dto.bookingId,
      user.sub,
      dto.testPaymentMethod,
    );
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiHeader({ name: 'stripe-signature', required: true })
  @ApiOperation({ summary: 'Receive Stripe payment events with signature verification' })
  webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    return this.paymentsService.handleWebhook(request.rawBody, signature);
  }

  @Post(':id/retry')
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retry a failed payment before its booking hold expires' })
  retry(
    @Param('id', ParseObjectIdPipe) paymentId: string,
    @Body() dto: RetryPaymentDto,
    @CurrentUser() user: JwtUser,
  ): Promise<{ paymentId: string; clientSecret: string }> {
    return this.paymentsService.retryPayment(
      paymentId,
      user.sub,
      dto.testPaymentMethod,
    );
  }

  @Get(':id')
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment status for its owner or an admin' })
  getPayment(
    @Param('id', ParseObjectIdPipe) paymentId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.paymentsService.getPayment(paymentId, user);
  }
}

@ApiTags('refunds')
@Controller('refunds')
export class RefundsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get refund status for its owner or an admin' })
  getRefund(
    @Param('id', ParseObjectIdPipe) refundId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.paymentsService.getRefund(refundId, user);
  }
}
