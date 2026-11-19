import { Module } from '@nestjs/common';
import { AirlinesModule } from '../airlines/airlines.module';
import { FlightBookingsModule } from '../flight-bookings/flight-bookings.module';
import { FlightsModule } from '../flights/flights.module';
import { HotelBookingsModule } from '../hotel-bookings/hotel-bookings.module';
import { HotelsModule } from '../hotels/hotels.module';
import { UsersModule } from '../users/users.module';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminBookingsService } from './admin-bookings.service';

@Module({
  imports: [
    AirlinesModule,
    FlightBookingsModule,
    FlightsModule,
    HotelBookingsModule,
    HotelsModule,
    UsersModule,
  ],
  controllers: [AdminBookingsController],
  providers: [AdminBookingsService],
  exports: [AdminBookingsService],
})
export class AdminBookingsModule {}
