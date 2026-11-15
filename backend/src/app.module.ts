import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './common/config/env.validation';
// Member 1
import { AdminAccountsModule } from './modules/admin-accounts/admin-accounts.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
// Member 2
import { AdminModerationModule } from './modules/admin-moderation/admin-moderation.module';
import { BlogModule } from './modules/blog/blog.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UploadsModule } from './modules/uploads/uploads.module';
// Member 3
import { AirlinesModule } from './modules/airlines/airlines.module';
import { FlightsModule } from './modules/flights/flights.module';
// Member 4
import { FlightBookingsModule } from './modules/flight-bookings/flight-bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
// Member 5
import { HotelsModule } from './modules/hotels/hotels.module';
import { ReferenceDataModule } from './modules/reference-data/reference-data.module';
// Member 6
import { AdminBookingsModule } from './modules/admin-bookings/admin-bookings.module';
import { HotelBookingsModule } from './modules/hotel-bookings/hotel-bookings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
// Member 7
import { ItinerariesModule } from './modules/itineraries/itineraries.module';

// Owned by Member 1 — nobody else edits this file (TEAM_PLAN 3.2).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    ScheduleModule.forRoot(),

    // Member 1
    AuthModule,
    UsersModule,
    AdminAccountsModule,
    AuditLogsModule,
    // Member 2
    BlogModule,
    ReportsModule,
    AdminModerationModule,
    UploadsModule,
    ExchangeRatesModule,
    // Member 3
    AirlinesModule,
    FlightsModule,
    // Member 4
    FlightBookingsModule,
    PaymentsModule,
    // Member 5
    ReferenceDataModule,
    HotelsModule,
    // Member 6
    HotelBookingsModule,
    ReviewsModule,
    NotificationsModule,
    AdminBookingsModule,
    // Member 7
    ItinerariesModule,
  ],
})
export class AppModule {}
