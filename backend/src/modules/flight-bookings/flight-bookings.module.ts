import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AirlinesModule } from '../airlines/airlines.module';
import { BookingPoliciesController } from './flight-bookings.controller';
import { FlightBookingsService } from './flight-bookings.service';
import { FlightBooking, FlightBookingSchema } from './schemas/flight-booking.schema';

// Owner: Member 4 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    AirlinesModule,
    MongooseModule.forFeature([
      { name: FlightBooking.name, schema: FlightBookingSchema },
    ]),
  ],
  providers: [FlightBookingsService],
  controllers: [BookingPoliciesController],
  exports: [FlightBookingsService, MongooseModule],
})
export class FlightBookingsModule {}
