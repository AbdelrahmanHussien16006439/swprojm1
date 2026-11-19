import { AirportSchema } from './airport.schema';
import { AttractionSchema } from './attraction.schema';
import { CitySchema } from './city.schema';

describe('reference data ObjectId relationships', () => {
  it('stores city.countryId as an ObjectId reference', () => {
    expect(CitySchema.path('countryId').instance).toBe('ObjectId');
  });

  it('stores airport cityId and countryId as ObjectId references', () => {
    expect(AirportSchema.path('cityId').instance).toBe('ObjectId');
    expect(AirportSchema.path('countryId').instance).toBe('ObjectId');
  });

  it('stores attraction.cityId as an ObjectId reference', () => {
    expect(AttractionSchema.path('cityId').instance).toBe('ObjectId');
  });
});
