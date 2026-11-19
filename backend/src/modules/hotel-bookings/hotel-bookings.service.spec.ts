import { Types } from 'mongoose';
import { HotelBookingsService } from './hotel-bookings.service';

describe('HotelBookingsService helpers', () => {
  let service: HotelBookingsService;
  let bookingModel: { findOne: jest.Mock };
  let roomNightModel: { find: jest.Mock; findOne: jest.Mock };

  beforeEach(() => {
    bookingModel = { findOne: jest.fn() };
    roomNightModel = { find: jest.fn(), findOne: jest.fn() };
    service = new HotelBookingsService(
      bookingModel as never,
      roomNightModel as never,
    );
  });

  it('reports a user with a confirmed reservation', async () => {
    bookingModel.findOne.mockReturnValue({
      select: () => ({
        lean: () => ({ exec: () => Promise.resolve({ _id: 'booking' }) }),
      }),
    });
    await expect(
      service.hasUpcomingConfirmed(new Types.ObjectId().toString()),
    ).resolves.toBe(true);
  });

  it('queries room nights by room, half-open date range, and active status', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const sort = jest.fn().mockReturnValue({ exec });
    roomNightModel.find.mockReturnValue({ sort });
    const roomId = new Types.ObjectId().toString();
    const from = new Date('2026-12-01T00:00:00.000Z');
    const to = new Date('2026-12-04T00:00:00.000Z');

    await service.findRoomNights([roomId], from, to);

    const filter = roomNightModel.find.mock.calls[0][0];
    expect(filter.roomId.$in[0].toString()).toBe(roomId);
    expect(filter.date).toEqual({ $gte: from, $lt: to });
    expect(filter.$or[0]).toEqual({ holdExpiresAt: null });
    expect(filter.$or[1].holdExpiresAt.$gt).toBeInstanceOf(Date);
  });

  it('returns no room nights without querying for an empty room list', async () => {
    await expect(
      service.findRoomNights([], new Date(), new Date()),
    ).resolves.toEqual([]);
    expect(roomNightModel.find).not.toHaveBeenCalled();
  });

  it('reports whether an active overlap exists', async () => {
    roomNightModel.findOne.mockReturnValue({
      select: () => ({
        lean: () => ({ exec: () => Promise.resolve({ _id: 'night' }) }),
      }),
    });
    await expect(
      service.hasActiveReservationOverlap(
        new Types.ObjectId().toString(),
        new Date('2026-12-01T00:00:00.000Z'),
        new Date('2026-12-02T00:00:00.000Z'),
      ),
    ).resolves.toBe(true);
  });
});
