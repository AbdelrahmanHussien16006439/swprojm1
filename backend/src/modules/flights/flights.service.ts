import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AirlinesService } from '../airlines/airlines.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { FlightBookingsService } from '../flight-bookings/flight-bookings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DateTime } from 'luxon';
import { toPaginated } from '../../common/utils/pagination';
import { CabinClass, FlightStatus } from './flights.constants';
import { CreateCabinDto } from './dto/create-cabin.dto';
import { UpdateCabinDto } from './dto/update-cabin.dto';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { FlightSortBy, SearchFlightsDto } from './dto/search-flights.dto';
import { Flight } from './schemas/flight.schema';

@Injectable()
export class FlightsService {
  constructor(
    @InjectModel(Flight.name)
    private readonly flightModel: Model<Flight>,
    private readonly airlinesService: AirlinesService,
    @Optional() private readonly referenceDataService?: ReferenceDataService,
    @Optional() private readonly moduleRef?: ModuleRef,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async findById(id: string): Promise<Flight> {
    const flight = await this.flightModel.findById(id).exec();
    if (!flight) throw new NotFoundException('Flight not found');
    return flight;
  }

  async create(dto: CreateFlightDto, user: JwtUser): Promise<Flight> {
    const airlineId = this.getProviderObjectId(user);
    await this.airlinesService.findById(airlineId.toString());
    const airports = await this.resolveAirports(dto.departureAirportId, dto.arrivalAirportId);
    const times = this.convertTimes(dto.departureTime, dto.arrivalTime, airports.departure.timezone, airports.arrival.timezone);
    if (times.departure <= new Date()) throw new BadRequestException('Departure must not be in the past');
    await this.assertUniqueFlightNumber(airlineId, dto.flightNumber, times.departure, airports.departure.timezone);
    return this.flightModel.create({
      airlineId,
      flightNumber: dto.flightNumber.trim().toUpperCase(),
      departureAirportId: airports.departure._id,
      arrivalAirportId: airports.arrival._id,
      departureTime: times.departure,
      arrivalTime: times.arrival,
      status: FlightStatus.SCHEDULED,
      cabins: [],
    });
  }

  async getDetails(id: string) {
    const flight = await this.findById(id);
    const airline = await this.airlinesService.findById(flight.airlineId.toString());
    return this.toFlightResponse(flight, airline);
  }

  async update(flightId: string, dto: UpdateFlightDto, user: JwtUser): Promise<Flight> {
    const flight = await this.getOwnedScheduledFlight(flightId, user);
    const airportIdsChanged = dto.departureAirportId !== undefined || dto.arrivalAirportId !== undefined;
    const flightBookingsService = this.getFlightBookingsService();
    if (airportIdsChanged && flightBookingsService && await flightBookingsService.hasBookings(flightId)) {
      throw new ConflictException('Airports cannot be changed after a booking exists');
    }
    const departureAirportId = dto.departureAirportId ?? flight.departureAirportId.toString();
    const arrivalAirportId = dto.arrivalAirportId ?? flight.arrivalAirportId.toString();
    const airports = await this.resolveAirports(departureAirportId, arrivalAirportId);
    const departureTime = dto.departureTime ?? this.toLocalIso(flight.departureTime, airports.departure.timezone);
    const arrivalTime = dto.arrivalTime ?? this.toLocalIso(flight.arrivalTime, airports.arrival.timezone);
    const times = this.convertTimes(departureTime, arrivalTime, airports.departure.timezone, airports.arrival.timezone);
    if (times.departure <= new Date()) throw new BadRequestException('Departure must not be in the past');
    if (dto.flightNumber !== undefined || times.departure.getTime() !== flight.departureTime.getTime()) {
      await this.assertUniqueFlightNumber(flight.airlineId, dto.flightNumber ?? flight.flightNumber, times.departure, airports.departure.timezone, flightId);
    }
    const changed = times.departure.getTime() !== flight.departureTime.getTime() || times.arrival.getTime() !== flight.arrivalTime.getTime();
    const updated = await this.flightModel.findOneAndUpdate(
      { _id: flightId, status: FlightStatus.SCHEDULED, airlineId: this.getProviderObjectId(user) },
      { $set: { flightNumber: (dto.flightNumber ?? flight.flightNumber).trim().toUpperCase(), departureAirportId: airports.departure._id, arrivalAirportId: airports.arrival._id, departureTime: times.departure, arrivalTime: times.arrival } },
      { new: true, runValidators: true },
    ).exec();
    if (!updated) throw new NotFoundException('Flight not found');
    if (changed && flightBookingsService && this.notificationsService) {
      const userIds = await flightBookingsService.findConfirmedUserIdsForFlight(flightId);
      await this.notificationsService.notifyMany(userIds, 'FLIGHT_SCHEDULE_CHANGED', `Flight ${updated.flightNumber} schedule changed`, `/flights/${flightId}`);
    }
    return updated;
  }

  async cancel(flightId: string, user: JwtUser): Promise<Flight> {
    await this.getOwnedScheduledFlight(flightId, user);
    const flightBookingsService = this.getFlightBookingsService();
    const updated = await this.flightModel.findOneAndUpdate(
      { _id: flightId, status: FlightStatus.SCHEDULED, airlineId: this.getProviderObjectId(user) },
      { $set: { status: FlightStatus.CANCELLED } },
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundException('Flight not found');
    if (flightBookingsService) await flightBookingsService.cancelAllForFlight(flightId);
    return updated;
  }

  async search(dto: SearchFlightsDto) {
    if (dto.minPrice !== undefined && dto.maxPrice !== undefined && dto.minPrice > dto.maxPrice) {
      throw new BadRequestException('minPrice must not be greater than maxPrice');
    }
    const seats = dto.adults + dto.children;
    const outbound = await this.searchOne(dto, dto.fromAirportId, dto.toAirportIds, dto.departDate, seats);
    if (!dto.returnDate) return outbound;
    const fromAirport = dto.fromAirportId ? await this.getAirport(dto.fromAirportId) : undefined;
    const toAirportIds = dto.toAirportIds?.length ? dto.toAirportIds : (fromAirport ? [fromAirport._id.toString()] : undefined);
    const returnResults = await this.searchOne(dto, toAirportIds?.[0], dto.fromAirportId ? [dto.fromAirportId] : toAirportIds, dto.returnDate, seats);
    return { outbound: outbound.data, return: returnResults.data, page: outbound.page, limit: outbound.limit, total: outbound.total, totalPages: outbound.totalPages };
  }

  private async searchOne(dto: SearchFlightsDto, fromId?: string, toIds?: string[], date?: string, seats = 0) {
    let filter: Record<string, unknown> = { status: FlightStatus.SCHEDULED };
    if (fromId) filter.departureAirportId = new Types.ObjectId(fromId);
    if (toIds?.length) filter.arrivalAirportId = { $in: toIds.map((id) => new Types.ObjectId(id)) };
    if (date && fromId) {
      const airport = await this.getAirport(fromId);
      const start = DateTime.fromISO(date, { zone: airport.timezone }).startOf('day');
      if (!start.isValid) throw new BadRequestException('Invalid search date');
      filter.departureTime = { $gte: start.toUTC().toJSDate(), $lt: start.plus({ days: 1 }).toUTC().toJSDate() };
    }
    const flights = await this.flightModel.find(filter).exec();
    const results: Array<{
      cabins: Array<{ price: number }>;
      durationMinutes: number;
      departureTimeUtc: string;
      [key: string]: unknown;
    }> = [];
    for (const flight of flights) {
      const airline = await this.airlinesService.findById(flight.airlineId.toString());
      if (!airline.isActive) continue;
      const cabins = flight.cabins.filter((cabin) => (!dto.cabinClass || cabin.cabinClass === dto.cabinClass) && cabin.availableSeats >= seats && (dto.minPrice === undefined || cabin.price >= dto.minPrice) && (dto.maxPrice === undefined || cabin.price <= dto.maxPrice));
      if (!cabins.length) continue;
      results.push(await this.toFlightResponse(flight, airline, cabins));
    }
    results.sort((a, b) => dto.sortBy === FlightSortBy.PRICE ? a.cabins[0].price - b.cabins[0].price : dto.sortBy === FlightSortBy.DURATION ? a.durationMinutes - b.durationMinutes : new Date(a.departureTimeUtc).getTime() - new Date(b.departureTimeUtc).getTime());
    const page = Math.max(1, dto.page);
    return toPaginated(results.slice((page - 1) * 10, page * 10), results.length, page);
  }

  private async resolveAirports(departureId: string, arrivalId: string) {
    if (departureId === arrivalId) throw new BadRequestException('Departure and arrival airports must differ');
    const [departure, arrival] = await Promise.all([this.getAirport(departureId), this.getAirport(arrivalId)]);
    if (departure._id.equals(arrival._id)) throw new BadRequestException('Departure and arrival airports must differ');
    return { departure, arrival };
  }

  private async getAirport(id: string) {
    if (!this.referenceDataService) throw new NotFoundException('Reference data service is unavailable');
    return this.referenceDataService.findAirport(id);
  }

  private convertTimes(departure: string, arrival: string, departureZone: string, arrivalZone: string) {
    const departureDate = DateTime.fromISO(departure, { zone: departureZone });
    const arrivalDate = DateTime.fromISO(arrival, { zone: arrivalZone });
    if (!departureDate.isValid || !arrivalDate.isValid) throw new BadRequestException('Flight times must be valid local ISO date-times');
    const departureUtc = departureDate.toUTC().toJSDate();
    const arrivalUtc = arrivalDate.toUTC().toJSDate();
    if (arrivalUtc <= departureUtc) throw new BadRequestException('Arrival must be after departure');
    return { departure: departureUtc, arrival: arrivalUtc };
  }

  private async assertUniqueFlightNumber(airlineId: Types.ObjectId, flightNumber: string, departure: Date, timezone: string, excludeId?: string) {
    const localDate = DateTime.fromJSDate(departure, { zone: timezone });
    const query: Record<string, unknown> = { airlineId, flightNumber: flightNumber.trim().toUpperCase(), departureTime: { $gte: localDate.startOf('day').toUTC().toJSDate(), $lt: localDate.plus({ days: 1 }).startOf('day').toUTC().toJSDate() } };
    if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };
    if (await this.flightModel.findOne(query).exec()) throw new ConflictException('Flight number already exists for this airline on this date');
  }

  private toLocalIso(date: Date, timezone: string) { return DateTime.fromJSDate(date).setZone(timezone).toISO({ includeOffset: false }) as string; }

  private async toFlightResponse(flight: Flight, airline?: { name: string; code: string; cancellationTiers: unknown[] }, selectedCabins = flight.cabins) {
    const departureAirport = await this.getAirport(flight.departureAirportId.toString());
    const arrivalAirport = await this.getAirport(flight.arrivalAirportId.toString());
    const departureLocal = DateTime.fromJSDate(flight.departureTime).setZone(departureAirport.timezone);
    const arrivalLocal = DateTime.fromJSDate(flight.arrivalTime).setZone(arrivalAirport.timezone);
    const result = { id: (flight as Flight & { _id: Types.ObjectId })._id.toString(), airline: airline ? { id: flight.airlineId.toString(), name: airline.name, code: airline.code } : undefined, flightNumber: flight.flightNumber, departureAirport, arrivalAirport, departureTimeUtc: flight.departureTime.toISOString(), arrivalTimeUtc: flight.arrivalTime.toISOString(), departureTimeLocal: departureLocal.toISO(), arrivalTimeLocal: arrivalLocal.toISO(), durationMinutes: Math.round((flight.arrivalTime.getTime() - flight.departureTime.getTime()) / 60000), cabins: selectedCabins.map((cabin) => ({ id: (cabin as typeof cabin & { _id: Types.ObjectId })._id?.toString(), cabinClass: cabin.cabinClass, price: cabin.price, seatsRemaining: cabin.availableSeats, freeBags: cabin.freeBags, maxBagWeightKg: cabin.maxBagWeightKg })), cancellationPolicy: airline?.cancellationTiers };
    return result;
  }

  /** FLT-30: every minute, only scheduled flights past departure become departed. */
  @Cron(CronExpression.EVERY_MINUTE)
  async markDepartedFlights(): Promise<void> {
    await this.flightModel
      .updateMany(
        {
          status: FlightStatus.SCHEDULED,
          departureTime: { $lte: new Date() },
        },
        { $set: { status: FlightStatus.DEPARTED } },
      )
      .exec();
  }

  async addCabin(
    flightId: string,
    dto: CreateCabinDto,
    user: JwtUser,
  ): Promise<Flight> {
    const airlineObjectId = this.getProviderObjectId(user);
    const flight = await this.getOwnedScheduledFlight(flightId, user);
    if (flight.cabins.some((cabin) => cabin.cabinClass === dto.cabinClass)) {
      throw new ConflictException('This cabin class already exists on the flight');
    }

    const updated = await this.flightModel
      .findOneAndUpdate(
        {
          _id: flightId,
          status: FlightStatus.SCHEDULED,
          airlineId: airlineObjectId,
          // Keep the duplicate-class check inside the atomic update filter.
          $expr: {
            $eq: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$cabins', []] },
                    as: 'cabin',
                    cond: { $eq: ['$$cabin.cabinClass', dto.cabinClass] },
                  },
                },
              },
              0,
            ],
          },
        },
        {
          $push: {
            cabins: {
              cabinClass: dto.cabinClass,
              price: dto.price,
              totalSeats: dto.totalSeats,
              availableSeats: dto.totalSeats,
              heldSeats: 0,
              bookedSeats: 0,
              freeBags: dto.freeBags,
              maxBagWeightKg: dto.maxBagWeightKg,
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Cabin could not be added');
    return updated;
  }

  async updateCabin(
    flightId: string,
    cabinId: string,
    dto: UpdateCabinDto,
    user: JwtUser,
  ): Promise<Flight> {
    const airlineObjectId = this.getProviderObjectId(user);
    await this.getOwnedScheduledFlight(flightId, user);
    const cabinObjectId = new Types.ObjectId(cabinId);

    if (dto.totalSeats !== undefined) {
      const capacityFilter = {
        _id: flightId,
        status: FlightStatus.SCHEDULED,
        airlineId: airlineObjectId,
        $expr: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$cabins',
                  as: 'cabin',
                  cond: {
                    $and: [
                      { $eq: ['$$cabin._id', cabinObjectId] },
                      {
                        $gte: [
                          dto.totalSeats,
                          { $add: ['$$cabin.bookedSeats', '$$cabin.heldSeats'] },
                        ],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
      };
      const updated = await this.flightModel
        .findOneAndUpdate(
          capacityFilter,
          [
            {
              $set: {
                cabins: {
                  $map: {
                    input: '$cabins',
                    as: 'cabin',
                    in: {
                      $cond: [
                        { $eq: ['$$cabin._id', cabinObjectId] },
                        {
                          $mergeObjects: [
                            '$$cabin',
                            {
                              ...(dto.price !== undefined ? { price: dto.price } : {}),
                              totalSeats: dto.totalSeats,
                              availableSeats: {
                                $subtract: [
                                  dto.totalSeats,
                                  { $add: ['$$cabin.bookedSeats', '$$cabin.heldSeats'] },
                                ],
                              },
                            },
                          ],
                        },
                        '$$cabin',
                      ],
                    },
                  },
                },
              },
            },
          ],
          { new: true },
        )
        .exec();
      if (!updated) {
        throw new BadRequestException(
          'Seat count cannot be below booked plus held seats, or cabin was not found',
        );
      }
      return updated;
    }

    if (dto.price === undefined) {
      throw new BadRequestException('At least one cabin field must be provided');
    }
    const updated = await this.flightModel
      .findOneAndUpdate(
        {
          _id: flightId,
          status: FlightStatus.SCHEDULED,
          airlineId: airlineObjectId,
          'cabins._id': cabinObjectId,
        },
        { $set: { 'cabins.$.price': dto.price } },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Cabin not found');
    return updated;
  }

  private async getOwnedScheduledFlight(
    flightId: string,
    user: JwtUser,
  ): Promise<Flight> {
    const providerObjectId = this.getProviderObjectId(user);
    const flight = await this.findById(flightId);
    await this.airlinesService.findById(flight.airlineId.toString());
    if (!flight.airlineId.equals(providerObjectId)) {
      throw new NotFoundException('Flight not found');
    }
    if (flight.status !== FlightStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled flights can be edited');
    }
    return flight;
  }

  private getProviderObjectId(user: JwtUser): Types.ObjectId {
    if (!user.providerId || !Types.ObjectId.isValid(user.providerId)) {
      throw new NotFoundException('Flight not found');
    }
    return new Types.ObjectId(user.providerId);
  }

  private getFlightBookingsService(): FlightBookingsService | undefined {
    return this.moduleRef?.get<FlightBookingsService>('FlightBookingsService', { strict: false });
  }
}
