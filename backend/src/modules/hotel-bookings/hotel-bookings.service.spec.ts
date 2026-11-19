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
    countDocuments: jest.Mock;
    updateOne: jest.Mock;
    updateMany: jest.Mock;
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
  let refundModel: { findOne: jest.Mock };
  let connection: { startSession: jest.Mock };
  let session: { withTransaction: jest.Mock; endSession: jest.Mock };
  let hotelsService: { findById: jest.Mock; markRoomsReserved: jest.Mock };
  let paymentsService: {
    cancelPayment: jest.Mock;
    calculateRefundPercent: jest.Mock;
    roundToPlatformCurrency: jest.Mock;
    getPlatformCurrency: jest.Mock;
    createRefund: jest.Mock;
  };
  let notificationsService: { notify: jest.Mock };
  let usersService: { findPublicProfile: jest.Mock };
  let reviewsService: { createForBooking: jest.Mock };

  beforeEach(() => {
    bookingModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
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
    refundModel = { findOne: jest.fn() };
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
    paymentsService = {
      cancelPayment: jest.fn().mockResolvedValue(undefined),
      calculateRefundPercent: jest.fn().mockReturnValue(50),
      roundToPlatformCurrency: jest.fn(
        (amount: number) => Math.round(amount * 100) / 100,
      ),
      getPlatformCurrency: jest.fn().mockReturnValue('USD'),
      createRefund: jest.fn(),
    };
    notificationsService = { notify: jest.fn().mockResolvedValue(undefined) };
    usersService = { findPublicProfile: jest.fn() };
    reviewsService = { createForBooking: jest.fn() };
    service = new HotelBookingsService(
      bookingModel as never,
      roomNightModel as never,
      hotelModel as never,
      roomModel as never,
      paymentModel as never,
      refundModel as never,
      connection as never,
      hotelsService as never,
      paymentsService as never,
      notificationsService as never,
      usersService as never,
      reviewsService as never,
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

  it("lists only the caller's reservations with the selected group and pagination", async () => {
    const userId = new Types.ObjectId();
    const hotelId = new Types.ObjectId();
    const booking = makeReservation(userId, hotelId, 'confirmed');
    bookingModel.find.mockReturnValue(query([booking]));
    bookingModel.countDocuments.mockReturnValue(query(1));

    const result = await service.findMine(userId.toString(), {
      page: 2,
      group: 'upcoming',
    } as never);

    const filter = bookingModel.find.mock.calls[0][0];
    expect(filter.userId.toString()).toBe(userId.toString());
    expect(filter.status).toBe('confirmed');
    expect(result).toMatchObject({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(result.data[0]).toMatchObject({
      bookingReference: 'HTL123456',
      hotel: { id: hotelId.toString(), name: 'Test Hotel' },
      rooms: [{ adults: 1, children: [7], guests: 2 }],
      status: 'confirmed',
    });
  });

  it("lists reservations only for the moderator's hotel with filters", async () => {
    const hotelId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const booking = makeReservation(userId, hotelId, 'confirmed');
    bookingModel.find.mockReturnValue(query([booking]));
    bookingModel.countDocuments.mockReturnValue(query(1));
    usersService.findPublicProfile.mockResolvedValue({
      id: userId.toString(),
      name: 'Hotel guest',
      joinedAt: new Date(),
      status: 'active',
    });

    const result = await service.findForModerator(
      hotelId.toString(),
      {
        sub: new Types.ObjectId().toString(),
        providerId: hotelId.toString(),
      } as never,
      {
        page: 1,
        status: 'confirmed',
        from: '2026-12-10',
        to: '2026-12-10',
      } as never,
    );

    const filter = bookingModel.find.mock.calls[0][0];
    expect(filter.hotelId.toString()).toBe(hotelId.toString());
    expect(filter.status).toBe('confirmed');
    expect(filter.checkIn).toEqual({
      $gte: new Date('2026-12-10T00:00:00.000Z'),
      $lt: new Date('2026-12-11T00:00:00.000Z'),
    });
    expect(result.data[0].guest.name).toBe('Hotel guest');
    expect(result).toMatchObject({ page: 1, limit: 10, total: 1 });
  });

  it("hides another hotel's reservations from the moderator", async () => {
    await expect(
      service.findForModerator(
        new Types.ObjectId().toString(),
        {
          sub: new Types.ObjectId().toString(),
          providerId: new Types.ObjectId().toString(),
        } as never,
        {} as never,
      ),
    ).rejects.toThrow('Hotel not found');
    expect(bookingModel.find).not.toHaveBeenCalled();
  });

  it("allows a review only for the owner's completed reservation", async () => {
    const userId = new Types.ObjectId();
    const booking = makeReservation(userId, new Types.ObjectId(), 'completed');
    bookingModel.findOne.mockReturnValue(query(booking));
    reviewsService.createForBooking.mockResolvedValue({ id: 'review-id' });

    await expect(
      service.createReview(booking._id.toString(), userId.toString(), {
        rating: 5,
        text: 'Great',
      }),
    ).resolves.toEqual({ id: 'review-id' });
    expect(reviewsService.createForBooking).toHaveBeenCalledWith(
      userId.toString(),
      (booking.hotelId as { _id: Types.ObjectId })._id.toString(),
      booking._id.toString(),
      { rating: 5, text: 'Great' },
    );
  });

  it('rejects reviews for reservations not yet completed', async () => {
    const userId = new Types.ObjectId();
    const booking = makeReservation(userId, new Types.ObjectId(), 'confirmed');
    bookingModel.findOne.mockReturnValue(query(booking));

    await expect(
      service.createReview(booking._id.toString(), userId.toString(), {
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(reviewsService.createForBooking).not.toHaveBeenCalled();
  });

  it('completes confirmed reservations after their check-out date', async () => {
    bookingModel.updateMany.mockReturnValue(query({ modifiedCount: 1 }));
    await service.completeCheckedOutReservations();
    const [filter, update] = bookingModel.updateMany.mock.calls[0];
    expect(filter.status).toBe('confirmed');
    expect(filter.checkOut.$lt).toBeInstanceOf(Date);
    expect(update).toEqual({ $set: { status: 'completed' } });
  });

  it('returns payment and refund details for an owned reservation', async () => {
    const userId = new Types.ObjectId();
    const hotelId = new Types.ObjectId();
    const booking = makeReservation(userId, hotelId, 'completed');
    booking.toObject = () => ({
      _id: booking._id,
      userId,
      hotelId: booking.hotelId,
      status: booking.status,
    });
    bookingModel.findOne.mockReturnValue(query(booking));
    const payment = {
      _id: new Types.ObjectId(),
      amount: 300,
      currency: 'USD',
      status: 'succeeded',
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    };
    const refund = {
      _id: new Types.ObjectId(),
      amount: 150,
      refundPercent: 50,
      status: 'refunded',
      createdAt: new Date('2026-11-02T00:00:00.000Z'),
    };
    paymentModel.findOne.mockReturnValue(query(payment));
    refundModel.findOne.mockReturnValue(query(refund));

    const result = await service.getMine(
      (booking as unknown as { _id: Types.ObjectId })._id.toString(),
      userId.toString(),
    );

    expect(bookingModel.findOne.mock.calls[0][0].userId.toString()).toBe(
      userId.toString(),
    );
    expect(result.payment).toMatchObject({ status: 'succeeded', amount: 300 });
    expect(result.refund).toMatchObject({ status: 'refunded', amount: 150 });
    expect(result.hotel.name).toBe('Test Hotel');
  });

  it("hides another user's reservation as not found", async () => {
    bookingModel.findOne.mockReturnValue(query(null));
    await expect(
      service.getMine(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ),
    ).rejects.toThrow('Hotel booking not found');
  });

  it('previews the refund using accepted tiers and whole days to check-in', async () => {
    const userId = new Types.ObjectId();
    const booking = makeReservation(userId, new Types.ObjectId(), 'confirmed');
    const checkIn = futureDate(3);
    booking.checkIn = new Date(`${checkIn}T00:00:00.000Z`);
    booking.policyAcceptance = {
      acceptedAt: new Date(),
      policySnapshot: {
        cancellationTiers: [
          { daysBefore: 2, refundPercent: 50 },
          { daysBefore: 5, refundPercent: 90 },
        ],
      },
    };
    bookingModel.findOne.mockReturnValue(query(booking));

    const result = await service.getRefundPreview(
      booking._id.toString(),
      userId.toString(),
    );

    expect(paymentsService.calculateRefundPercent).toHaveBeenCalledWith(
      booking.policyAcceptance.policySnapshot.cancellationTiers,
      3,
    );
    expect(result).toMatchObject({
      totalPrice: 200,
      currency: 'USD',
      refundPercent: 50,
      refundAmount: 100,
      daysRemaining: 3,
    });
  });

  it('cancels the whole booking, releases room-nights and creates its refund', async () => {
    const userId = new Types.ObjectId();
    const booking = makeReservation(userId, new Types.ObjectId(), 'confirmed');
    booking.checkIn = new Date(`${futureDate(3)}T00:00:00.000Z`);
    booking.policyAcceptance = {
      acceptedAt: new Date(),
      policySnapshot: {
        cancellationTiers: [{ daysBefore: 0, refundPercent: 50 }],
      },
    };
    bookingModel.findOne.mockReturnValue(query(booking));
    const payment = { _id: new Types.ObjectId(), status: 'succeeded' };
    paymentModel.findOne.mockReturnValue(query(payment));
    const cancelled = { ...booking, status: 'cancelled', cancelledBy: 'user' };
    bookingModel.findOneAndUpdate.mockReturnValue(query(cancelled));
    roomNightModel.deleteMany.mockReturnValue(query({ deletedCount: 2 }));
    const refund = {
      _id: new Types.ObjectId(),
      amount: 100,
      refundPercent: 50,
      status: 'refunded',
    };
    paymentsService.createRefund.mockResolvedValue(refund);
    bookingModel.updateOne.mockReturnValue(query({ modifiedCount: 1 }));

    const result = await service.cancelBooking(
      booking._id.toString(),
      userId.toString(),
      true,
    );

    expect(cancelled.status).toBe('cancelled');
    expect(roomNightModel.deleteMany).toHaveBeenCalledWith({
      hotelBookingId: booking._id,
    });
    expect(paymentsService.createRefund).toHaveBeenCalledWith(
      payment._id.toString(),
      100,
      50,
      'User hotel booking cancellation',
    );
    expect(result.refund).toBe(refund);
    expect(notificationsService.notify).toHaveBeenCalledTimes(2);
  });

  it('requires explicit confirmation before cancelling', async () => {
    await expect(
      service.cancelBooking(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(bookingModel.findOne).not.toHaveBeenCalled();
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
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
  return result;
}

function makeReservation(
  userId: Types.ObjectId,
  hotelId: Types.ObjectId,
  status:
    'pending_payment' | 'confirmed' | 'completed' | 'expired' | 'cancelled',
) {
  return {
    _id: new Types.ObjectId(),
    userId,
    hotelId: {
      _id: hotelId,
      name: 'Test Hotel',
      address: '1 Test Street',
      stars: 4,
      cityId: new Types.ObjectId(),
      countryId: new Types.ObjectId(),
    },
    rooms: [
      {
        roomId: new Types.ObjectId(),
        roomName: 'Family room',
        pricePerNight: 100,
        adults: 1,
        children: [7],
      },
    ],
    checkIn: new Date('2026-12-10T00:00:00.000Z'),
    checkOut: new Date('2026-12-12T00:00:00.000Z'),
    nights: 2,
    totalPrice: 200,
    status,
    bookingReference: 'HTL123456',
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    paymentId: null,
  } as any;
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
