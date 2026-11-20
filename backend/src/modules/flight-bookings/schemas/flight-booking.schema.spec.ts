import { FlightBookingSchema } from './flight-booking.schema';

describe('FlightBooking schema', () => {
  it('uses ObjectId paths for every model reference', () => {
    for (const path of ['userId', 'airlineId', 'paymentId', 'refundId']) {
      expect(FlightBookingSchema.path(path).instance).toBe('ObjectId');
    }
    const segmentSchema = FlightBookingSchema.path('segments') as unknown as {
      schema: { path: (name: string) => { instance: string } };
    };
    for (const path of ['flightId', 'cabinId']) {
      expect(segmentSchema.schema.path(path).instance).toBe('ObjectId');
    }
  });

  it('uses only the booking lifecycle statuses', () => {
    expect(FlightBookingSchema.path('status').enumValues).toEqual([
      'pending_payment',
      'confirmed',
      'completed',
      'expired',
      'cancelled',
    ]);
  });

  it('leaves bookingReference absent until confirmation and indexes only present values uniquely', () => {
    const path = FlightBookingSchema.path('bookingReference');
    expect(path.options.default).toBeUndefined();
    expect(path.options.sparse).toBe(true);
    expect(path.options.unique).toBe(true);
    const bookingReferenceIndex = FlightBookingSchema.indexes().find(
      ([fields]) => fields.bookingReference === 1,
    );
    expect(bookingReferenceIndex?.[1]).toMatchObject({ unique: true, sparse: true });
  });
});
