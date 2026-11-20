import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ItinerariesController } from './itineraries.controller';
import { ItineraryActivitiesController } from './itinerary-activities.controller';
import { ItinerariesService } from './itineraries.service';
import { Itinerary, ItinerarySchema } from './schemas/itinerary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Itinerary.name, schema: ItinerarySchema },
    ]),
    ReferenceDataModule,
    UploadsModule,
  ],
  controllers: [ItinerariesController, ItineraryActivitiesController],
  providers: [ItinerariesService],
  exports: [ItinerariesService, MongooseModule],
})
export class ItinerariesModule {}
