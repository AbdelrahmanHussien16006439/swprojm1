import { Schema as MongooseSchema } from 'mongoose';
import { ItinerarySchema } from './itinerary.schema';

describe('Itinerary schema ObjectId references (TEAM_PLAN 3.7)', () => {
  it('uses explicit Mongoose ObjectId types and the shared model names', () => {
    expect(ItinerarySchema.path('ownerId').instance).toBe('ObjectId');
    expect(ItinerarySchema.path('ownerId').options.ref).toBe('User');
    expect(ItinerarySchema.path('countryIds').instance).toBe('Array');
    expect(ItinerarySchema.path('countryIds').caster).toBeInstanceOf(MongooseSchema.Types.ObjectId);
    expect(ItinerarySchema.path('countryIds').caster.options.ref).toBe('Country');
    expect(ItinerarySchema.path('days').instance).toBe('Array');
    expect(ItinerarySchema.path('clonedFromId').options.ref).toBe('Itinerary');
    expect(ItinerarySchema.path('originalAuthorId').options.ref).toBe('User');
  });
});
