import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hotel } from './schemas/hotel.schema';
import { Room } from './schemas/room.schema';

@Injectable()
export class HotelsService {
  constructor(
    @InjectModel(Hotel.name) private readonly hotelModel: Model<Hotel>,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
  ) {}

  async findById(id: string) {
    const hotel = await this.hotelModel
      .findById(id)
      .populate('cityId countryId')
      .exec();
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  findRoomsByIds(ids: string[]) {
    return this.roomModel.find({ _id: { $in: ids } }).exec();
  }

  async setActive(id: string, isActive: boolean) {
    const hotel = await this.hotelModel
      .findByIdAndUpdate(id, { $set: { isActive } }, { new: true, runValidators: true })
      .exec();
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  async updateRating(hotelId: string, averageRating: number, ratingsCount: number) {
    const hotel = await this.hotelModel
      .findByIdAndUpdate(
        hotelId,
        { $set: { averageRating, ratingsCount } },
        { new: true, runValidators: true },
      )
      .exec();
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  async markRoomsReserved(roomIds: string[]): Promise<void> {
    if (roomIds.length === 0) return;
    await this.roomModel
      .updateMany({ _id: { $in: roomIds } }, { $set: { everReserved: true } })
      .exec();
  }
}
