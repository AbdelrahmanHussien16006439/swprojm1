import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { AirlinesService } from '../airlines/airlines.service';
import { FlightsService } from '../flights/flights.service';
import { CreateBookingSummaryDto } from './dto/create-booking-summary.dto';
import { FlightBooking } from './schemas/flight-booking.schema';
import { FlightBookingsService } from './flight-bookings.service';

describe('FlightBookingsService policies', () => {
  let service: FlightBookingsService;
  let bookingModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let airlinesService: { getModeratorPolicies: jest.Mock };
  let flightsService: { findById: jest.Mock };
  let flightModel: { findOneAndUpdate: jest.Mock };
  let paymentsService: {
    cancelPayment: jest.Mock;
    cancelPaymentsForBooking: jest.Mock;
    findSucceededPaymentIdForBooking: jest.Mock;
  };

  beforeEach(() => {
    bookingModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    airlinesService = {
      findById: jest.fn().mockResolvedValue({
        isActive: true,
        baggagePolicy: { extraBagPrice: 10, maxExtraBagsPerPassenger: 2 },
      }),
      getModeratorPolicies: jest.fn().mockResolvedValue({
        baggagePolicy: { extraBagPrice: 20, maxExtraBagsPerPassenger: 2 },
        cancellationTiers: [{ daysBefore: 7, refundPercent: 50 }],
      }),
    };
    flightsService = { findById: jest.fn() };
    flightModel = { findOneAndUpdate: jest.fn() };
    paymentsService = {
      cancelPayment: jest.fn(),
      cancelPaymentsForBooking: jest.fn(),
      findSucceededPaymentIdForBooking: jest.fn(),
    };
    service = new FlightBookingsService(
      bookingModel as unknown as Model<FlightBooking>,
      airlinesService as unknown as AirlinesService,
      flightsService as unknown as FlightsService,
      flightModel as never,
      paymentsService as never,
    );
  });

  it('returns the associated airline policies for the booking owner', async () => {
    const airlineId = new Types.ObjectId();
    bookingModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        airlineId,
        status: 'pending_payment',
        holdExpiresAt: new Date(Date.now() + 60_000),
      }),
    });

    await expect(service.getPolicies('booking-1', 'user-1')).resolves.toEqual({
      bookingType: 'flight',
      baggagePolicy: { extraBagPrice: 20, maxExtraBagsPerPassenger: 2 },
      cancellationTiers: [{ daysBefore: 7, refundPercent: 50 }],
    });
    expect(bookingModel.findOne).toHaveBeenCalledWith({
      _id: 'booking-1',
      userId: 'user-1',
    });
    expect(airlinesService.getModeratorPolicies).toHaveBeenCalledWith(
      airlineId.toString(),
    );
  });

  it('stores acceptedAt and a policy snapshot for an owned pending booking', async () => {
    const bookingId = new Types.ObjectId();
    const userId = new Types.ObjectId().toString();
    const airlineId = new Types.ObjectId();
    const booking = {
      airlineId,
      status: 'pending_payment',
      holdExpiresAt: new Date(Date.now() + 60_000),
    };
    bookingModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(booking) });
    bookingModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ policyAcceptance: {} }),
    });

    await service.acceptPolicies(bookingId.toString(), userId);

    const [filter, update, options] = bookingModel.findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({
      _id: bookingId.toString(),
      userId: new Types.ObjectId(userId),
      status: 'pending_payment',
    });
    expect(filter.holdExpiresAt.$gt).toBeInstanceOf(Date);
    expect(update.$set.policyAcceptance).toMatchObject({
      acceptedAt: expect.any(Date),
      policySnapshot: {
        baggagePolicy: { extraBagPrice: 20, maxExtraBagsPerPassenger: 2 },
        cancellationTiers: [{ daysBefore: 7, refundPercent: 50 }],
      },
    });
    expect(options).toEqual({ new: true, runValidators: true });
  });

  it('returns 404 for another user and 400 for an expired hold', async () => {
    bookingModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.getPolicies('booking-1', 'other-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    bookingModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        status: 'pending_payment',
        holdExpiresAt: new Date(Date.now() - 1),
      }),
    });
    await expect(service.getPolicies('booking-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects acceptance if the booking became ineligible before the atomic update', async () => {
    bookingModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        airlineId: new Types.ObjectId(),
        status: 'pending_payment',
        holdExpiresAt: new Date(Date.now() + 60_000),
      }),
    });
    bookingModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.acceptPolicies('booking-1', new Types.ObjectId().toString()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('calculates a round-trip summary from outbound departure age without writing a booking', async () => {
    const airlineId = new Types.ObjectId();
    const airportA = new Types.ObjectId();
    const airportB = new Types.ObjectId();
    const outboundId = new Types.ObjectId();
    const returnId = new Types.ObjectId();
    const outboundCabinId = new Types.ObjectId();
    const returnCabinId = new Types.ObjectId();
    const outbound = {
      _id: outboundId,
      airlineId,
      flightNumber: 'AB100',
      departureAirportId: airportA,
      arrivalAirportId: airportB,
      departureTime: new Date('2035-05-01T15:00:00.000Z'),
      arrivalTime: new Date('2035-05-01T17:00:00.000Z'),
      status: 'scheduled',
      cabins: [
        {
          _id: outboundCabinId,
          cabinClass: 'economy',
          price: 100,
          availableSeats: 2,
          freeBags: 1,
          maxBagWeightKg: 23,
        },
      ],
    };
    const returnFlight = {
      _id: returnId,
      airlineId,
      flightNumber: 'AB101',
      departureAirportId: airportB,
      arrivalAirportId: airportA,
      departureTime: new Date('2035-05-10T10:00:00.000Z'),
      arrivalTime: new Date('2035-05-10T12:00:00.000Z'),
      status: 'scheduled',
      cabins: [
        {
          _id: returnCabinId,
          cabinClass: 'economy',
          price: 120,
          availableSeats: 2,
          freeBags: 1,
          maxBagWeightKg: 23,
        },
      ],
    };
    flightsService.findById.mockImplementation(async (id: string) =>
      id === outboundId.toString() ? outbound : returnFlight,
    );
    const dto = {
      outbound: {
        flightId: outboundId.toString(),
        cabinId: outboundCabinId.toString(),
      },
      return: {
        flightId: returnId.toString(),
        cabinId: returnCabinId.toString(),
      },
      passengers: [
        {
          fullName: 'Adult One',
          dateOfBirth: '2020-04-30',
          documentNumber: 'ADULT-1',
          extraBags: 1,
          extraBagsWeightKg: 20,
        },
        {
          fullName: 'Child One',
          dateOfBirth: '2028-05-02',
          documentNumber: 'CHILD-1',
          extraBags: 2,
          extraBagsWeightKg: 23,
        },
        {
          fullName: 'Infant One',
          dateOfBirth: '2034-05-01',
          documentNumber: 'INFANT-1',
        },
      ],
    } as CreateBookingSummaryDto;

    const summary = await service.createSummary(dto);

    expect(summary.tripType).toBe('round_trip');
    expect(summary.passengers.map((passenger) => passenger.type)).toEqual([
      'adult',
      'child',
      'infant',
    ]);
    expect(summary.baggage.totalFee).toBe(60);
    expect(summary.totalPrice).toBe(522);
    expect(summary.segments).toHaveLength(2);
    expect(flightsService.findById).toHaveBeenCalledTimes(2);
    expect(bookingModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects summaries with no adult, too many infants, excessive bags or weight', async () => {
    const airlineId = new Types.ObjectId();
    const cabinId = new Types.ObjectId();
    const flightId = new Types.ObjectId();
    flightsService.findById.mockResolvedValue({
      airlineId,
      departureAirportId: new Types.ObjectId(),
      arrivalAirportId: new Types.ObjectId(),
      departureTime: new Date('2035-05-01T15:00:00.000Z'),
      arrivalTime: new Date('2035-05-01T17:00:00.000Z'),
      status: 'scheduled',
      cabins: [
        {
          _id: cabinId,
          cabinClass: 'economy',
          price: 100,
          availableSeats: 5,
          maxBagWeightKg: 23,
          freeBags: 1,
        },
      ],
    });
    const selection = { flightId: flightId.toString(), cabinId: cabinId.toString() };
    const adult = {
      fullName: 'Adult',
      dateOfBirth: '2020-04-30',
      documentNumber: 'A1',
    };
    const infant = {
      fullName: 'Infant',
      dateOfBirth: '2034-05-01',
      documentNumber: 'I1',
    };
    const dto = (passengers: object[]) =>
      ({ outbound: selection, passengers }) as CreateBookingSummaryDto;

    await expect(
      service.createSummary(dto([{ ...infant, dateOfBirth: '2028-05-02' }])),
    ).rejects.toThrow('at least one adult');
    await expect(
      service.createSummary(dto([adult, infant, { ...infant, documentNumber: 'I2' }])),
    ).rejects.toThrow('more infants than adults');
    await expect(
      service.createSummary(dto([{ ...adult, extraBags: 3, extraBagsWeightKg: 20 }])),
    ).rejects.toThrow('exceed the airline baggage policy');
    await expect(
      service.createSummary(dto([{ ...adult, extraBags: 1, extraBagsWeightKg: 24 }])),
    ).rejects.toThrow('exceeds the selected cabin weight limit');
  });

  it('atomically holds seats and creates a ten-minute pending booking without accepting policies', async () => {
    const flightId = new Types.ObjectId();
    const cabinId = new Types.ObjectId();
    const airlineId = new Types.ObjectId();
    const userId = new Types.ObjectId().toString();
    const summary = {
      tripType: 'one_way',
      segments: [
        {
          flight: { flightId: flightId.toString() },
          cabin: {
            cabinId: cabinId.toString(),
            cabinClass: 'economy',
            farePerSeat: 100,
          },
        },
      ],
      passengers: [
        { type: 'adult', fullName: 'A', dateOfBirth: new Date('1990-01-01'), documentNumber: 'A1' },
        { type: 'child', fullName: 'C', dateOfBirth: new Date('2020-01-01'), documentNumber: 'C1' },
        { type: 'infant', fullName: 'I', dateOfBirth: new Date('2025-01-01'), documentNumber: 'I1' },
      ],
      baggage: { totalFee: 20 },
      totalPrice: 220,
    };
    jest.spyOn(service, 'createSummary').mockResolvedValue(summary as never);
    flightsService.findById.mockResolvedValue({ airlineId });
    flightModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: flightId }),
    });
    bookingModel.create.mockResolvedValue({ _id: new Types.ObjectId(), status: 'pending_payment' });

    const result = await service.holdSeats(
      {
        outbound: { flightId: flightId.toString(), cabinId: cabinId.toString() },
        passengers: [],
      } as never,
      userId,
    );

    expect(flightModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: flightId.toString(),
        'cabins._id': cabinId,
        status: 'scheduled',
        cabins: { $elemMatch: { _id: cabinId, availableSeats: { $gte: 2 } } },
      },
      { $inc: { 'cabins.$.availableSeats': -2, 'cabins.$.heldSeats': 2 } },
      { new: true },
    );
    const savedBooking = bookingModel.create.mock.calls[0][0];
    expect(savedBooking).toMatchObject({
      userId: new Types.ObjectId(userId),
      airlineId,
      tripType: 'one_way',
      seatsHeld: 2,
      baggageFee: 20,
      totalPrice: 220,
      status: 'pending_payment',
      policyAcceptance: null,
    });
    expect(savedBooking.holdExpiresAt.getTime()).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
    expect(savedBooking.holdExpiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 10 * 60 * 1000);
    expect(result.summary).toBe(summary);
  });

  it('rolls back the outbound hold if the return segment cannot be held', async () => {
    const outboundId = new Types.ObjectId();
    const returnId = new Types.ObjectId();
    const cabinId = new Types.ObjectId();
    const summary = {
      passengers: [{ type: 'adult' }],
      segments: [],
    };
    jest.spyOn(service, 'createSummary').mockResolvedValue(summary as never);
    flightModel.findOneAndUpdate
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ _id: outboundId }) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ _id: outboundId }) });

    await expect(
      service.holdSeats(
        {
          outbound: { flightId: outboundId.toString(), cabinId: cabinId.toString() },
          return: { flightId: returnId.toString(), cabinId: cabinId.toString() },
          passengers: [],
        } as never,
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(flightModel.findOneAndUpdate).toHaveBeenCalledTimes(3);
    expect(flightModel.findOneAndUpdate.mock.calls[2][1]).toEqual({
      $inc: { 'cabins.$.heldSeats': -1, 'cabins.$.availableSeats': 1 },
    });
    expect(bookingModel.create).not.toHaveBeenCalled();
  });

  it('expires a pending hold, releases its seats and cancels its payments', async () => {
    const bookingId = new Types.ObjectId();
    const flightId = new Types.ObjectId();
    const cabinId = new Types.ObjectId();
    const expired = {
      _id: bookingId,
      segments: [{ flightId, cabinId }],
      seatsHeld: 1,
      paymentId: null,
    };
    bookingModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([expired]) });
    bookingModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(expired),
    });
    flightModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: flightId }),
    });

    await service.expirePendingBookings();

    expect(bookingModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: bookingId,
        status: 'pending_payment',
        holdExpiresAt: { $lte: expect.any(Date) },
      }),
      { $set: { status: 'expired' } },
      { new: true },
    );
    expect(flightModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $inc: { 'cabins.$.heldSeats': -1, 'cabins.$.availableSeats': 1 },
    });
    expect(paymentsService.cancelPaymentsForBooking).toHaveBeenCalledWith(
      'flight',
      bookingId.toString(),
    );
  });

  it('confirms only after a succeeded payment and transfers held seats to booked', async () => {
    const bookingId = new Types.ObjectId();
    const flightId = new Types.ObjectId();
    const cabinId = new Types.ObjectId();
    const paymentId = new Types.ObjectId();
    const booking = {
      _id: bookingId,
      status: 'pending_payment',
      holdExpiresAt: new Date(Date.now() + 60_000),
      segments: [{ flightId, cabinId }],
      seatsHeld: 2,
    };
    bookingModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(booking) });
    paymentsService.findSucceededPaymentIdForBooking.mockResolvedValue(paymentId.toString());
    bookingModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...booking,
        status: 'confirmed',
        bookingReference: 'FL1234567890',
        paymentId,
      }),
    });
    flightModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: flightId }),
    });

    await service.onPaymentSucceeded(bookingId.toString());

    expect(bookingModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: bookingId.toString(),
        status: 'pending_payment',
        holdExpiresAt: { $gt: expect.any(Date) },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'confirmed', bookingReference: expect.any(String) }),
      }),
      { new: true },
    );
    expect(flightModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
      $inc: { 'cabins.$.heldSeats': -2, 'cabins.$.bookedSeats': 2 },
    });
  });
});
