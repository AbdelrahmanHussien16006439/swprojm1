import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  HotelBooking,
  HotelBookingSchema,
} from './schemas/hotel-booking.schema';
import { RoomNight, RoomNightSchema } from './schemas/room-night.schema';
import { HotelBookingsService } from './hotel-bookings.service';

// Owner: Member 6 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HotelBooking.name, schema: HotelBookingSchema },
      { name: RoomNight.name, schema: RoomNightSchema },
    ]),
  ],
  providers: [HotelBookingsService],
  exports: [HotelBookingsService, MongooseModule],
})
export class HotelBookingsModule {}
