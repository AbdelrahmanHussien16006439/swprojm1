import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { HotelBooking } from '../hotel-bookings/schemas/hotel-booking.schema';
import { Hotel } from '../hotels/schemas/hotel.schema';
import { FlightBooking } from '../flight-bookings/schemas/flight-booking.schema';
import { Flight } from '../flights/schemas/flight.schema';
import { Airline } from '../airlines/schemas/airline.schema';
import { PAGE_SIZE, toPaginated } from '../../common/utils/pagination';
import { UserStatus } from '../../common/enums/user-status.enum';
import { ListAdminBookingsQueryDto } from './dto/list-admin-bookings-query.dto';

type BookingItem = {
  id: string;
  type: 'flight' | 'hotel';
  bookingReference: string | null;
  user: { id: string; name: string };
  provider: { id: string; name: string };
  dates: unknown;
  amount: number;
  status: string;
  createdAt: Date;
};

@Injectable()
export class AdminBookingsService {
  constructor(
    @InjectModel(FlightBooking.name)
    private readonly flightBookingModel: Model<FlightBooking>,
    @InjectModel(HotelBooking.name)
    private readonly hotelBookingModel: Model<HotelBooking>,
    @InjectModel(Flight.name) private readonly flightModel: Model<Flight>,
    @InjectModel(Airline.name) private readonly airlineModel: Model<Airline>,
    @InjectModel(Hotel.name) private readonly hotelModel: Model<Hotel>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async list(query: ListAdminBookingsQueryDto) {
    const page = query.page ?? 1;
    const take = page * PAGE_SIZE;
    const dateRange = this.getDateRange(query);
    let matchingFlightIds: Types.ObjectId[] | undefined;

    if (query.type !== 'hotel' && dateRange) {
      const flights = await this.flightModel
        .find({ departureTime: dateRange })
        .select({ _id: 1 })
        .lean()
        .exec();
      matchingFlightIds = flights.map((flight) => flight._id as Types.ObjectId);
    }

    const flightFilter: Record<string, unknown> = {};
    const hotelFilter: Record<string, unknown> = {};
    if (query.status) {
      flightFilter.status = query.status;
      hotelFilter.status = query.status;
    }
    if (query.type !== 'hotel' && dateRange) {
      flightFilter['segments.flightId'] = { $in: matchingFlightIds ?? [] };
    }
    if (query.type !== 'flight' && dateRange) hotelFilter.checkIn = dateRange;

    const [flightCount, hotelCount, flights, hotels] = await Promise.all([
      query.type === 'hotel'
        ? Promise.resolve(0)
        : this.flightBookingModel.countDocuments(flightFilter).exec(),
      query.type === 'flight'
        ? Promise.resolve(0)
        : this.hotelBookingModel.countDocuments(hotelFilter).exec(),
      query.type === 'hotel'
        ? Promise.resolve([])
        : this.flightBookingModel
            .find(flightFilter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(take)
            .lean()
            .exec(),
      query.type === 'flight'
        ? Promise.resolve([])
        : this.hotelBookingModel
            .find(hotelFilter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(take)
            .lean()
            .exec(),
    ]);

    const flightIds = [
      ...new Set(
        flights.flatMap((booking) =>
          booking.segments.map((segment) => String(segment.flightId)),
        ),
      ),
    ];
    const airlineIds = [
      ...new Set(flights.map((booking) => String(booking.airlineId))),
    ];
    const hotelIds = [
      ...new Set(hotels.map((booking) => String(booking.hotelId))),
    ];
    const userIds = [
      ...new Set(
        [...flights, ...hotels].map((booking) => String(booking.userId)),
      ),
    ];
    const [flightDocs, airlines, hotelDocs, users] = await Promise.all([
      flightIds.length
        ? this.flightModel
            .find({ _id: { $in: flightIds } })
            .lean()
            .exec()
        : [],
      airlineIds.length
        ? this.airlineModel
            .find({ _id: { $in: airlineIds } })
            .select({ name: 1 })
            .lean()
            .exec()
        : [],
      hotelIds.length
        ? this.hotelModel
            .find({ _id: { $in: hotelIds } })
            .select({ name: 1 })
            .lean()
            .exec()
        : [],
      userIds.length
        ? this.userModel
            .find({ _id: { $in: userIds } })
            .select({ name: 1, status: 1 })
            .lean()
            .exec()
        : [],
    ]);

    const flightById = new Map<string, any>(
      flightDocs.map((flight) => [String(flight._id), flight] as const),
    );
    const airlineById = new Map<string, any>(
      airlines.map((airline) => [String(airline._id), airline] as const),
    );
    const hotelById = new Map<string, any>(
      hotelDocs.map((hotel) => [String(hotel._id), hotel] as const),
    );
    const userById = new Map<string, any>(
      users.map((user) => [String(user._id), user] as const),
    );
    const nameForUser = (id: string) => {
      const user = userById.get(id);
      return user?.status === UserStatus.DEACTIVATED
        ? 'Deleted user'
        : (user?.name ?? 'Unknown user');
    };

    const items: BookingItem[] = [
      ...flights.map((booking) => {
        const userId = String(booking.userId);
        const providerId = String(booking.airlineId);
        return {
          id: String(booking._id),
          type: 'flight' as const,
          bookingReference: booking.bookingReference ?? null,
          user: { id: userId, name: nameForUser(userId) },
          provider: {
            id: providerId,
            name: airlineById.get(providerId)?.name ?? 'Unknown airline',
          },
          dates: booking.segments.map((segment) => {
            const flight = flightById.get(String(segment.flightId));
            return {
              flightId: String(segment.flightId),
              flightNumber: flight?.flightNumber ?? null,
              departureTime: flight?.departureTime ?? null,
              arrivalTime: flight?.arrivalTime ?? null,
            };
          }),
          amount: booking.totalPrice,
          status: booking.status,
          createdAt: booking.createdAt,
        };
      }),
      ...hotels.map((booking) => {
        const userId = String(booking.userId);
        const providerId = String(booking.hotelId);
        return {
          id: String(booking._id),
          type: 'hotel' as const,
          bookingReference: booking.bookingReference ?? null,
          user: { id: userId, name: nameForUser(userId) },
          provider: {
            id: providerId,
            name: hotelById.get(providerId)?.name ?? 'Unknown hotel',
          },
          dates: { checkIn: booking.checkIn, checkOut: booking.checkOut },
          amount: booking.totalPrice,
          status: booking.status,
          createdAt: booking.createdAt,
        };
      }),
    ];
    items.sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        b.id.localeCompare(a.id),
    );
    const start = (page - 1) * PAGE_SIZE;
    return toPaginated(
      items.slice(start, start + PAGE_SIZE),
      flightCount + hotelCount,
      page,
    );
  }

  private getDateRange(
    query: ListAdminBookingsQueryDto,
  ): { $gte: Date; $lt: Date } | undefined {
    if (!query.from && !query.to) return undefined;
    const from = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : undefined;
    const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : undefined;
    if (from && to && from > to)
      throw new BadRequestException('from must be on or before to');
    const range: { $gte?: Date; $lt?: Date } = {};
    if (from) range.$gte = from;
    if (to) {
      const dayAfter = new Date(to);
      dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
      range.$lt = dayAfter;
    }
    return range as { $gte: Date; $lt: Date };
  }
}
