import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { UpdateHotelPoliciesDto } from './dto/update-hotel-policies.dto';
import { Hotel } from './schemas/hotel.schema';
import { Room } from './schemas/room.schema';

@Injectable()
export class HotelsService {
  constructor(
    @InjectModel(Hotel.name) private readonly hotelModel: Model<Hotel>,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    private readonly referenceDataService: ReferenceDataService,
  ) {}

  async create(dto: CreateHotelDto) {
    const { city, country } = await this.resolveLocation(dto.cityId, dto.countryId);
    return this.hotelModel.create({
      name: dto.name.trim(),
      address: dto.address.trim(),
      cityId: city._id,
      countryId: country._id,
      description: dto.description.trim(),
      stars: dto.stars,
      amenities: dto.amenities.map((amenity) => amenity.trim()),
    });
  }

  async findById(id: string) {
    // TODO HTL-02: Reviews await Member 6's Review schema/service.
    // TODO HTL-02: date-specific rooms await Member 6's RoomNight availability support.
    const hotel = await this.hotelModel
      .findById(id)
      .populate('cityId countryId')
      .exec();
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  async update(id: string, dto: UpdateHotelDto, user: JwtUser) {
    const hotel = await this.findOwnedHotel(id, user);
    const update: Partial<Hotel> = {};
    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.address !== undefined) update.address = dto.address.trim();
    if (dto.description !== undefined) update.description = dto.description.trim();
    if (dto.stars !== undefined) update.stars = dto.stars;
    if (dto.amenities !== undefined) {
      update.amenities = dto.amenities.map((amenity) => amenity.trim());
    }
    if (dto.checkInTime !== undefined) update.checkInTime = dto.checkInTime;
    if (dto.checkOutTime !== undefined) update.checkOutTime = dto.checkOutTime;

    if (dto.cityId !== undefined || dto.countryId !== undefined) {
      const cityId = dto.cityId ?? this.referenceId(hotel.cityId);
      const countryId = dto.countryId ?? this.referenceId(hotel.countryId);
      const location = await this.resolveLocation(cityId, countryId);
      update.cityId = location.city._id;
      update.countryId = location.country._id;
    }

    const updated = await this.hotelModel
      .findOneAndUpdate({ _id: id }, { $set: update }, { new: true, runValidators: true })
      .populate('cityId countryId')
      .exec();
    if (!updated) throw new NotFoundException('Hotel not found');
    return updated;
  }

  async updatePolicies(id: string, dto: UpdateHotelPoliciesDto, user: JwtUser) {
    await this.findOwnedHotel(id, user);
    const hotel = await this.hotelModel
      .findOneAndUpdate(
        { _id: id },
        {
          $set: {
            checkInTime: dto.checkInTime,
            checkOutTime: dto.checkOutTime,
            cancellationTiers: dto.tiers,
          },
        },
        { new: true, runValidators: true },
      )
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

  private async findOwnedHotel(id: string, user: JwtUser) {
    if (!user.providerId || user.providerId !== id) {
      throw new NotFoundException('Hotel not found');
    }
    return this.findById(id);
  }

  private async resolveLocation(cityId: string, countryId: string) {
    let city: Awaited<ReturnType<ReferenceDataService['findCity']>>;
    let country: Awaited<ReturnType<ReferenceDataService['findCountry']>>;
    try {
      [city, country] = await Promise.all([
        this.referenceDataService.findCity(cityId),
        this.referenceDataService.findCountry(countryId),
      ]);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('City and country must exist in reference data');
      }
      throw error;
    }
    const cityCountryId = this.referenceId(city.countryId);
    if (cityCountryId !== country._id.toString()) {
      throw new BadRequestException('City does not belong to the selected country');
    }
    return { city, country };
  }

  private referenceId(reference: Types.ObjectId | { _id: Types.ObjectId } | unknown): string {
    if (reference && typeof reference === 'object' && '_id' in reference) {
      return String((reference as { _id: Types.ObjectId })._id);
    }
    return String(reference);
  }
}
