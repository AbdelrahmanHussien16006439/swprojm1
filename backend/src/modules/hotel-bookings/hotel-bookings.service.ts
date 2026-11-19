import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HotelBooking } from './schemas/hotel-booking.schema';
import { RoomNight } from './schemas/room-night.schema';

@Injectable()
export class HotelBookingsService {
  constructor(
    @InjectModel(HotelBooking.name)
    private readonly hotelBookingModel: Model<HotelBooking>,
    @InjectModel(RoomNight.name)
    private readonly roomNightModel: Model<RoomNight>,
  ) {}

  /** ACC-12: a confirmed reservation remains upcoming until checkout completion. */
  async hasUpcomingConfirmed(userId: string): Promise<boolean> {
    const booking = await this.hotelBookingModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'confirmed' })
      .select('_id')
      .lean()
      .exec();
    return booking !== null;
  }

  /**
   * Return active room-night reservations for room IDs and [from, to) dates.
   * Confirmed records have no hold expiry; pending holds are active until expiry.
   */
  async findRoomNights(roomIds: string[], from: Date, to: Date) {
    if (roomIds.length === 0) return [];
    const now = new Date();
    return this.roomNightModel
      .find({
        roomId: { $in: roomIds.map((id) => new Types.ObjectId(id)) },
        date: { $gte: from, $lt: to },
        $or: [{ holdExpiresAt: null }, { holdExpiresAt: { $gt: now } }],
      })
      .sort({ date: 1, roomId: 1 })
      .exec();
  }

  /** HTL-18: checks active confirmed reservations or unexpired holds. */
  async hasActiveReservationOverlap(
    roomId: string,
    from: Date,
    to: Date,
  ): Promise<boolean> {
    const now = new Date();
    const roomNight = await this.roomNightModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        date: { $gte: from, $lt: to },
        $or: [{ holdExpiresAt: null }, { holdExpiresAt: { $gt: now } }],
      })
      .select('_id')
      .lean()
      .exec();
    return roomNight !== null;
  }
}
