import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { HotelBookingsService } from './hotel-bookings.service';

describe('HotelBookingsService', () => {
  let service: HotelBookingsService;
  let bookingModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let roomNightModel: {
    find: jest.Mock;
    findOne: jest.Mock;
    deleteMany: jest.Mock;
    insertMany: jest.Mock;
    updateMany: jest.Mock;
  };
  let hotelModel: { findById: jest.Mock };
  let roomModel: { find: jest.Mock };
  let paymentModel: { findOne: jest.Mock; find: jest.Mock };
  let connection: { startSession: jest.Mock };
  let session: { withTransaction: jest.Mock; endSession: jest.Mock };
  let hotelsService: { findById: jest.Mock; markRoomsReserved: jest.Mock };
  let paymentsService: { cancelPayment: jest.Mock };
  let notificationsService: { notify: jest.Mock };

  beforeEach(() => {
    bookingModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    roomNightModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      deleteMany: jest.fn(),
      insertMany: jest.fn(),
      updateMany: jest.fn(),
    };
    hotelModel = { findById: jest.fn() };
    roomModel = { find: jest.fn() };
    paymentModel = { findOne: jest.fn(), find: jest.fn() };
    session = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) =>
        callback(),
      ),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    connection = { startSession: jest.fn().mockResolvedValue(session) };
    hotelsService = {
      findById: jest.fn(),
      markRoomsReserved: jest.fn().mockResolvedValue(undefined),
    };
    paymentsService = { cancelPayment: jest.fn().mockResolvedValue(undefined) };
    notificationsService = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new HotelBookingsService(
      bookingModel as never,
      roomNightModel as never,
      hotelModel as never,
      roomModel as never,
      paymentModel as never,
      connection as never,
      hotelsService as never,
      paymentsService as never,
      notificationsService as never,
    );
  });

  it('allows a child-only room when another room supplies the reservation adult', async () => {
    const hotelId = new Types.ObjectId();
    const firstRoomId = new Types.ObjectId();
    const secondRoomId = new Types.ObjectId();
    const checkIn = futureDate(3);
    const checkOut = futureDate(5);
    const hotel = {
      _id: hotelId,
      name: 'Cairo Stay',
      isActive: true,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      cancellationTiers: [{ daysBefore: 7, refundPercent: 50 }],
    };
    const rooms = [
      room(firstRoomId, hotelId, 'Family room', 3, checkIn, checkOut),
      room(secondRoomId, hotelId, 'Kids room', 2, checkIn, checkOut),
    ];
    hotelModel.findById.mockReturnValue(query(hotel));
    roomModel.find.mockReturnValue(query(rooms));
    roomNightModel.deleteMany.mockReturnValue(query({ deletedCount: 0 }));
    roomNightModel.insertMany.mockResolvedValue([]);
    const bookingId = new Types.ObjectId();
    bookingModel.create.mockImplementation(async ([data]) => [
      {
        ...data,
        _id: bookingId,
        rooms: data.rooms,
      },
    ]);

    const result = await service.createHold(
      {
        hotelId: hotelId.toString(),
        checkIn,
        checkOut,
        rooms: [
          { roomId: firstRoomId.toString(), adults: 1, childrenAges: [] },
          { roomId: secondRoomId.toString(), adults: 0, childrenAges: [8, 14] },
        ],
      } as CreateHotelBookingDto,
      new Types.ObjectId().toString(),
    );

    expect(result.rooms[1]).toMatchObject({
      roomId: secondRoomId.toString(),
      adults: 0,
      children: [8, 14],
    });
    expect(result.totalPrice).toBe(200);
    expect(result.status).toBe('pending_payment');
    expect(result.checkInTime).toBe('14:00');
    expect(bookingModel.create.mock.calls[0][0][0].rooms[1].adults).toBe(0);
    expect(roomNightModel.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ roomId: secondRoomId }),
      ]),
      { session },
    );
    const nightsHeld = roomNightModel.insertMany.mock.calls[0][0];
    expect(nightsHeld).toHaveLength(4);
    expect(
      nightsHeld.every(
        (night: { bookingReference?: string }) => !night.bookingReference,
      ),
    ).toBe(true);
    expect(session.withTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a reservation with no adults across all rooms', async () => {
    await expect(
      service.createHold(
        {
          hotelId: new Types.ObjectId().toString(),
          checkIn: futureDate(3),
          checkOut: futureDate(4),
          rooms: [
            {
              roomId: new Types.ObjectId().toString(),
              adults: 0,
              childrenAges: [4],
            },
          ],
        } as CreateHotelBookingDto,
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(connection.startSession).not.toHaveBeenCalled();
  });

  it('converts the room-night unique-index conflict to HTTP 409', async () => {
    const hotelId = new Types.ObjectId();
    const roomId = new Types.ObjectId();
    const checkIn = futureDate(3);
    const checkOut = futureDate(4);
    hotelModel.findById.mockReturnValue(
      query({ _id: hotelId, name: 'Stay', isActive: true }),
    );
    roomModel.find.mockReturnValue(
      query([room(roomId, hotelId, 'Room', 2, checkIn, checkOut)]),
    );
    roomNightModel.deleteMany.mockReturnValue(query({ deletedCount: 0 }));
    bookingModel.create.mockResolvedValue([
      { _id: new Types.ObjectId(), rooms: [] },
    ]);
    roomNightModel.insertMany.mockRejectedValue({ code: 11000 });

    await expect(
      service.createHold(
        {
          hotelId: hotelId.toString(),
          checkIn,
          checkOut,
          rooms: [{ roomId: roomId.toString(), adults: 1, childrenAges: [] }],
        } as CreateHotelBookingDto,
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(session.endSession).toHaveBeenCalled();
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

  it('reports active overlaps', async () => {
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

  it('expires a hold, releases room-nights, and cancels its pending payment', async () => {
    const bookingId = new Types.ObjectId();
    const candidate = { _id: bookingId };
    bookingModel.find.mockReturnValue(query([candidate]));
    bookingModel.findOneAndUpdate.mockReturnValue(
      query({ _id: bookingId, paymentId: new Types.ObjectId() }),
    );
    roomNightModel.deleteMany.mockReturnValue(query({ deletedCount: 2 }));
    paymentModel.find.mockReturnValue(query([{ _id: new Types.ObjectId() }]));

    await service.expirePendingHolds();

    expect(roomNightModel.deleteMany).toHaveBeenCalledWith({
      hotelBookingId: bookingId,
    });
    expect(paymentsService.cancelPayment).toHaveBeenCalledTimes(1);
  });
});

function query<T>(value: T) {
  const result = {
    session: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
  return result;
}

function futureDate(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function room(
  _id: Types.ObjectId,
  hotelId: Types.ObjectId,
  name: string,
  maxOccupancy: number,
  checkIn: string,
  checkOut: string,
) {
  const startDate = new Date(`${checkIn}T00:00:00.000Z`);
  const endDate = new Date(`${checkOut}T00:00:00.000Z`);
  return {
    _id,
    hotelId,
    name,
    maxOccupancy,
    pricePerNight: 50,
    isActive: true,
    availabilityRanges: [{ startDate, endDate }],
    blockedRanges: [],
  };
}
