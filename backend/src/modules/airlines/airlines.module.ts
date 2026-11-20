import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsModule } from '../uploads/uploads.module';
import { AirlinesController } from './airlines.controller';
import { AirlinesService } from './airlines.service';
import { Airline, AirlineSchema } from './schemas/airline.schema';

// Owner: Member 3 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    UploadsModule,
    MongooseModule.forFeature([{ name: Airline.name, schema: AirlineSchema }]),
  ],
  providers: [AirlinesService],
  controllers: [AirlinesController],
  exports: [AirlinesService, MongooseModule],
})
export class AirlinesModule {}
