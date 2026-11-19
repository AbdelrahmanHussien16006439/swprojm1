import {
  HotelSchema,
  photosWithinLimit,
  uniqueCancellationThresholds,
} from './hotel.schema';
import {
  availabilityRangesDoNotOverlap,
  hasValidRoomRangeDates,
  isPositiveRoomPrice,
  RoomSchema,
} from './room.schema';

describe('Hotel and Room schemas', () => {
  it('stores Hotel references as ObjectIds', () => {
    expect(HotelSchema.path('cityId').instance).toBe('ObjectId');
    expect(HotelSchema.path('countryId').instance).toBe('ObjectId');
  });

  it('stores Room.hotelId as an ObjectId and uniquely indexes names per hotel', () => {
    expect(RoomSchema.path('hotelId').instance).toBe('ObjectId');
    expect(RoomSchema.indexes()).toContainEqual([
      { hotelId: 1, name: 1 },
      { unique: true, background: true },
    ]);
  });

  it('rejects invalid or overlapping inclusive availability ranges', () => {
    const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
    expect(
      availabilityRangesDoNotOverlap([
        { startDate: day('2026-11-20'), endDate: day('2026-11-22') },
        { startDate: day('2026-11-23'), endDate: day('2026-11-25') },
      ]),
    ).toBe(true);
    expect(
      availabilityRangesDoNotOverlap([
        { startDate: day('2026-11-20'), endDate: day('2026-11-23') },
        { startDate: day('2026-11-23'), endDate: day('2026-11-25') },
      ]),
    ).toBe(false);
    expect(
      hasValidRoomRangeDates([
        { startDate: day('2026-11-22'), endDate: day('2026-11-20') },
      ]),
    ).toBe(false);
  });

  it('enforces hotel photo and cancellation tier limits', () => {
    expect(photosWithinLimit(Array.from({ length: 5 }, () => ({ id: 'x', url: '/' })))).toBe(
      true,
    );
    expect(photosWithinLimit(Array.from({ length: 6 }, () => ({ id: 'x', url: '/' })))).toBe(
      false,
    );
    expect(uniqueCancellationThresholds([{ daysBefore: 7 }, { daysBefore: 1 }])).toBe(true);
    expect(uniqueCancellationThresholds([{ daysBefore: 7 }, { daysBefore: 7 }])).toBe(false);
  });

  it('requires room prices to be strictly greater than zero', () => {
    expect(isPositiveRoomPrice(0.01)).toBe(true);
    expect(isPositiveRoomPrice(0)).toBe(false);
    expect(isPositiveRoomPrice(-1)).toBe(false);
  });
});
