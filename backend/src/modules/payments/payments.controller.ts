import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
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
}
