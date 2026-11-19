import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfirmActionDto } from '../../common/dto/confirm-action.dto';
import { paginate } from '../../common/utils/pagination';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { Itinerary } from './schemas/itinerary.schema';

@Injectable()
export class ItinerariesService {
  constructor(
    @InjectModel(Itinerary.name) private readonly itineraryModel: Model<Itinerary>,
    private readonly referenceDataService: ReferenceDataService,
  ) {}

  async create(dto: CreateItineraryDto, user: JwtUser) {
    const countryIds = await this.resolveCountries(dto.countryIds);
    return this.itineraryModel.create({
      ownerId: new Types.ObjectId(user.sub),
      title: dto.title.trim(),
      countryIds,
      startDate: this.toCalendarDate(dto.startDate),
      isPublic: false,
    });
  }

  async list(query: ListItinerariesQueryDto, user: JwtUser) {
    const result = await paginate(
      this.itineraryModel,
      { ownerId: new Types.ObjectId(user.sub) },
      query.page,
      { sort: { updatedAt: -1 }, populate: 'countryIds' },
    );
    return {
      ...result,
      data: result.data.map((itinerary) => ({
        id: itinerary._id.toString(),
        title: itinerary.title,
        countries: itinerary.countryIds,
        startDate: itinerary.startDate,
        days: itinerary.days.length,
        isPublic: itinerary.isPublic,
        updatedAt: itinerary.updatedAt,
      })),
    };
  }

  async findOwned(id: string, user: JwtUser) {
    const itinerary = await this.itineraryModel
      .findOne({ _id: id, ownerId: new Types.ObjectId(user.sub) })
      .populate('countryIds')
      .populate('days.cityId')
      .exec();
    if (!itinerary) throw new NotFoundException('Itinerary not found');
    return itinerary;
  }

  async update(id: string, dto: UpdateItineraryDto, user: JwtUser) {
    const updates: Record<string, unknown> = {};
    if (dto.title !== undefined) updates.title = dto.title.trim();
    if (dto.countryIds !== undefined) {
      updates.countryIds = await this.resolveCountries(dto.countryIds);
    }
    if (dto.startDate !== undefined) {
      updates.startDate = this.toCalendarDate(dto.startDate);
    }
    const itinerary = await this.itineraryModel
      .findOneAndUpdate(
        { _id: id, ownerId: new Types.ObjectId(user.sub) },
        { $set: updates },
        { new: true, runValidators: true },
      )
      .populate('countryIds')
      .exec();
    if (!itinerary) throw new NotFoundException('Itinerary not found');
    return itinerary;
  }

  async delete(id: string, dto: ConfirmActionDto, user: JwtUser): Promise<void> {
    if (dto.confirm !== true) {
      throw new BadRequestException('confirm must be true to delete an itinerary');
    }
    const result = await this.itineraryModel.deleteOne({
      _id: id,
      ownerId: new Types.ObjectId(user.sub),
    });
    if (!result.deletedCount) throw new NotFoundException('Itinerary not found');
  }

  private async resolveCountries(countryIds: string[]): Promise<Types.ObjectId[]> {
    const uniqueIds = [...new Set(countryIds.map((id) => id.trim()))];
    const countries = await Promise.all(
      uniqueIds.map((id) => this.referenceDataService.findCountry(id)),
    );
    return countries.map((country) => country._id);
  }

  private toCalendarDate(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }
}
