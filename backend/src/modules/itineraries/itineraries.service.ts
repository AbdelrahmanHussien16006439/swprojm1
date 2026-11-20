import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfirmActionDto } from '../../common/dto/confirm-action.dto';
import { paginate } from '../../common/utils/pagination';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateItineraryActivityDto } from './dto/create-itinerary-activity.dto';
import { CreateItineraryBudgetDto } from './dto/create-itinerary-budget.dto';
import { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ListItinerariesQueryDto } from './dto/list-itineraries-query.dto';
import { ReorderItineraryDayDto } from './dto/reorder-itinerary-day.dto';
import { UpdateItineraryActivityDto } from './dto/update-itinerary-activity.dto';
import { UpdateItineraryBudgetDto } from './dto/update-itinerary-budget.dto';
import { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import { CreateItineraryTransportCostDto } from './dto/create-itinerary-transport-cost.dto';
import { UpdateItineraryTransportCostDto } from './dto/update-itinerary-transport-cost.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import {
  MAX_ACTIVITY_IMAGES,
  MAX_ITINERARY_DAYS,
  MILLISECONDS_PER_CALENDAR_DAY,
} from './itineraries.constants';
import { Itinerary } from './schemas/itinerary.schema';

@Injectable()
export class ItinerariesService {
  constructor(
    @InjectModel(Itinerary.name) private readonly itineraryModel: Model<Itinerary>,
    private readonly referenceDataService: ReferenceDataService,
    private readonly uploadsService: UploadsService,
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

  async addActivity(
    itineraryId: string,
    dayId: string,
    dto: CreateItineraryActivityDto,
    user: JwtUser,
  ) {
    const { itinerary, day } = await this.findOwnedDay(itineraryId, dayId, user);
    this.assertActivityMoneyPair(dto.cost, dto.currency);
    if (dto.cost !== undefined) await this.assertSupportedCurrency(dto.currency);
    day.activities.push({
      name: dto.name.trim(),
      description: dto.description.trim(),
      time: dto.time,
      cost: dto.cost,
      currency: dto.currency?.toUpperCase(),
      images: [],
    } as any);
    await itinerary.save();
    return this.findOwned(itineraryId, user);
  }

  async updateActivity(
    activityId: string,
    dto: UpdateItineraryActivityDto,
    user: JwtUser,
  ) {
    const { itinerary, activity } = await this.findOwnedActivity(activityId, user);
    const cost = dto.cost === undefined ? activity.cost : dto.cost;
    const currency = dto.currency === undefined ? activity.currency : dto.currency;
    this.assertActivityMoneyPair(cost, currency);
    if (cost !== undefined) await this.assertSupportedCurrency(currency);
    if (dto.name !== undefined) activity.name = dto.name.trim();
    if (dto.description !== undefined) activity.description = dto.description.trim();
    if (dto.time !== undefined) activity.time = dto.time;
    if (dto.cost !== undefined) activity.cost = dto.cost;
    if (dto.currency !== undefined) activity.currency = dto.currency.toUpperCase();
    await itinerary.save();
    return this.findOwned(itinerary._id.toString(), user);
  }

  async deleteActivity(activityId: string, user: JwtUser) {
    const { itinerary, day, activityIndex, activity } =
      await this.findOwnedActivity(activityId, user);
    const imageIds = activity.images.map((image) => image.id);
    day.activities.splice(activityIndex, 1);
    await itinerary.save();
    await Promise.all(imageIds.map((imageId) => this.uploadsService.deleteImage(imageId)));
    return this.findOwned(itinerary._id.toString(), user);
  }

  async addActivityImage(
    activityId: string,
    file: Express.Multer.File,
    user: JwtUser,
  ) {
    const { itinerary, activity } = await this.findOwnedActivity(activityId, user);
    if (activity.images.length >= MAX_ACTIVITY_IMAGES) {
      throw new BadRequestException('An activity can have at most 5 images');
    }
    const uploaded = await this.uploadsService.saveImage(file);
    activity.images.push(uploaded);
    try {
      await itinerary.save();
    } catch (error) {
      await this.uploadsService.deleteImage(uploaded.id);
      throw error;
    }
    return this.findOwned(itinerary._id.toString(), user);
  }

  async deleteActivityImage(
    activityId: string,
    imageId: string,
    user: JwtUser,
  ) {
    const { itinerary, activity } = await this.findOwnedActivity(activityId, user);
    const imageIndex = activity.images.findIndex((image) => image.id === imageId);
    if (imageIndex < 0) throw new NotFoundException('Activity image not found');
    activity.images.splice(imageIndex, 1);
    await itinerary.save();
    await this.uploadsService.deleteImage(imageId);
    return this.findOwned(itinerary._id.toString(), user);
  }

  async addBudgetEntry(
    itineraryId: string,
    dayId: string,
    dto: CreateItineraryBudgetDto,
    user: JwtUser,
  ) {
    const { itinerary, day } = await this.findOwnedDay(itineraryId, dayId, user);
    await this.assertSupportedCurrency(dto.currency);
    day.budgetEntries.push({
      _id: new Types.ObjectId(),
      category: dto.category,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      note: dto.note?.trim(),
    } as any);
    await itinerary.save();
    return this.findOwned(itineraryId, user);
  }

  async updateBudgetEntry(
    budgetId: string,
    dto: UpdateItineraryBudgetDto,
    user: JwtUser,
  ) {
    const { itinerary, entry } = await this.findOwnedBudgetEntry(budgetId, user);
    if (dto.currency !== undefined) await this.assertSupportedCurrency(dto.currency);
    if (dto.category !== undefined) entry.category = dto.category;
    if (dto.amount !== undefined) entry.amount = dto.amount;
    if (dto.currency !== undefined) entry.currency = dto.currency.toUpperCase();
    if (dto.note !== undefined) entry.note = dto.note.trim();
    await itinerary.save();
    return this.findOwned(itinerary._id.toString(), user);
  }

  async deleteBudgetEntry(budgetId: string, user: JwtUser) {
    const { itinerary, day, entryIndex } = await this.findOwnedBudgetEntry(budgetId, user);
    day.budgetEntries.splice(entryIndex, 1);
    await itinerary.save();
    return this.findOwned(itinerary._id.toString(), user);
  }

  async addTransportCost(
    itineraryId: string,
    dto: CreateItineraryTransportCostDto,
    user: JwtUser,
  ) {
    const [fromCity, toCity] = await Promise.all([
      this.referenceDataService.findCity(dto.fromCityId),
      this.referenceDataService.findCity(dto.toCityId),
    ]);
    await this.assertSupportedCurrency(dto.currency);
    const itinerary = await this.findOwnedDocument(itineraryId, user);
    const day = itinerary.days.find((candidate) => candidate._id.toString() === dto.dayId);
    if (!day) throw new NotFoundException('Itinerary day not found');
    itinerary.transportCosts.push({
      _id: new Types.ObjectId(),
      mode: dto.mode.trim(),
      fromCityId: fromCity._id,
      toCityId: toCity._id,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      dayId: day._id,
    } as any);
    await itinerary.save();
    return this.findOwned(itineraryId, user);
  }

  async updateTransportCost(
    transportCostId: string,
    dto: UpdateItineraryTransportCostDto,
    user: JwtUser,
  ) {
    const { itinerary, cost } = await this.findOwnedTransportCost(transportCostId, user);
    const [fromCity, toCity] = await Promise.all([
      dto.fromCityId === undefined ? undefined : this.referenceDataService.findCity(dto.fromCityId),
      dto.toCityId === undefined ? undefined : this.referenceDataService.findCity(dto.toCityId),
    ]);
    if (dto.currency !== undefined) await this.assertSupportedCurrency(dto.currency);
    if (dto.dayId !== undefined && !itinerary.days.some((day) => day._id.toString() === dto.dayId)) {
      throw new NotFoundException('Itinerary day not found');
    }
    if (dto.mode !== undefined) cost.mode = dto.mode.trim();
    if (fromCity) cost.fromCityId = fromCity._id;
    if (toCity) cost.toCityId = toCity._id;
    if (dto.amount !== undefined) cost.amount = dto.amount;
    if (dto.currency !== undefined) cost.currency = dto.currency.toUpperCase();
    if (dto.dayId !== undefined) cost.dayId = new Types.ObjectId(dto.dayId);
    await itinerary.save();
    return this.findOwned(itinerary._id.toString(), user);
  }

  async deleteTransportCost(transportCostId: string, user: JwtUser) {
    const { itinerary, costIndex } = await this.findOwnedTransportCost(transportCostId, user);
    itinerary.transportCosts.splice(costIndex, 1);
    await itinerary.save();
    return this.findOwned(itinerary._id.toString(), user);
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

  private async findOwnedDay(itineraryId: string, dayId: string, user: JwtUser) {
    const itinerary = await this.findOwnedDocument(itineraryId, user);
    const day = itinerary.days.find((candidate) => candidate._id.toString() === dayId);
    if (!day) throw new NotFoundException('Itinerary day not found');
    return { itinerary, day };
  }

  private async findOwnedActivity(activityId: string, user: JwtUser) {
    const itinerary = await this.itineraryModel.findOne({
      'days.activities._id': activityId,
      ownerId: new Types.ObjectId(user.sub),
    }).exec();
    if (!itinerary) throw new NotFoundException('Activity not found');
    for (const day of itinerary.days) {
      const activityIndex = day.activities.findIndex(
        (candidate) => candidate._id.toString() === activityId,
      );
      if (activityIndex >= 0) {
        return { itinerary, day, activity: day.activities[activityIndex], activityIndex };
      }
    }
    throw new NotFoundException('Activity not found');
  }

  private async findOwnedBudgetEntry(budgetId: string, user: JwtUser) {
    const itinerary = await this.itineraryModel.findOne({
      'days.budgetEntries._id': budgetId,
      ownerId: new Types.ObjectId(user.sub),
    }).exec();
    if (!itinerary) throw new NotFoundException('Budget entry not found');
    for (const day of itinerary.days) {
      const entryIndex = day.budgetEntries.findIndex(
        (entry) => entry._id.toString() === budgetId,
      );
      if (entryIndex >= 0) {
        return { itinerary, day, entry: day.budgetEntries[entryIndex], entryIndex };
      }
    }
    throw new NotFoundException('Budget entry not found');
  }

  private async findOwnedTransportCost(transportCostId: string, user: JwtUser) {
    const itinerary = await this.itineraryModel.findOne({
      'transportCosts._id': transportCostId,
      ownerId: new Types.ObjectId(user.sub),
    }).exec();
    if (!itinerary) throw new NotFoundException('Transport cost not found');
    const costIndex = itinerary.transportCosts.findIndex(
      (cost) => cost._id.toString() === transportCostId,
    );
    if (costIndex < 0) throw new NotFoundException('Transport cost not found');
    return { itinerary, cost: itinerary.transportCosts[costIndex], costIndex };
  }

  private assertActivityMoneyPair(cost?: number, currency?: string) {
    if ((cost === undefined) !== (currency === undefined)) {
      throw new BadRequestException('cost and currency must be provided together');
    }
  }

  private async assertSupportedCurrency(currency?: string) {
    if (!currency || !(await this.referenceDataService.isSupportedCurrency(currency))) {
      throw new BadRequestException('currency is not supported');
    }
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
