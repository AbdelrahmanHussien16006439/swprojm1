import { HotelBookingSchema } from './hotel-booking.schema';

describe('HotelBooking schema', () => {
  it('uses Mongoose ObjectId references for linked models', () => {
    for (const [path, ref] of [
      ['userId', 'User'],
      ['hotelId', 'Hotel'],
      ['paymentId', 'Payment'],
      ['refundId', 'Refund'],
    ]) {
      expect(HotelBookingSchema.path(path).instance).toBe('ObjectId');
      expect(HotelBookingSchema.path(path).options.ref).toBe(ref);
    }
    const rooms = HotelBookingSchema.path('rooms') as unknown as {
      schema: {
        path(name: string): { instance: string; options: { ref?: string } };
      };
    };
    expect(rooms.schema.path('roomId').instance).toBe('ObjectId');
    expect(rooms.schema.path('roomId').options.ref).toBe('Room');
  });

  it('uses the shared lifecycle states and sparse unique booking references', () => {
    expect(HotelBookingSchema.path('status').enumValues).toEqual([
      'pending_payment',
      'confirmed',
      'completed',
      'expired',
      'cancelled',
    ]);
    const reference = HotelBookingSchema.path('bookingReference');
    expect(reference.options.unique).toBe(true);
    expect(reference.options.sparse).toBe(true);
    const rooms = HotelBookingSchema.path('rooms') as unknown as {
      schema: { path(name: string): { options: { min?: number } } };
    };
    expect(rooms.schema.path('adults').options.min).toBe(0);
  });
});
