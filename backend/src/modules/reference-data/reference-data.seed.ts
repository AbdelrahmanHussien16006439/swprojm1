/**
 * GEN-12 / FLT-02: seed official reference CSVs without dropping collections.
 * Run from backend/: npm run seed:reference
 */
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Model, Types } from 'mongoose';
import { validateEnv } from '../../common/config/env.validation';
import { ReferenceDataModule } from './reference-data.module';
import { Airport } from './schemas/airport.schema';
import { Attraction } from './schemas/attraction.schema';
import { City } from './schemas/city.schema';
import { Country } from './schemas/country.schema';
import { Currency } from './schemas/currency.schema';

type CountryRow = { code: string; name: string; currency: string };
type CityRow = { city_id: string; name: string; country_code: string };
type AirportRow = {
  iata_code: string;
  name: string;
  city_id: string;
  country_code: string;
  time_zone: string;
};
type AttractionRow = { attraction_id: string; name: string; city_id: string };

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    ReferenceDataModule,
  ],
})
class ReferenceSeedModule {}

type CountryRecord = Country & { _id: Types.ObjectId };
type CityRecord = City & { _id: Types.ObjectId };

function readCsv<T>(filename: string): T[] {
  const filePath = join(
    process.cwd(),
    '..',
    'docs',
    'requirements',
    'reference-data',
    filename,
  );
  return parse(readFileSync(filePath), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}

async function seedReferenceData() {
  const app = await NestFactory.createApplicationContext(ReferenceSeedModule, {
    logger: ['error', 'warn', 'log'],
  });
  const logger = new Logger('ReferenceDataSeed');

  try {
    const countries = app.get<Model<CountryRecord>>(getModelToken(Country.name));
    const cities = app.get<Model<CityRecord>>(getModelToken(City.name));
    const airports = app.get<Model<Airport>>(getModelToken(Airport.name));
    const currencies = app.get<Model<Currency>>(getModelToken(Currency.name));
    const attractions = app.get<Model<Attraction>>(getModelToken(Attraction.name));

    const countryRows = readCsv<CountryRow>('countries.csv');
    const cityRows = readCsv<CityRow>('cities.csv');
    const airportRows = readCsv<AirportRow>('airports.csv');
    const attractionRows = readCsv<AttractionRow>('attractions.csv');

    for (const row of countryRows) {
      await countries.updateOne(
        { code: row.code.toUpperCase() },
        {
          $set: {
            code: row.code.toUpperCase(),
            name: row.name,
            currency: row.currency.toUpperCase(),
          },
        },
        { upsert: true },
      );
    }

    const countryByCode = new Map<string, CountryRecord>();
    for (const country of await countries.find().exec()) {
      countryByCode.set(country.code, country);
    }

    for (const row of cityRows) {
      const country = countryByCode.get(row.country_code.toUpperCase());
      if (!country) throw new Error(`Unknown country code in cities.csv: ${row.country_code}`);
      await cities.updateOne(
        { cityId: row.city_id.toLowerCase() },
        {
          $set: {
            cityId: row.city_id.toLowerCase(),
            name: row.name,
            countryCode: row.country_code.toUpperCase(),
            countryId: country._id,
          },
        },
        { upsert: true },
      );
    }

    const cityByOfficialId = new Map<string, CityRecord>();
    for (const city of await cities.find().exec()) {
      cityByOfficialId.set(city.cityId, city);
    }

    for (const row of airportRows) {
      const city = cityByOfficialId.get(row.city_id.toLowerCase());
      const country = countryByCode.get(row.country_code.toUpperCase());
      if (!city || !country) {
        throw new Error(`Airport ${row.iata_code} references an unknown city or country`);
      }
      await airports.updateOne(
        { iataCode: row.iata_code.toUpperCase() },
        {
          $set: {
            iataCode: row.iata_code.toUpperCase(),
            name: row.name,
            cityCode: row.city_id.toLowerCase(),
            cityId: city._id,
            countryCode: row.country_code.toUpperCase(),
            countryId: country._id,
            timezone: row.time_zone,
          },
        },
        { upsert: true },
      );
    }

    const supportedCodes = [...new Set(countryRows.map((row) => row.currency.toUpperCase()))];
    for (const code of supportedCodes) {
      await currencies.updateOne({ code }, { $set: { code } }, { upsert: true });
    }

    for (const row of attractionRows) {
      const city = cityByOfficialId.get(row.city_id.toLowerCase());
      if (!city) throw new Error(`Unknown city identifier in attractions.csv: ${row.city_id}`);
      await attractions.updateOne(
        { attractionId: row.attraction_id },
        {
          $set: {
            attractionId: row.attraction_id,
            name: row.name,
            cityCode: row.city_id.toLowerCase(),
            cityId: city._id,
          },
        },
        { upsert: true },
      );
    }

    logger.log(
      `Reference data upserted: ${countryRows.length} countries, ${cityRows.length} cities, ${airportRows.length} airports, ${supportedCodes.length} currencies, ${attractionRows.length} attractions.`,
    );
  } finally {
    await app.close();
  }
}

seedReferenceData().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
