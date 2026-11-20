import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRate, ExchangeRateSchema } from './schemas/exchange-rate.schema';
import { ReferenceDataModule } from '../reference-data/reference-data.module';

@Module({
  imports: [
    ReferenceDataModule,
    MongooseModule.forFeature([
      { name: ExchangeRate.name, schema: ExchangeRateSchema },
    ]),
  ],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService],
  exports: [ExchangeRatesService, MongooseModule],
})
export class ExchangeRatesModule {}
