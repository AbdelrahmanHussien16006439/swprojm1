import { ReviewSchema } from './review.schema';

describe('Review schema', () => {
  it('uses Mongoose ObjectId references and enforces one review per booking', () => {
    for (const [path, ref] of [
      ['userId', 'User'],
      ['hotelId', 'Hotel'],
      ['hotelBookingId', 'HotelBooking'],
    ]) {
      expect(ReviewSchema.path(path).instance).toBe('ObjectId');
      expect(ReviewSchema.path(path).options.ref).toBe(ref);
    }
    expect(ReviewSchema.indexes()).toContainEqual([
      { hotelBookingId: 1 },
      { unique: true, background: true },
    ]);
    expect(ReviewSchema.path('isHidden').defaultValue).toBe(false);
  });
});
