import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AirlinesService } from '../airlines/airlines.service';
import { FlightBooking } from './schemas/flight-booking.schema';

@Injectable()
export class FlightBookingsService {
  constructor(
    @InjectModel(FlightBooking.name)
    private readonly flightBookingModel: Model<FlightBooking>,
    private readonly airlinesService: AirlinesService,
  ) {}

  /** PAY-02: return the policy details attached to the booking's airline. */
  async getPolicies(bookingId: string, userId: string) {
    const booking = await this.getOwnedPendingBooking(bookingId, userId);
    const policies = await this.airlinesService.getModeratorPolicies(
      booking.airlineId.toString(),
    );
    return {
      bookingType: 'flight' as const,
      baggagePolicy: policies.baggagePolicy,
      cancellationTiers: policies.cancellationTiers,
    };
  }

  /** PAY-02: persist a timestamp and exact policy snapshot for later cancellations. */
  async acceptPolicies(bookingId: string, userId: string): Promise<FlightBooking> {
    const booking = await this.getOwnedPendingBooking(bookingId, userId);
    const policies = await this.airlinesService.getModeratorPolicies(
      booking.airlineId.toString(),
    );
    const acceptedAt = new Date();
    const updated = await this.flightBookingModel
      .findOneAndUpdate(
        {
          _id: bookingId,
          userId: new Types.ObjectId(userId),
          status: 'pending_payment',
          holdExpiresAt: { $gt: acceptedAt },
        },
        {
          $set: {
            policyAcceptance: {
              acceptedAt,
              policySnapshot: {
                baggagePolicy: policies.baggagePolicy,
                cancellationTiers: policies.cancellationTiers,
              },
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new BadRequestException('Booking is no longer eligible for policy acceptance');
    }
    return updated;
  }

  private async getOwnedPendingBooking(
    bookingId: string,
    userId: string,
  ): Promise<FlightBooking> {
    const booking = await this.flightBookingModel
      .findOne({ _id: bookingId, userId })
      .exec();
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'pending_payment') {
      throw new BadRequestException('Booking is not pending payment');
    }
    if (booking.holdExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Booking payment hold has expired');
    }
    return booking;
  }
}
