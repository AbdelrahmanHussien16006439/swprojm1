import { FlightSchema } from './flight.schema';

describe('FlightSchema reference fields', () => {
  it('stores airline and airport references as ObjectIds', () => {
    expect(FlightSchema.path('airlineId').instance).toBe('ObjectId');
    expect(FlightSchema.path('departureAirportId').instance).toBe('ObjectId');
    expect(FlightSchema.path('arrivalAirportId').instance).toBe('ObjectId');
  });
});
