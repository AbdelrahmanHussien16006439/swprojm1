import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AirlinesModule } from '../airlines/airlines.module';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { Flight, FlightSchema } from './schemas/flight.schema';

// Owner: Member 3 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    AirlinesModule,
    ReferenceDataModule,
    NotificationsModule,
    MongooseModule.forFeature([{ name: Flight.name, schema: FlightSchema }]),
  ],
  providers: [FlightsService],
  controllers: [FlightsController],
  exports: [FlightsService, MongooseModule],
})
export class FlightsModule {}
