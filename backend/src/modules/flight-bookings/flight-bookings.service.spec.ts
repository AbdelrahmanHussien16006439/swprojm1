import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { AirlinesService } from '../airlines/airlines.service';
import { FlightBooking } from './schemas/flight-booking.schema';
import { FlightBookingsService } from './flight-bookings.service';

describe('FlightBookingsService policies', () => {
  let service: FlightBookingsService;
  let bookingModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let airlinesService: { getModeratorPolicies: jest.Mock };

  beforeEach(() => {
    bookingModel = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };
    airlinesService = {
      getModeratorPolicies: jest.fn().mockResolvedValue({
        baggagePolicy: { extraBagPrice: 20, maxExtraBagsPerPassenger: 2 },
        cancellationTiers: [{ daysBefore: 7, refundPercent: 50 }],
      }),
    };
    service = new FlightBookingsService(
      bookingModel as unknown as Model<FlightBooking>,
      airlinesService as unknown as AirlinesService,
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
});
