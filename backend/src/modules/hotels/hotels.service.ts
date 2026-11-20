import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PAGE_SIZE, toPaginated } from '../../common/utils/pagination';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { HotelBookingsService } from '../hotel-bookings/hotel-bookings.service';
import { ReviewsService } from '../reviews/reviews.service';
import { ListHotelReviewsQueryDto } from '../reviews/dto/list-hotel-reviews-query.dto';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { UpdateHotelPoliciesDto } from './dto/update-hotel-policies.dto';
import { RoomDateRangeDto, UpdateRoomAvailabilityDto } from './dto/room-date-range.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Hotel } from './schemas/hotel.schema';
import {
  availabilityRangesDoNotOverlap,
  hasValidRoomRangeDates,
  Room,
  RoomDateRange,
} from './schemas/room.schema';

@Injectable()
export class HotelsService {
  constructor(
    @InjectModel(Hotel.name) private readonly hotelModel: Model<Hotel>,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    private readonly referenceDataService: ReferenceDataService,
    private readonly uploadsService: UploadsService,
    @Inject(forwardRef(() => HotelBookingsService))
    private readonly hotelBookingsService: HotelBookingsService,
    @Inject(forwardRef(() => ReviewsService))
    private readonly reviewsService: ReviewsService,
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
    const hotel = await this.hotelModel
      .findById(id)
      .populate('cityId countryId')
      .exec();
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  async findHotelDetails(id: string, query: ListHotelReviewsQueryDto) {
    const [hotel, reviews] = await Promise.all([
      this.findById(id),
      this.reviewsService.listForHotel(id, query),
    ]);
    return {
      ...hotel.toObject(),
      averageRating: reviews.averageRating,
      ratingsCount: reviews.ratingsCount,
      reviews,
    };
  }

  async search(dto: SearchHotelsDto) {
    const locationFilter = await this.resolveSearchLocation(dto);
    const { checkIn, checkOut, nights } = this.getStay(dto.checkIn, dto.checkOut);
    const guests = dto.guests;
    const roomsRequired = dto.rooms ?? 1;
    const page = dto.page ?? 1;

    if (
      dto.minPrice !== undefined &&
      dto.maxPrice !== undefined &&
      dto.minPrice > dto.maxPrice
    ) {
      throw new BadRequestException('minPrice must be less than or equal to maxPrice');
    }

    const hotels = await this.hotelModel
      .find({ ...locationFilter, isActive: true })
      .populate('cityId countryId')
      .exec();
    if (hotels.length === 0) return toPaginated([], 0, page);

    const activeRooms = await this.roomModel
      .find({ hotelId: { $in: hotels.map((hotel) => hotel._id) }, isActive: true })
      .exec();
    const activeRoomNights = await this.hotelBookingsService.findRoomNights(
      activeRooms.map((room) => room._id.toString()),
      checkIn,
      checkOut,
    );
    const occupiedRoomIds = new Set(
      activeRoomNights.map((roomNight) => roomNight.roomId.toString()),
    );
    const roomsByHotel = new Map<string, Array<Room & { _id: Types.ObjectId }>>();
    for (const room of activeRooms) {
      const hotelId = room.hotelId.toString();
      const hotelRooms = roomsByHotel.get(hotelId) ?? [];
      hotelRooms.push(room);
      roomsByHotel.set(hotelId, hotelRooms);
    }

    const results: Array<Record<string, unknown>> = [];
    for (const hotel of hotels) {
      const availableRooms = (roomsByHotel.get(hotel._id.toString()) ?? []).filter(
        (room) =>
          !occupiedRoomIds.has(room._id.toString()) &&
          this.isRoomAvailableForStay(room, nights),
      );
      if (availableRooms.length < roomsRequired) continue;

      const feasibleRooms = this.getFeasibleRooms(availableRooms, roomsRequired, guests);
      if (feasibleRooms.length === 0) continue;

      const cheapestRoomPrice = Math.min(
        ...feasibleRooms.map((room) => room.pricePerNight),
      );
      if (dto.minPrice !== undefined && cheapestRoomPrice < dto.minPrice) continue;
      if (dto.maxPrice !== undefined && cheapestRoomPrice > dto.maxPrice) continue;
      if (
        dto.minRating !== undefined &&
        (hotel.ratingsCount === 0 || hotel.averageRating < dto.minRating)
      ) {
        continue;
      }

      results.push({
        ...hotel.toObject(),
        cheapestRoomPrice,
        availableRoomCount: availableRooms.length,
      });
    }

    const direction = dto.order === 'desc' ? -1 : 1;
    results.sort((left, right) => {
      const leftSort =
        dto.sortBy === 'rating'
          ? Number(left.averageRating ?? 0)
          : Number(left.cheapestRoomPrice ?? 0);
      const rightSort =
        dto.sortBy === 'rating'
          ? Number(right.averageRating ?? 0)
          : Number(right.cheapestRoomPrice ?? 0);
      return (leftSort - rightSort) * direction ||
        String(left.name ?? '').localeCompare(String(right.name ?? ''));
    });

    const start = (page - 1) * PAGE_SIZE;
    return toPaginated(results.slice(start, start + PAGE_SIZE), results.length, page);
  }

  async getFreeRooms(hotelId: string, checkInValue: string, checkOutValue: string) {
    const hotel = await this.findById(hotelId);
    const { nights, checkIn, checkOut } = this.getStay(checkInValue, checkOutValue);
    if (!hotel.isActive) return [];

    const rooms = await this.roomModel
      .find({ hotelId, isActive: true })
      .sort({ pricePerNight: 1 })
      .exec();
    const activeRoomNights = await this.hotelBookingsService.findRoomNights(
      rooms.map((room) => room._id.toString()),
      checkIn,
      checkOut,
    );
    const occupiedRoomIds = new Set(
      activeRoomNights.map((roomNight) => roomNight.roomId.toString()),
    );
    const freeRooms = rooms.filter(
      (room) =>
        !occupiedRoomIds.has(room._id.toString()) &&
        this.isRoomAvailableForStay(room, nights),
    );
    const nightsCount = nights.length;
    return freeRooms.map((room) => ({
      ...room.toObject(),
      totalStayPrice: room.pricePerNight * nightsCount,
    }));
  }

  async getAvailabilityCalendar(
    hotelId: string,
    fromValue: string,
    toValue: string,
    user: JwtUser,
  ) {
    await this.findOwnedHotel(hotelId, user);
    const from = this.toUtcDate(fromValue);
    const to = this.toUtcDate(toValue);
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be the same as or after from');
    }

    const rooms = await this.roomModel.find({ hotelId }).exec();
    const dates: Date[] = [];
    for (
      let timestamp = from.getTime();
      timestamp <= to.getTime();
      timestamp += 24 * 60 * 60 * 1000
    ) {
      dates.push(new Date(timestamp));
    }

    const activeRoomNights = await this.hotelBookingsService.findRoomNights(
      rooms.map((room) => room._id.toString()),
      from,
      this.addUtcDays(to, 1),
    );
    const roomNightsByDate = new Map<string, (typeof activeRoomNights)[number]>();
    for (const roomNight of activeRoomNights) {
      roomNightsByDate.set(
        `${roomNight.roomId.toString()}:${roomNight.date.toISOString().slice(0, 10)}`,
        roomNight,
      );
    }
    return rooms.map((room) => ({
      roomId: room._id,
      roomName: room.name,
      dates: dates.map((date) => {
        const timestamp = date.getTime();
        const roomNight = roomNightsByDate.get(
          `${room._id.toString()}:${date.toISOString().slice(0, 10)}`,
        );
        const isBlocked =
          !room.isActive ||
          (room.blockedRanges ?? []).some(
            (range) =>
              range.startDate.getTime() <= timestamp &&
              timestamp <= range.endDate.getTime(),
          );
        const isAvailable = (room.availabilityRanges ?? []).some(
          (range) =>
            range.startDate.getTime() <= timestamp &&
            timestamp <= range.endDate.getTime(),
        );
        return {
          date: date.toISOString().slice(0, 10),
          status: roomNight ? 'Booked' : !isBlocked && isAvailable ? 'Available' : 'Blocked',
          ...(roomNight
            ? {
                bookingReference: roomNight.bookingReference ?? null,
                reservationId: roomNight.hotelBookingId.toString(),
              }
            : {}),
        };
      }),
    }));
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

  async createRoom(hotelId: string, dto: CreateRoomDto, user: JwtUser) {
    await this.findOwnedHotel(hotelId, user);
    try {
      return await this.roomModel.create({
        hotelId,
        name: dto.name.trim(),
        type: dto.type.trim(),
        beds: dto.beds,
        maxOccupancy: dto.maxOccupancy,
        pricePerNight: dto.pricePerNight,
      });
    } catch (error) {
      this.throwDuplicateRoomName(error);
      throw error;
    }
  }

  async updateRoom(
    hotelId: string,
    roomId: string,
    dto: UpdateRoomDto,
    user: JwtUser,
  ) {
    await this.findOwnedHotel(hotelId, user);
    const room = await this.findRoomInHotel(hotelId, roomId);
    const update: Partial<Room> = {};
    if (dto.beds !== undefined) update.beds = dto.beds;
    if (dto.maxOccupancy !== undefined) update.maxOccupancy = dto.maxOccupancy;
    if (dto.pricePerNight !== undefined) update.pricePerNight = dto.pricePerNight;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;

    if (dto.isActive === false) {
      await this.assertNoActiveReservationOverlap(
        room._id.toString(),
        room.availabilityRanges ?? [],
        'A room with an active reservation cannot be deactivated',
      );
    }

    const updated = await this.roomModel
      .findOneAndUpdate(
        { _id: room._id, hotelId },
        { $set: update },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Room not found');
    return updated;
  }

  async deleteRoom(hotelId: string, roomId: string, user: JwtUser): Promise<void> {
    await this.findOwnedHotel(hotelId, user);
    const room = await this.findRoomInHotel(hotelId, roomId);
    if (room.everReserved) {
      throw new ConflictException('A room that has been reserved cannot be deleted');
    }
    await this.assertNoActiveReservationOverlap(
      room._id.toString(),
      room.availabilityRanges ?? [],
      'A room with an active reservation cannot be deleted',
    );
    await this.roomModel.deleteOne({ _id: room._id, hotelId }).exec();
  }

  async addAvailability(
    hotelId: string,
    roomId: string,
    dto: RoomDateRangeDto,
    user: JwtUser,
  ) {
    await this.findOwnedHotel(hotelId, user);
    const room = await this.findRoomInHotel(hotelId, roomId);
    const newRange = this.toDateRange(dto);
    const ranges = [...(room.availabilityRanges ?? []), newRange];
    if (!availabilityRangesDoNotOverlap(ranges)) {
      throw new BadRequestException('Availability ranges must be valid and must not overlap');
    }
    room.availabilityRanges = ranges;
    await room.save();
    return room;
  }

  async updateAvailability(
    hotelId: string,
    roomId: string,
    dto: UpdateRoomAvailabilityDto,
    user: JwtUser,
  ) {
    await this.findOwnedHotel(hotelId, user);
    const room = await this.findRoomInHotel(hotelId, roomId);
    if (dto.availabilityRanges === undefined && dto.blockedRanges === undefined) {
      throw new BadRequestException(
        'Provide availabilityRanges and/or blockedRanges to update',
      );
    }

    if (dto.availabilityRanges !== undefined) {
      const ranges = dto.availabilityRanges.map((range) => this.toDateRange(range));
      if (!availabilityRangesDoNotOverlap(ranges)) {
        throw new BadRequestException('Availability ranges must be valid and must not overlap');
      }
      const removedRanges = this.getRemovedAvailabilityRanges(
        room.availabilityRanges ?? [],
        ranges,
      );
      await this.assertNoActiveReservationOverlap(
        room._id.toString(),
        removedRanges,
        'Availability cannot be removed when it overlaps an active reservation',
      );
      room.availabilityRanges = ranges;
    }

    if (dto.blockedRanges !== undefined) {
      const ranges = dto.blockedRanges.map((range) => this.toDateRange(range));
      if (!hasValidRoomRangeDates(ranges)) {
        throw new BadRequestException('Blocked ranges must have valid date ranges');
      }
      await this.assertNoActiveReservationOverlap(
        room._id.toString(),
        ranges,
        'Blocked dates cannot overlap an active reservation',
      );
      room.blockedRanges = ranges;
    }

    await room.save();
    return room;
  }

  async addPhoto(hotelId: string, file: Express.Multer.File, user: JwtUser) {
    const hotel = await this.findOwnedHotel(hotelId, user);
    if ((hotel.photos ?? []).length >= 5) {
      throw new ConflictException('A hotel can have at most 5 photos');
    }

    const uploaded = await this.uploadsService.saveImage(file);
    try {
      const updated = await this.hotelModel
        .findOneAndUpdate(
          { _id: hotelId, 'photos.4': { $exists: false } },
          { $push: { photos: uploaded } },
          { new: true, runValidators: true },
        )
        .populate('cityId countryId')
        .exec();
      if (!updated) {
        throw new ConflictException('A hotel can have at most 5 photos');
      }
      return updated;
    } catch (error) {
      await this.uploadsService.deleteImage(uploaded.id);
      throw error;
    }
  }

  async removePhoto(hotelId: string, photoId: string, user: JwtUser) {
    const hotel = await this.findOwnedHotel(hotelId, user);
    const photoExists = (hotel.photos ?? []).some((photo) => photo.id === photoId);
    if (!photoExists) throw new NotFoundException('Hotel photo not found');

    const updated = await this.hotelModel
      .findOneAndUpdate(
        { _id: hotelId, 'photos.id': photoId },
        { $pull: { photos: { id: photoId } } },
        { new: true, runValidators: true },
      )
      .populate('cityId countryId')
      .exec();
    if (!updated) throw new NotFoundException('Hotel photo not found');

    await this.uploadsService.deleteImage(photoId);
    return updated;
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

  private async findRoomInHotel(hotelId: string, roomId: string) {
    const room = await this.roomModel.findOne({ _id: roomId, hotelId }).exec();
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  private toDateRange(range: RoomDateRangeDto): RoomDateRange {
    const startDate = this.toUtcDate(range.startDate);
    const endDate = this.toUtcDate(range.endDate);
    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('endDate must be the same as or after startDate');
    }
    return { startDate, endDate } as RoomDateRange;
  }

  private async assertNoActiveReservationOverlap(
    roomId: string,
    ranges: RoomDateRange[],
    message: string,
  ): Promise<void> {
    for (const range of ranges) {
      if (
        await this.hotelBookingsService.hasActiveReservationOverlap(
          roomId,
          range.startDate,
          this.addUtcDays(range.endDate, 1),
        )
      ) {
        throw new ConflictException(message);
      }
    }
  }

  private getRemovedAvailabilityRanges(
    currentRanges: RoomDateRange[],
    nextRanges: RoomDateRange[],
  ): RoomDateRange[] {
    const removedRanges: RoomDateRange[] = [];
    for (const current of currentRanges) {
      let remaining: RoomDateRange[] = [
        { startDate: new Date(current.startDate), endDate: new Date(current.endDate) },
      ];
      for (const next of nextRanges) {
        remaining = remaining.flatMap((segment) => {
          if (
            next.endDate.getTime() < segment.startDate.getTime() ||
            next.startDate.getTime() > segment.endDate.getTime()
          ) {
            return [segment];
          }
          const pieces: RoomDateRange[] = [];
          if (next.startDate.getTime() > segment.startDate.getTime()) {
            pieces.push({
              startDate: segment.startDate,
              endDate: this.addUtcDays(next.startDate, -1),
            });
          }
          if (next.endDate.getTime() < segment.endDate.getTime()) {
            pieces.push({
              startDate: this.addUtcDays(next.endDate, 1),
              endDate: segment.endDate,
            });
          }
          return pieces;
        });
      }
      removedRanges.push(...remaining);
    }
    return removedRanges;
  }

  private addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private toUtcDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Dates must use YYYY-MM-DD format');
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('Date is invalid');
    }
    return date;
  }

  private throwDuplicateRoomName(error: unknown): void {
    if ((error as { code?: number })?.code === 11000) {
      throw new ConflictException('Room name already exists in this hotel');
    }
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

  private async resolveSearchLocation(dto: SearchHotelsDto) {
    const hasCity = Boolean(dto.cityId);
    const hasCountry = Boolean(dto.countryId);
    if (hasCity === hasCountry) {
      throw new BadRequestException('Provide exactly one of cityId or countryId');
    }
    try {
      if (dto.cityId) {
        const city = await this.referenceDataService.findCity(dto.cityId);
        return { cityId: city._id };
      }
      const countryId = dto.countryId;
      if (!countryId) {
        throw new BadRequestException('Provide exactly one of cityId or countryId');
      }
      const country = await this.referenceDataService.findCountry(countryId);
      return { countryId: country._id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('cityId or countryId must exist in reference data');
      }
      throw error;
    }
  }

  private getStay(checkInValue: string, checkOutValue: string) {
    const checkIn = this.toUtcDate(checkInValue);
    const checkOut = this.toUtcDate(checkOutValue);
    if (checkOut.getTime() <= checkIn.getTime()) {
      throw new BadRequestException('checkOut must be after checkIn');
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (checkIn.getTime() < today.getTime()) {
      throw new BadRequestException('checkIn cannot be in the past');
    }

    const nights: Date[] = [];
    for (
      let current = checkIn.getTime();
      current < checkOut.getTime();
      current += 24 * 60 * 60 * 1000
    ) {
      nights.push(new Date(current));
    }
    return { checkIn, checkOut, nights };
  }

  private isRoomAvailableForStay(room: Room, nights: Date[]): boolean {
    const availabilityRanges = room.availabilityRanges ?? [];
    const blockedRanges = room.blockedRanges ?? [];
    return nights.every((night) => {
      const timestamp = night.getTime();
      const isInAvailability = availabilityRanges.some(
        (range) =>
          range.startDate.getTime() <= timestamp &&
          timestamp <= range.endDate.getTime(),
      );
      const isBlocked = blockedRanges.some(
        (range) =>
          range.startDate.getTime() <= timestamp &&
          timestamp <= range.endDate.getTime(),
      );
      return isInAvailability && !isBlocked;
    });
  }

  private getFeasibleRooms(
    availableRooms: Room[],
    roomsRequired: number,
    guests: number,
  ): Room[] {
    return availableRooms.filter((candidate, index) => {
      const otherOccupancies = availableRooms
        .filter((_, otherIndex) => otherIndex !== index)
        .map((room) => room.maxOccupancy)
        .sort((left, right) => right - left)
        .slice(0, roomsRequired - 1);
      return (
        candidate.maxOccupancy +
          otherOccupancies.reduce((total, occupancy) => total + occupancy, 0) >=
        guests
      );
    });
  }

  private referenceId(reference: Types.ObjectId | { _id: Types.ObjectId } | unknown): string {
    if (reference && typeof reference === 'object' && '_id' in reference) {
      return String((reference as { _id: Types.ObjectId })._id);
    }
    return String(reference);
  }
}
