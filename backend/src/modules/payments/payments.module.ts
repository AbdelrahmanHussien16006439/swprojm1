import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import Stripe from 'stripe';
import { FlightBookingsModule } from '../flight-bookings/flight-bookings.module';
import { HotelBookingsModule } from '../hotel-bookings/hotel-bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Refund, RefundSchema } from './schemas/refund.schema';
import { PaymentsController, RefundsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { STRIPE_CLIENT } from './payments.constants';

// Owner: Member 4 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    forwardRef(() => FlightBookingsModule),
    forwardRef(() => HotelBookingsModule),
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Refund.name, schema: RefundSchema },
    ]),
  ],
  providers: [
    PaymentsService,
    {
      provide: STRIPE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY')),
    },
  ],
  controllers: [PaymentsController, RefundsController],
  exports: [PaymentsService, MongooseModule],
})
export class PaymentsModule {}
