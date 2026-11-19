import { RoomNightSchema } from './room-night.schema';

describe('RoomNight schema', () => {
  it('uses Mongoose ObjectId references and a unique room/date index', () => {
    for (const [path, ref] of [
      ['roomId', 'Room'],
      ['hotelId', 'Hotel'],
      ['hotelBookingId', 'HotelBooking'],
    ]) {
      expect(RoomNightSchema.path(path).instance).toBe('ObjectId');
      expect(RoomNightSchema.path(path).options.ref).toBe(ref);
    }
    expect(RoomNightSchema.indexes()).toContainEqual([
      { roomId: 1, date: 1 },
      { unique: true, background: true },
    ]);
    expect(
      RoomNightSchema.path('bookingReference').defaultValue,
    ).toBeUndefined();
  });
});
