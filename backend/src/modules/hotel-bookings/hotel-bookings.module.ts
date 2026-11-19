import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelsModule } from '../hotels/hotels.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { HotelBookingsController } from './hotel-bookings.controller';
import { HotelBookingsService } from './hotel-bookings.service';
import {
  HotelBooking,
  HotelBookingSchema,
} from './schemas/hotel-booking.schema';
import { RoomNight, RoomNightSchema } from './schemas/room-night.schema';

// Owner: Member 6 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    HotelsModule,
    forwardRef(() => PaymentsModule),
    NotificationsModule,
    MongooseModule.forFeature([
      { name: HotelBooking.name, schema: HotelBookingSchema },
      { name: RoomNight.name, schema: RoomNightSchema },
    ]),
  ],
  providers: [HotelBookingsService],
  controllers: [HotelBookingsController],
  exports: [HotelBookingsService, MongooseModule],
})
export class HotelBookingsModule {}
