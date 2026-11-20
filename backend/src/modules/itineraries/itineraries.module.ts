import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersModule } from '../users/users.module';
import { ItinerariesController } from './itineraries.controller';
import { ItineraryPublicController } from './itinerary-public.controller';
import { ItineraryActivitiesController } from './itinerary-activities.controller';
import { ItineraryBudgetsController } from './itinerary-budgets.controller';
import { ItineraryTransportCostsController } from './itinerary-transport-costs.controller';
import { ItinerariesService } from './itineraries.service';
import { ItineraryBudgetSummaryController } from './itinerary-budget-summary.controller';
import { Itinerary, ItinerarySchema } from './schemas/itinerary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Itinerary.name, schema: ItinerarySchema },
    ]),
    ReferenceDataModule,
    UploadsModule,
    ExchangeRatesModule,
    UsersModule,
  ],
  controllers: [
    ItineraryPublicController,
    ItinerariesController,
    ItineraryActivitiesController,
    ItineraryBudgetsController,
    ItineraryTransportCostsController,
    ItineraryBudgetSummaryController,
  ],
  providers: [ItinerariesService],
  exports: [ItinerariesService, MongooseModule],
})
export class ItinerariesModule {}
