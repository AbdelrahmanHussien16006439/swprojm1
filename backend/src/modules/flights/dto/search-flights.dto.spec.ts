import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchFlightsDto } from './search-flights.dto';

describe('SearchFlightsDto', () => {
  const fromAirportId = '665f1c2a6d3b4c5e7f8a9012';
  const toAirportId = '665f1c2a6d3b4c5e7f8a9013';

  it('normalizes one query-string destination to an array', async () => {
    const dto = plainToInstance(SearchFlightsDto, { toAirportIds: toAirportId });

    expect(dto.toAirportIds).toEqual([toAirportId]);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('keeps one destination available for round-trip search', async () => {
    const dto = plainToInstance(SearchFlightsDto, {
      fromAirportId,
      toAirportIds: toAirportId,
      departDate: '2027-03-10',
      returnDate: '2027-03-17',
      adults: '1',
    });

    expect(dto.toAirportIds).toEqual([toAirportId]);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
