import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Connection, HydratedDocument, Model, Types } from 'mongoose';
import { paginate } from '../../common/utils/pagination';
import { Hotel } from '../hotels/schemas/hotel.schema';
import { Room } from '../hotels/schemas/room.schema';
import { HotelsService } from '../hotels/hotels.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Payment } from '../payments/schemas/payment.schema';
import { Refund } from '../payments/schemas/refund.schema';
import { PaymentsService } from '../payments/payments.service';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { UsersService } from '../users/users.service';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { HotelModeratorReservationsQueryDto } from './dto/hotel-moderator-reservations-query.dto';
import { MyHotelBookingsQueryDto } from './dto/my-hotel-bookings-query.dto';
import { HOTEL_BOOKING_HOLD_MINUTES } from './hotel-bookings.constants';
import { HotelBooking } from './schemas/hotel-booking.schema';
import { RoomNight } from './schemas/room-night.schema';

@Injectable()
export class HotelBookingsService {
  private readonly logger = new Logger(HotelBookingsService.name);

  constructor(
    @InjectModel(HotelBooking.name)
    private readonly hotelBookingModel: Model<HotelBooking>,
    @InjectModel(RoomNight.name)
    private readonly roomNightModel: Model<RoomNight>,
    @InjectModel(Hotel.name)
    private readonly hotelModel: Model<Hotel>,
    @InjectModel(Room.name)
    private readonly roomModel: Model<Room>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
    @InjectModel(Refund.name)
    private readonly refundModel: Model<Refund>,
    @InjectConnection() private readonly connection: Connection,
    private readonly hotelsService: HotelsService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  /** HTL-16 / HTL-18: hold every requested room-night in one transaction. */
  async createHold(dto: CreateHotelBookingDto, userId: string) {
    const { checkIn, checkOut, nights } = this.validateStay(
      dto.checkIn,
      dto.checkOut,
    );
    if (!Array.isArray(dto.rooms) || dto.rooms.length === 0) {
      throw new BadRequestException('At least one room is required');
    }
    for (const room of dto.rooms) {
      if (!Number.isInteger(room.adults) || room.adults < 0) {
        throw new BadRequestException(
          'adults must be a whole number of at least zero',
        );
      }
      const children = room.childrenAges ?? [];
      if (
        !Array.isArray(children) ||
        children.some((age) => !Number.isInteger(age) || age < 0 || age > 17)
      ) {
        throw new BadRequestException(
          'childrenAges must contain ages from 0 through 17',
        );
      }
    }
    const roomIds = dto.rooms.map((room) => room.roomId);
    if (new Set(roomIds).size !== roomIds.length) {
      throw new BadRequestException(
        'A room may appear only once in a reservation',
      );
    }
    const totalAdults = dto.rooms.reduce(
      (total, room) => total + room.adults,
      0,
    );
    if (totalAdults < 1) {
      throw new BadRequestException(
        'At least one adult is required per reservation',
      );
    }

    const session = await this.connection.startSession();
    const now = new Date();
    const holdExpiresAt = new Date(
      now.getTime() + HOTEL_BOOKING_HOLD_MINUTES * 60 * 1000,
    );
    let createdBooking: HydratedDocument<HotelBooking> | undefined;
    let hotelForResponse: HydratedDocument<Hotel> | undefined;

    try {
      await session.withTransaction(async () => {
        const hotel = await this.hotelModel
          .findById(dto.hotelId)
          .session(session)
          .exec();
        if (!hotel) throw new NotFoundException('Hotel not found');
        if (!hotel.isActive) {
          throw new ConflictException(
            'This hotel is not accepting reservations',
          );
        }

        const rooms = await this.roomModel
          .find({
            _id: { $in: roomIds.map((id) => new Types.ObjectId(id)) },
            hotelId: new Types.ObjectId(dto.hotelId),
          })
          .session(session)
          .exec();
        if (rooms.length !== roomIds.length) {
          throw new NotFoundException(
            'One or more rooms were not found in this hotel',
          );
        }
        const roomsById = new Map(
          rooms.map((room) => [room._id.toString(), room]),
        );
        const bookingRooms = dto.rooms.map((requestedRoom) => {
          const room = roomsById.get(requestedRoom.roomId);
          if (!room) throw new NotFoundException('Room not found');
          if (!room.isActive) {
            throw new ConflictException('One or more rooms are not available');
          }
          const children = requestedRoom.childrenAges ?? [];
          const guestCount = requestedRoom.adults + children.length;
          if (guestCount > room.maxOccupancy) {
            throw new BadRequestException(
              `Room ${room.name} exceeds its maximum occupancy of ${room.maxOccupancy}`,
            );
          }
          this.assertRoomDateAvailability(room, nights);
          return {
            roomId: room._id,
            roomName: room.name,
            pricePerNight: room.pricePerNight,
            adults: requestedRoom.adults,
            children,
          };
        });

        // Expired holds are cleaned up in the same transaction as the new hold.
        await this.roomNightModel
          .deleteMany({
            roomId: { $in: roomIds.map((id) => new Types.ObjectId(id)) },
            date: { $gte: checkIn, $lt: checkOut },
            holdExpiresAt: { $lt: now },
          })
          .session(session)
          .exec();

        const totalPrice = bookingRooms.reduce(
          (total, room) => total + room.pricePerNight * nights.length,
          0,
        );
        const [booking] = await this.hotelBookingModel.create(
          [
            {
              userId: new Types.ObjectId(userId),
              hotelId: hotel._id,
              rooms: bookingRooms,
              checkIn,
              checkOut,
              nights: nights.length,
              totalPrice,
              status: 'pending_payment',
              holdExpiresAt,
            },
          ],
          { session },
        );
        const roomNights = bookingRooms.flatMap((room) =>
          nights.map((date) => ({
            roomId: room.roomId,
            hotelId: hotel._id,
            date,
            hotelBookingId: booking._id,
            holdExpiresAt,
          })),
        );
        // The unique { roomId, date } index arbitrates concurrent holds atomically.
        await this.roomNightModel.insertMany(roomNights, { session });
        createdBooking = booking;
        hotelForResponse = hotel;
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'One or more rooms are no longer available',
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }

    if (!createdBooking || !hotelForResponse) {
      throw new ConflictException('The reservation could not be held');
    }
    return {
      id: createdBooking._id.toString(),
      hotelId: hotelForResponse._id.toString(),
      hotelName: hotelForResponse.name,
      rooms: createdBooking.rooms.map((room) => ({
        roomId: room.roomId.toString(),
        roomName: room.roomName,
        adults: room.adults,
        children: room.children,
        pricePerNight: room.pricePerNight,
      })),
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      nights: createdBooking.nights,
      totalPrice: createdBooking.totalPrice,
      status: createdBooking.status,
      holdExpiresAt: createdBooking.holdExpiresAt,
      checkInTime: hotelForResponse.checkInTime ?? null,
      checkOutTime: hotelForResponse.checkOutTime ?? null,
      policies: this.hotelPolicySnapshot(hotelForResponse),
    };
  }

  /** PAY-01 / PAY-02 callback used by Member 4's booking-policy route. */
  async getPolicies(bookingId: string, userId: string) {
    const booking = await this.findOwnedBooking(bookingId, userId);
    this.assertPendingAndUnexpired(booking);
    const hotel = await this.hotelsService.findById(booking.hotelId.toString());
    const policies = this.hotelPolicySnapshot(hotel);
    return {
      bookingType: 'hotel' as const,
      cancellationTiers: policies.cancellationTiers,
      checkInTime: policies.checkInTime,
      checkOutTime: policies.checkOutTime,
    };
  }

  async acceptPolicies(bookingId: string, userId: string) {
    const booking = await this.findOwnedBooking(bookingId, userId);
    this.assertPendingAndUnexpired(booking);
    const hotel = await this.hotelsService.findById(booking.hotelId.toString());
    const policyAcceptance = {
      acceptedAt: new Date(),
      policySnapshot: this.hotelPolicySnapshot(hotel),
    };
    const accepted = await this.hotelBookingModel
      .findOneAndUpdate(
        {
          _id: booking._id,
          userId: new Types.ObjectId(userId),
          status: 'pending_payment',
          holdExpiresAt: { $gt: new Date() },
        },
        { $set: { policyAcceptance } },
        { new: true, runValidators: true },
      )
      .exec();
    if (!accepted) {
      throw new BadRequestException('Hotel booking hold has expired');
    }
    return accepted;
  }

  async getAmountForPayment(
    bookingId: string,
    userId: string,
  ): Promise<number> {
    const booking = await this.findOwnedBooking(bookingId, userId);
    this.assertPendingAndUnexpired(booking);
    if (!booking.policyAcceptance) {
      throw new BadRequestException('Accept the hotel policies before payment');
    }
    return booking.totalPrice;
  }

  /** HTL-20: return the caller's paginated reservation summaries. */
  async findMine(userId: string, query: MyHotelBookingsQueryDto) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (query.group === 'upcoming') filter.status = 'confirmed';
    if (query.group === 'past') filter.status = 'completed';
    if (query.group === 'cancelled') filter.status = 'cancelled';

    const result = await paginate(this.hotelBookingModel, filter, query.page, {
      sort: { createdAt: -1, _id: -1 },
      populate: 'hotelId',
    });
    return {
      ...result,
      data: result.data.map((booking) => this.toReservationSummary(booking)),
    };
  }

  /** HTL-22: hotel moderators can view reservations for their own hotel only. */
  async findForModerator(
    hotelId: string,
    user: JwtUser,
    query: HotelModeratorReservationsQueryDto,
  ) {
    if (!user.providerId || user.providerId !== hotelId) {
      throw new NotFoundException('Hotel not found');
    }
    const filter: Record<string, unknown> = {
      hotelId: new Types.ObjectId(hotelId),
    };
    if (query.status) filter.status = query.status;

    const checkIn: Record<string, Date> = {};
    const from = query.from
      ? this.parseCalendarDate(query.from, 'from')
      : undefined;
    const to = query.to ? this.parseCalendarDate(query.to, 'to') : undefined;
    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException('from must be on or before to');
    }
    if (from) checkIn.$gte = from;
    if (to) {
      const exclusiveUpperBound = new Date(to);
      exclusiveUpperBound.setUTCDate(exclusiveUpperBound.getUTCDate() + 1);
      checkIn.$lt = exclusiveUpperBound;
    }
    if (Object.keys(checkIn).length > 0) filter.checkIn = checkIn;

    const result = await paginate(this.hotelBookingModel, filter, query.page, {
      sort: { checkIn: 1, createdAt: -1 },
    });
    const data = await Promise.all(
      result.data.map(async (booking) => {
        const document = booking as HotelBooking & { _id: Types.ObjectId };
        const guest = await this.usersService.findPublicProfile(
          booking.userId.toString(),
        );
        return {
          id: document._id.toString(),
          bookingReference: booking.bookingReference ?? null,
          guest: { id: guest.id, name: guest.name },
          rooms: booking.rooms.map((room) => ({
            roomName: room.roomName,
            adults: room.adults,
            children: room.children,
            guests: room.adults + room.children.length,
          })),
          checkIn: this.toDateLabel(booking.checkIn),
          checkOut: this.toDateLabel(booking.checkOut),
          status: booking.status,
          totalPrice: booking.totalPrice,
          createdAt: booking.createdAt,
        };
      }),
    );
    return { ...result, data };
  }

  /** HTL-20: load complete details, hiding bookings owned by another user. */
  async getMine(bookingId: string, userId: string) {
    const booking = await this.hotelBookingModel
      .findOne({
        _id: new Types.ObjectId(bookingId),
        userId: new Types.ObjectId(userId),
      })
      .populate('hotelId')
      .exec();
    if (!booking) throw new NotFoundException('Hotel booking not found');

    const paymentDetails = await this.getPaymentDetails(booking, userId);
    const bookingData = booking.toObject() as unknown as Record<
      string,
      unknown
    >;
    delete bookingData.hotelId;
    return {
      ...bookingData,
      bookingReference: booking.bookingReference ?? null,
      hotelId: this.toHotelSummary(booking.hotelId).id,
      hotel: this.toHotelSummary(booking.hotelId),
      rooms: booking.rooms.map((room) => ({
        roomId: room.roomId.toString(),
        roomName: room.roomName,
        adults: room.adults,
        children: room.children,
        guests: room.adults + room.children.length,
        pricePerNight: room.pricePerNight,
      })),
      payment: paymentDetails.payment,
      refund: paymentDetails.refund,
    };
  }

  /** HTL-21: calculate the whole-reservation refund from accepted policy tiers. */
  async getRefundPreview(bookingId: string, userId: string) {
    const booking = await this.findOwnedBooking(bookingId, userId);
    return this.calculateHotelRefundPreview(booking);
  }

  /** HTL-21: cancel the entire confirmed reservation and release all nights. */
  async cancelBooking(bookingId: string, userId: string, confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException('Cancellation must be confirmed');
    }
    const booking = await this.findOwnedBooking(bookingId, userId);
    const refundPreview = this.calculateHotelRefundPreview(booking);
    let refundPaymentId: Types.ObjectId | undefined;

    if (refundPreview.refundAmount > 0) {
      const payment = booking.paymentId
        ? await this.paymentModel
            .findOne({
              _id: booking.paymentId,
              bookingType: 'hotel',
              bookingId: (booking as HotelBooking & { _id: Types.ObjectId })
                ._id,
              userId: new Types.ObjectId(userId),
              status: 'succeeded',
            })
            .exec()
        : await this.paymentModel
            .findOne({
              bookingType: 'hotel',
              bookingId: (booking as HotelBooking & { _id: Types.ObjectId })
                ._id,
              userId: new Types.ObjectId(userId),
              status: 'succeeded',
            })
            .sort({ createdAt: -1 })
            .exec();
      if (!payment) {
        throw new ConflictException(
          'The booking has no successful payment to refund',
        );
      }
      refundPaymentId = payment._id;
    }

    const session = await this.connection.startSession();
    const cancellation: { booking?: HydratedDocument<HotelBooking> } = {};
    try {
      await session.withTransaction(async () => {
        const today = this.utcToday();
        const cancelled = await this.hotelBookingModel
          .findOneAndUpdate(
            {
              _id: (booking as HotelBooking & { _id: Types.ObjectId })._id,
              userId: new Types.ObjectId(userId),
              status: 'confirmed',
              checkIn: { $gt: today },
            },
            { $set: { status: 'cancelled', cancelledBy: 'user' } },
            { new: true },
          )
          .session(session)
          .exec();
        if (!cancelled) {
          throw new BadRequestException(
            'Booking is no longer confirmed or is on/after check-in date',
          );
        }
        cancellation.booking = cancelled;
        await this.roomNightModel
          .deleteMany({ hotelBookingId: cancelled._id })
          .session(session)
          .exec();
      });
    } finally {
      await session.endSession();
    }
    const cancelled = cancellation.booking;
    if (!cancelled) {
      throw new ConflictException('The reservation could not be cancelled');
    }

    let refund: Refund | null = null;
    if (refundPreview.refundAmount > 0 && refundPaymentId) {
      refund = await this.paymentsService.createRefund(
        refundPaymentId.toString(),
        refundPreview.refundAmount,
        refundPreview.refundPercent,
        'User hotel booking cancellation',
      );
      const refundId = (refund as Refund & { _id?: Types.ObjectId })._id;
      if (refundId) {
        cancelled.refundId = refundId;
        await this.hotelBookingModel
          .updateOne(
            { _id: cancelled._id, status: 'cancelled' },
            { $set: { refundId } },
          )
          .exec();
      }
    }

    await this.notificationsService.notify(
      userId,
      'BOOKING_CANCELLED',
      `Your hotel reservation ${cancelled.bookingReference ?? cancelled._id.toString()} has been cancelled.`,
      `/hotel-bookings/${cancelled._id.toString()}`,
    );
    if (refund) {
      await this.notificationsService.notify(
        userId,
        'REFUND_CREATED',
        `A refund of ${refundPreview.refundAmount} ${this.paymentsService.getPlatformCurrency()} for hotel reservation ${cancelled.bookingReference ?? cancelled._id.toString()} is ${refund.status}.`,
        `/hotel-bookings/${cancelled._id.toString()}`,
      );
    }

    return { booking: cancelled, refund, refundPreview };
  }

