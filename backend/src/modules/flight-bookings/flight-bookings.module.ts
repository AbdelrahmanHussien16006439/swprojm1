import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AirlinesModule } from '../airlines/airlines.module';
import { FlightsModule } from '../flights/flights.module';
import { BookingPoliciesController } from './flight-bookings.controller';
import { FlightBookingSummaryController } from './flight-bookings.summary.controller';
import { FlightBookingsService } from './flight-bookings.service';
import { FlightBooking, FlightBookingSchema } from './schemas/flight-booking.schema';
import { PaymentsModule } from '../payments/payments.module';

// Owner: Member 4 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    AirlinesModule,
    FlightsModule,
    forwardRef(() => PaymentsModule),
    MongooseModule.forFeature([
      { name: FlightBooking.name, schema: FlightBookingSchema },
    ]),
  ],
  providers: [FlightBookingsService],
  controllers: [BookingPoliciesController, FlightBookingSummaryController],
  exports: [FlightBookingsService, MongooseModule],
})
export class FlightBookingsModule {}
