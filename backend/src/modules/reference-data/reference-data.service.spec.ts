import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ReferenceDataService } from './reference-data.service';
import { Airport } from './schemas/airport.schema';
import { Attraction } from './schemas/attraction.schema';
import { City } from './schemas/city.schema';
import { Country } from './schemas/country.schema';
import { Currency } from './schemas/currency.schema';

describe('ReferenceDataService', () => {
  let service: ReferenceDataService;
  let countryModel: { findOne: jest.Mock };
  let currencyModel: { exists: jest.Mock };

  beforeEach(() => {
    countryModel = { findOne: jest.fn() };
    currencyModel = { exists: jest.fn() };
    service = new ReferenceDataService(
      countryModel as unknown as Model<Country>,
      {} as Model<City>,
      {} as Model<Airport>,
      currencyModel as unknown as Model<Currency>,
      {} as Model<Attraction>,
    );
  });

  it('finds a country using its official country code', async () => {
    const country = { code: 'EG' };
    countryModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(country) });

    await expect(service.findCountry('eg')).resolves.toBe(country);
    expect(countryModel.findOne).toHaveBeenCalledWith({ code: 'EG' });
  });

  it('returns not found for an unknown country code', async () => {
    countryModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findCountry('ZZ')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checks supported currencies by code', async () => {
    currencyModel.exists.mockResolvedValueOnce({ _id: 'currency-id' });
    currencyModel.exists.mockResolvedValueOnce(null);

    await expect(service.isSupportedCurrency('egp')).resolves.toBe(true);
    await expect(service.isSupportedCurrency('xxx')).resolves.toBe(false);
    expect(currencyModel.exists).toHaveBeenNthCalledWith(1, { code: 'EGP' });
  });
});