  /**
   * Called after Stripe webhook verification. TODO (Member 4): dispatch hotel
   * payments here; PaymentsService currently implements flight dispatch only.
   */
  async onPaymentSucceeded(bookingId: string): Promise<void> {
    const session = await this.connection.startSession();
    const now = new Date();
    const confirmation: { booking?: HydratedDocument<HotelBooking> } = {};
    try {
      await session.withTransaction(async () => {
        const booking = await this.hotelBookingModel
          .findOne({
            _id: bookingId,
            status: 'pending_payment',
            holdExpiresAt: { $gt: now },
          })
          .session(session)
          .exec();
        if (!booking) return;
        const payment = await this.paymentModel
          .findOne({
            bookingType: 'hotel',
            bookingId: booking._id,
            status: 'succeeded',
          })
          .session(session)
          .sort({ createdAt: -1 })
          .exec();
        if (!payment) return;

        booking.status = 'confirmed';
        booking.bookingReference = this.generateBookingReference();
        booking.paymentId = payment._id;
        await booking.save({ session });
        await this.roomNightModel
          .updateMany(
            { hotelBookingId: booking._id },
            {
              $set: {
                holdExpiresAt: null,
                bookingReference: booking.bookingReference,
              },
            },
            { session },
          )
          .exec();
        confirmation.booking = booking;
      });
    } finally {
      await session.endSession();
    }

    const confirmed = confirmation.booking;
    if (!confirmed) return;
    const roomIds = confirmed.rooms.map((room) => room.roomId.toString());
    await this.hotelsService.markRoomsReserved(roomIds);
    const hotel = await this.hotelsService.findById(
      confirmed.hotelId.toString(),
    );
    const reference = confirmed.bookingReference!;
    await this.notificationsService.notify(
      confirmed.userId.toString(),
      'BOOKING_CONFIRMED',
      `Your hotel reservation ${reference} at ${hotel.name} is confirmed for ${this.toDateLabel(confirmed.checkIn)} to ${this.toDateLabel(confirmed.checkOut)}.`,
      `/hotel-bookings/${confirmed._id.toString()}`,
    );
  }

