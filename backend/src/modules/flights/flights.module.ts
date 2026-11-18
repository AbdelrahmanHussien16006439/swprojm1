import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FlightsService } from './flights.service';
import { Flight, FlightSchema } from './schemas/flight.schema';

// Owner: Member 3 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [MongooseModule.forFeature([{ name: Flight.name, schema: FlightSchema }])],
  providers: [FlightsService],
  exports: [FlightsService, MongooseModule],
})
export class FlightsModule {}
