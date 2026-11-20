import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfirmActionDto } from '../../common/dto/confirm-action.dto';
import { paginate } from '../../common/utils/pagination';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
import { ReorderItineraryDayDto } from './dto/reorder-itinerary-day.dto';
import { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { MAX_ITINERARY_DAYS, MILLISECONDS_PER_CALENDAR_DAY } from './itineraries.constants';
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
    return this.withComputedDays(itinerary);
  }

  async addDay(
    id: string,
    dto: CreateItineraryDayDto,
    user: JwtUser,
  ) {
    const city = await this.referenceDataService.findCity(dto.cityId);
    const itinerary = await this.findOwnedDocument(id, user);
    if (itinerary.days.length >= MAX_ITINERARY_DAYS) {
      throw new BadRequestException('An itinerary cannot contain more than 60 days');
    }
    const insertionIndex = dto.position === undefined
      ? itinerary.days.length
      : dto.position - 1;
    if (insertionIndex > itinerary.days.length) {
      throw new BadRequestException('position cannot be greater than the next day position');
    }
    itinerary.days.splice(insertionIndex, 0, {
      _id: new Types.ObjectId(),
      cityId: city._id,
      notes: dto.notes?.trim() ?? '',
      activities: [],
      budgetEntries: [],
    } as any);
    await itinerary.save();
    return this.findOwned(id, user);
  }

  async updateDay(
    id: string,
    dayId: string,
    dto: UpdateItineraryDayDto,
    user: JwtUser,
  ) {
    const city = dto.cityId === undefined
      ? undefined
      : await this.referenceDataService.findCity(dto.cityId);
    const itinerary = await this.findOwnedDocument(id, user);
    const day = itinerary.days.find((candidate) => candidate._id.toString() === dayId);
    if (!day) throw new NotFoundException('Itinerary day not found');
    if (city) day.cityId = city._id;
    if (dto.notes !== undefined) day.notes = dto.notes.trim();
    await itinerary.save();
    return this.findOwned(id, user);
  }

  async deleteDay(
    id: string,
    dayId: string,
    dto: ConfirmActionDto,
    user: JwtUser,
  ) {
    if (dto.confirm !== true) {
      throw new BadRequestException('confirm must be true to delete an itinerary day');
    }
    const itinerary = await this.findOwnedDocument(id, user);
    const index = itinerary.days.findIndex((day) => day._id.toString() === dayId);
    if (index < 0) throw new NotFoundException('Itinerary day not found');
    const [removedDay] = itinerary.days.splice(index, 1);
    itinerary.transportCosts = itinerary.transportCosts.filter(
      (cost) => cost.dayId.toString() !== removedDay._id.toString(),
    ) as typeof itinerary.transportCosts;
    await itinerary.save();
    return this.findOwned(id, user);
  }

  async reorderDay(
    id: string,
    dto: ReorderItineraryDayDto,
    user: JwtUser,
  ) {
    const itinerary = await this.findOwnedDocument(id, user);
    const currentIndex = itinerary.days.findIndex(
      (day) => day._id.toString() === dto.dayId,
    );
    if (currentIndex < 0) throw new NotFoundException('Itinerary day not found');
    if (dto.newPosition > itinerary.days.length) {
      throw new BadRequestException('newPosition cannot exceed the itinerary day count');
    }
    const [day] = itinerary.days.splice(currentIndex, 1);
    itinerary.days.splice(dto.newPosition - 1, 0, day);
    await itinerary.save();
    return this.findOwned(id, user);
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
      .populate('days.cityId')
      .exec();
    if (!itinerary) throw new NotFoundException('Itinerary not found');
    return this.withComputedDays(itinerary);
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

  private async findOwnedDocument(id: string, user: JwtUser) {
    const itinerary = await this.itineraryModel.findOne({
      _id: id,
      ownerId: new Types.ObjectId(user.sub),
    }).exec();
    if (!itinerary) throw new NotFoundException('Itinerary not found');
    return itinerary;
  }

  private withComputedDays(itinerary: any) {
    const startDate = itinerary.startDate as Date;
    const days = itinerary.days.map((day: any, index: number) => ({
      ...(typeof day.toObject === 'function' ? day.toObject() : day),
      dayNumber: index + 1,
      date: new Date(startDate.getTime() + index * MILLISECONDS_PER_CALENDAR_DAY),
    }));
    const groups: any[] = [];
    for (const day of days) {
      const city = day.cityId;
      const cityKey = String(city?._id ?? city);
      let group = groups[groups.length - 1];
      if (!group || group.cityKey !== cityKey) {
        group = {
          cityKey,
          cityId: city,
          fromDay: day.dayNumber,
          toDay: day.dayNumber,
          dayCount: 0,
          budgetSubtotal: [],
        };
        groups.push(group);
      }
      group.toDay = day.dayNumber;
      group.dayCount += 1;
      this.addDayAmounts(group.budgetSubtotal, day, itinerary.transportCosts);
    }
    const cityGroups = groups.map(({ cityKey: _cityKey, ...group }) => group);
    return { ...itinerary.toObject(), days, cityGroups };
  }

  private addDayAmounts(
    totals: Array<{ currency: string; amount: number }>,
    day: any,
    transportCosts: any[],
  ) {
    const amounts: Array<{ currency?: string; amount?: number }> = [
      ...(day.budgetEntries ?? []),
      ...(day.activities ?? [])
        .filter((activity: any) => activity.cost != null)
        .map((activity: any) => ({ amount: activity.cost, currency: activity.currency })),
      ...transportCosts.filter((cost: any) => cost.dayId.toString() === day._id.toString()),
    ];
    for (const item of amounts) {
      if (!item.currency || item.amount == null) continue;
      const currency = item.currency.toUpperCase();
      const existing = totals.find((total) => total.currency === currency);
      if (existing) existing.amount += item.amount;
      else totals.push({ currency, amount: item.amount });
    }
  }

  private toCalendarDate(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }
}