  /** HTL-18: expire holds, release their room-nights, and cancel their intents. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expirePendingHolds(): Promise<void> {
    const now = new Date();
    const expiredCandidates = await this.hotelBookingModel
      .find({ status: 'pending_payment', holdExpiresAt: { $lte: now } })
      .exec();

    for (const candidate of expiredCandidates) {
      const expired = await this.hotelBookingModel
        .findOneAndUpdate(
          {
            _id: candidate._id,
            status: 'pending_payment',
            holdExpiresAt: { $lte: now },
          },
          { $set: { status: 'expired' } },
          { new: true },
        )
        .exec();
      if (!expired) continue;

      await this.roomNightModel
        .deleteMany({ hotelBookingId: expired._id })
        .exec();
      try {
        const payments = await this.paymentModel
          .find({
            bookingType: 'hotel',
            bookingId: expired._id,
            status: { $in: ['pending', 'failed'] },
          })
          .exec();
        for (const payment of payments) {
          await this.paymentsService.cancelPayment(payment._id.toString());
        }
      } catch (error) {
        this.logger.error(
          `Could not cancel payment for expired hotel booking ${expired._id.toString()}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

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

  private toReservationSummary(booking: HotelBooking) {
    const document = booking as HotelBooking & { _id: Types.ObjectId };
    return {
      id: document._id.toString(),
      bookingReference: booking.bookingReference ?? null,
      hotelId: this.toHotelSummary(booking.hotelId).id,
      hotel: this.toHotelSummary(booking.hotelId),
      rooms: booking.rooms.map((room) => ({
        roomId: room.roomId.toString(),
        roomName: room.roomName,
        adults: room.adults,
        children: room.children,
        guests: room.adults + room.children.length,
        pricePerNight: room.pricePerNight,
      })),
      checkIn: this.toDateLabel(booking.checkIn),
      checkOut: this.toDateLabel(booking.checkOut),
      nights: booking.nights,
      totalPrice: booking.totalPrice,
      status: booking.status,
      createdAt: booking.createdAt,
    };
  }

  private toHotelSummary(value: unknown) {
    const hotel = value as {
      _id?: Types.ObjectId;
      name?: string;
      address?: string;
      stars?: number;
      cityId?: unknown;
      countryId?: unknown;
    };
    const id = hotel?._id?.toString() ?? String(value);
    return {
      id,
      name: hotel?.name ?? null,
      address: hotel?.address ?? null,
      stars: hotel?.stars ?? null,
      cityId: this.referenceId(hotel?.cityId),
      countryId: this.referenceId(hotel?.countryId),
    };
  }

  private referenceId(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const reference = value as { _id?: Types.ObjectId; toString(): string };
    return reference._id?.toString() ?? reference.toString();
  }

  private async getPaymentDetails(booking: HotelBooking, userId: string) {
    const bookingId = (booking as HotelBooking & { _id: Types.ObjectId })._id;
    const baseFilter = {
      bookingType: 'hotel',
      bookingId,
      userId: new Types.ObjectId(userId),
    };
    let payment = booking.paymentId
      ? await this.paymentModel
          .findOne({ ...baseFilter, _id: booking.paymentId })
          .exec()
      : null;
    if (!payment) {
      payment = await this.paymentModel
        .findOne(baseFilter)
        .sort({ createdAt: -1 })
        .exec();
    }
    if (!payment) return { payment: null, refund: null };

    const refund = await this.refundModel
      .findOne({ paymentId: payment._id })
      .sort({ createdAt: -1 })
      .exec();
    return {
      payment: {
        id: payment._id.toString(),
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
      },
      refund: refund
        ? {
            id: refund._id.toString(),
            amount: refund.amount,
            refundPercent: refund.refundPercent,
            status: refund.status,
            createdAt: refund.createdAt,
          }
        : null,
    };
  }

  private calculateHotelRefundPreview(booking: HotelBooking) {
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(
        'Only confirmed reservations can be cancelled',
      );
    }
    const today = this.utcToday();
    const checkIn = new Date(booking.checkIn);
    checkIn.setUTCHours(0, 0, 0, 0);
    if (checkIn.getTime() <= today.getTime()) {
      throw new BadRequestException(
        'A reservation cannot be cancelled on or after the check-in date',
      );
    }
    const policySnapshot = booking.policyAcceptance?.policySnapshot as
      | {
          cancellationTiers?: { daysBefore: number; refundPercent: number }[];
        }
      | null
      | undefined;
    if (!Array.isArray(policySnapshot?.cancellationTiers)) {
      throw new BadRequestException(
        'Accepted hotel cancellation policy is missing',
      );
    }
    const daysRemaining = Math.floor(
      (checkIn.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );
    const refundPercent = this.paymentsService.calculateRefundPercent(
      policySnapshot.cancellationTiers,
      daysRemaining,
    );
    const refundAmount = this.paymentsService.roundToPlatformCurrency(
      (booking.totalPrice * refundPercent) / 100,
    );
    return {
      bookingId: (
        booking as HotelBooking & { _id: Types.ObjectId }
      )._id.toString(),
      bookingReference: booking.bookingReference ?? null,
      totalPrice: booking.totalPrice,
      currency: this.paymentsService.getPlatformCurrency(),
      refundPercent,
      refundAmount,
      daysRemaining,
    };
  }

  private async findOwnedBooking(bookingId: string, userId: string) {
    const booking = await this.hotelBookingModel
      .findOne({
        _id: new Types.ObjectId(bookingId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!booking) throw new NotFoundException('Hotel booking not found');
    return booking;
  }

  private assertPendingAndUnexpired(booking: HotelBooking): void {
    if (booking.status !== 'pending_payment') {
      throw new BadRequestException('Hotel booking is not pending payment');
    }
    if (booking.holdExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Hotel booking hold has expired');
    }
  }

  private hotelPolicySnapshot(hotel: Hotel) {
    return {
      cancellationTiers: (hotel.cancellationTiers ?? []).map((tier) => ({
        daysBefore: tier.daysBefore,
        refundPercent: tier.refundPercent,
      })),
      checkInTime: hotel.checkInTime ?? null,
      checkOutTime: hotel.checkOutTime ?? null,
    };
  }

  private validateStay(checkInValue: string, checkOutValue: string) {
    const checkIn = this.parseCalendarDate(checkInValue, 'checkIn');
    const checkOut = this.parseCalendarDate(checkOutValue, 'checkOut');
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
      let timestamp = checkIn.getTime();
      timestamp < checkOut.getTime();
      timestamp += 24 * 60 * 60 * 1000
    ) {
      nights.push(new Date(timestamp));
    }
    return { checkIn, checkOut, nights };
  }

  private parseCalendarDate(value: string, field: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must be a valid YYYY-MM-DD date`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${field} must be a valid YYYY-MM-DD date`);
    }
    return date;
  }

  private assertRoomDateAvailability(room: Room, nights: Date[]): void {
    const availabilityRanges = room.availabilityRanges ?? [];
    const blockedRanges = room.blockedRanges ?? [];
    const available = nights.every((night) => {
      const timestamp = night.getTime();
      const inAvailability = availabilityRanges.some(
        (range) =>
          range.startDate.getTime() <= timestamp &&
          timestamp <= range.endDate.getTime(),
      );
      const blocked = blockedRanges.some(
        (range) =>
          range.startDate.getTime() <= timestamp &&
          timestamp <= range.endDate.getTime(),
      );
      return inAvailability && !blocked;
    });
    if (!available) {
      throw new ConflictException(
        `Room ${room.name} is not available for every requested night`,
      );
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    const candidate = error as {
      code?: number;
      writeErrors?: Array<{ code?: number }>;
      cause?: { code?: number };
    };
    return (
      candidate?.code === 11000 ||
      candidate?.cause?.code === 11000 ||
      candidate?.writeErrors?.some(
        (writeError) => writeError.code === 11000,
      ) === true
    );
  }

  private generateBookingReference(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  private toDateLabel(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private utcToday(): Date {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }
}
