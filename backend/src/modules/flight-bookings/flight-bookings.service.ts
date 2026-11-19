import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import PDFDocument from 'pdfkit';
import { AirlinesService } from '../airlines/airlines.service';
import { FlightStatus } from '../flights/flights.constants';
import { Flight } from '../flights/schemas/flight.schema';
import { FlightsService } from '../flights/flights.service';
import { FlightBooking } from './schemas/flight-booking.schema';
import { PaymentsService } from '../payments/payments.service';
import {
  ADULT_MIN_AGE,
  CHILD_MIN_AGE,
  FLIGHT_BOOKING_HOLD_MINUTES,
  INFANT_FARE_PERCENT,
  MAX_INFANTS_PER_ADULT,
  MIN_ADULT_PASSENGERS,
} from './flight-bookings.constants';
import { CreateBookingSummaryDto } from './dto/create-booking-summary.dto';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class FlightBookingsService {
  constructor(
    @InjectModel(FlightBooking.name)
    private readonly flightBookingModel: Model<FlightBooking>,
    private readonly airlinesService: AirlinesService,
    private readonly flightsService: FlightsService,
    @InjectModel(Flight.name)
    private readonly flightModel: Model<Flight>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  /** FLT-22: atomically hold seats for ten minutes after a fresh summary check. */
  async holdSeats(dto: CreateBookingSummaryDto, userId: string) {
    const summary = await this.createSummary(dto);
    const seatsHeld = summary.passengers.filter(
      (passenger) => passenger.type !== 'infant',
    ).length;
    const heldSegments: Array<{ flightId: string; cabinId: string }> = [];

    try {
      for (const selection of [dto.outbound, ...(dto.return ? [dto.return] : [])]) {
        await this.changeHeldSeats(selection.flightId, selection.cabinId, seatsHeld, 'hold');
        heldSegments.push(selection);
      }
    } catch (error) {
      await this.releaseHeldSegments(heldSegments, seatsHeld);
      throw error;
    }

    try {
      const outboundFlight = await this.flightsService.findById(dto.outbound.flightId);
      const now = new Date();
      const holdExpiresAt = new Date(
        now.getTime() + FLIGHT_BOOKING_HOLD_MINUTES * 60 * 1000,
      );
      const booking = await this.flightBookingModel.create({
        userId: new Types.ObjectId(userId),
        airlineId: outboundFlight.airlineId,
        tripType: dto.return ? 'round_trip' : 'one_way',
        segments: summary.segments.map((segment) => ({
          flightId: new Types.ObjectId(segment.flight.flightId),
          cabinId: new Types.ObjectId(segment.cabin.cabinId),
          cabinClass: segment.cabin.cabinClass,
          fare: segment.cabin.farePerSeat,
        })),
        passengers: summary.passengers,
        seatsHeld,
        baggageFee: summary.baggage.totalFee,
        totalPrice: summary.totalPrice,
        status: 'pending_payment',
        holdExpiresAt,
        policyAcceptance: null,
      });
      return {
        booking,
        holdExpiresAt,
        summary,
      };
    } catch (error) {
      await this.releaseHeldSegments(heldSegments, seatsHeld);
      throw error;
    }
  }

  /** FLT-22/PAY-01: expire holds, release inventory, and cancel their Stripe intents. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expirePendingBookings(): Promise<void> {
    const now = new Date();
    const expiredCandidates = await this.flightBookingModel
      .find({ status: 'pending_payment', holdExpiresAt: { $lte: now } })
      .exec();

    for (const candidate of expiredCandidates) {
      const expired = await this.flightBookingModel
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

      for (const segment of expired.segments) {
        await this.changeHeldSeats(
          segment.flightId.toString(),
          segment.cabinId.toString(),
          expired.seatsHeld,
          'release',
        );
      }
      if (expired.paymentId) {
        await this.paymentsService.cancelPayment(expired.paymentId.toString());
      } else {
        await this.paymentsService.cancelPaymentsForBooking(
          'flight',
          expired._id.toString(),
        );
      }
    }
  }

  /** FLT-23: called only after PaymentsService verifies a Stripe success webhook. */
  async onPaymentSucceeded(bookingId: string): Promise<void> {
    const booking = await this.flightBookingModel.findById(bookingId).exec();
    if (!booking || booking.status !== 'pending_payment') return;
    const now = new Date();
    if (booking.holdExpiresAt <= now) return;

    const paymentId = await this.paymentsService.findSucceededPaymentIdForBooking(bookingId);
    if (!paymentId) return;

    let confirmed: FlightBooking | null = null;
    for (let attempt = 0; attempt < 3 && !confirmed; attempt += 1) {
      const bookingReference = this.generateBookingReference();
      try {
        confirmed = await this.flightBookingModel
          .findOneAndUpdate(
            {
              _id: bookingId,
              status: 'pending_payment',
              holdExpiresAt: { $gt: now },
            },
            {
              $set: {
                status: 'confirmed',
                bookingReference,
                paymentId: new Types.ObjectId(paymentId),
              },
            },
            { new: true },
          )
          .exec();
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error;
      }
    }
    if (!confirmed) return;

    const transferred: FlightBooking['segments'] = [];
    try {
      for (const segment of confirmed.segments) {
        await this.changeHeldSeats(
          segment.flightId.toString(),
          segment.cabinId.toString(),
          confirmed.seatsHeld,
          'confirm',
        );
        transferred.push(segment);
      }
    } catch (error) {
      for (const segment of transferred.reverse()) {
        await this.changeHeldSeats(
          segment.flightId.toString(),
          segment.cabinId.toString(),
          confirmed.seatsHeld,
          'revert-confirm',
        );
      }
      await this.flightBookingModel
        .findOneAndUpdate(
          { _id: bookingId, status: 'confirmed', bookingReference: confirmed.bookingReference },
          {
            $set: { status: 'pending_payment' },
            $unset: { paymentId: 1, bookingReference: 1 },
          },
          { new: true },
        )
        .exec();
      throw error;
    }

    // TODO(Member 6): notify the user about confirmation when NotificationsService exists.
  }

  async findMine(
    userId: string,
    page = 1,
    group?: 'upcoming' | 'past' | 'cancelled',
  ) {
    const filter: Record<string, unknown> = { userId };
    if (group === 'upcoming') filter.status = 'confirmed';
    if (group === 'past') filter.status = 'completed';
    if (group === 'cancelled') filter.status = 'cancelled';
    const result = await paginate(this.flightBookingModel, filter, page, {
      sort: { createdAt: -1 },
    });
    const data = await Promise.all(
      result.data.map((booking) => this.toBookingListItem(booking)),
    );
    return { ...result, data };
  }

  async getMine(bookingId: string, userId: string) {
    const booking = await this.getOwnedBooking(bookingId, userId);
    const flights = await this.getFlightDetails(booking);
    const paymentDetails = await this.paymentsService.getBookingPaymentDetails(
      bookingId,
      userId,
      booking.paymentId?.toString(),
    );
    return {
      ...booking.toObject(),
      flights,
      payment: paymentDetails.payment,
      refund: paymentDetails.refund,
    };
  }

  async getRefundPreview(bookingId: string, userId: string) {
    const booking = await this.getOwnedBooking(bookingId, userId);
    if (booking.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed bookings can be cancelled');
    }
    const outbound = booking.segments[0];
    const flight = await this.flightsService.findById(outbound.flightId.toString());
    const now = new Date();
    if (flight.departureTime <= now) {
      throw new BadRequestException('A booking cannot be cancelled after departure');
    }
    const tiers = this.getAcceptedCancellationTiers(booking);
    const daysRemaining = Math.floor(
      (flight.departureTime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    const refundPercent = this.paymentsService.calculateRefundPercent(
      tiers,
      daysRemaining,
    );
    const refundAmount = this.paymentsService.roundToPlatformCurrency(
      (booking.totalPrice * refundPercent) / 100,
    );
    return {
      bookingId: booking._id.toString(),
      totalPrice: booking.totalPrice,
      currency: this.paymentsService.getPlatformCurrency(),
      refundPercent,
      refundAmount,
      daysRemaining,
    };
  }

  async cancelBooking(bookingId: string, userId: string, confirm: boolean) {
    if (!confirm) throw new BadRequestException('Cancellation must be confirmed');
    const booking = await this.getOwnedBooking(bookingId, userId);
    const preview = await this.getRefundPreview(bookingId, userId);
    if (preview.refundAmount > 0 && !booking.paymentId) {
      throw new ConflictException('The booking has no successful payment to refund');
    }

    const cancelled = await this.flightBookingModel
      .findOneAndUpdate(
        { _id: bookingId, userId, status: 'confirmed' },
        { $set: { status: 'cancelled', cancelledBy: 'user' } },
        { new: true },
      )
      .exec();
    if (!cancelled) {
      throw new BadRequestException('Booking is no longer confirmed');
    }

    const released: FlightBooking['segments'] = [];
    try {
      for (const segment of cancelled.segments) {
        await this.changeHeldSeats(
          segment.flightId.toString(),
          segment.cabinId.toString(),
          cancelled.seatsHeld,
          'cancel-confirmed',
        );
        released.push(segment);
      }
    } catch (error) {
      for (const segment of released.reverse()) {
        await this.changeHeldSeats(
          segment.flightId.toString(),
          segment.cabinId.toString(),
          cancelled.seatsHeld,
          'revert-cancel',
        );
      }
      await this.flightBookingModel
        .findOneAndUpdate(
          { _id: bookingId, status: 'cancelled', cancelledBy: 'user' },
          { $set: { status: 'confirmed' }, $unset: { cancelledBy: 1 } },
          { new: true },
        )
        .exec();
      throw error;
    }

    let refund: unknown = null;
    if (preview.refundAmount > 0 && cancelled.paymentId) {
      refund = await this.paymentsService.createRefund(
        cancelled.paymentId.toString(),
        preview.refundAmount,
        preview.refundPercent,
        'User flight booking cancellation',
      );
      const refundId = (refund as { _id?: Types.ObjectId })._id;
      if (refundId) {
        await this.flightBookingModel
          .findOneAndUpdate(
            { _id: bookingId, status: 'cancelled' },
            { $set: { refundId } },
            { new: true },
          )
          .exec();
      }
    }

    // TODO(Member 6): notify the user about cancellation/refund when NotificationsService exists.
    return { booking: cancelled, refund, refundPreview: preview };
  }

  async generateETicketPdf(bookingId: string, userId: string) {
    const booking = await this.getOwnedBooking(bookingId, userId);
    if (booking.status !== 'confirmed') {
      throw new BadRequestException('An e-ticket is available only for confirmed bookings');
    }
    const flights = await this.getFlightDetails(booking);
    const chunks: Buffer[] = [];
    const document = new PDFDocument({ size: 'A4', margin: 48 });
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.fontSize(20).text('Flight e-ticket', { align: 'center' });
      document.moveDown();
      document.fontSize(12).text(`Booking reference: ${booking.bookingReference ?? 'Pending'}`);
      document.text(`Status: ${booking.status}`);
      document.text(`Total: ${booking.totalPrice} ${this.paymentsService.getPlatformCurrency()}`);
      document.moveDown();
      document.fontSize(15).text('Flight segments');
      for (const flight of flights) {
        document
          .fontSize(11)
          .text(`${flight.flightNumber}: ${flight.departureAirportId} → ${flight.arrivalAirportId}`)
          .text(`Departure: ${new Date(flight.departureTime).toISOString()} (UTC)`)
          .text(`Arrival: ${new Date(flight.arrivalTime).toISOString()} (UTC)`)
          .text(`Cabin: ${flight.cabinClass}`)
          .moveDown(0.5);
      }
      document.fontSize(15).text('Passengers');
      for (const passenger of booking.passengers) {
        document
          .fontSize(11)
          .text(`${passenger.fullName} — ${passenger.type} — ID: ${passenger.documentNumber}`)
          .text(`Extra bags: ${passenger.extraBags}, weight per bag: ${passenger.extraBagsWeightKg} kg`);
      }
      // TODO(Member 5): resolve airport time zones and display local departure/arrival times.
      document.end();
    });
    return {
      filename: `e-ticket-${booking.bookingReference ?? bookingId}.pdf`,
      buffer,
    };
  }

  private async getOwnedBooking(bookingId: string, userId: string) {
    const booking = await this.flightBookingModel
      .findOne({ _id: bookingId, userId })
      .exec();
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private async toBookingListItem(booking: FlightBooking) {
    const flights = await this.getFlightDetails(booking);
    return {
      id: (booking as unknown as { _id: Types.ObjectId })._id.toString(),
      bookingReference: booking.bookingReference,
      flights,
      passengers: booking.passengers.map(({ fullName, type }) => ({ fullName, type })),
      cabin: booking.segments.map(({ cabinClass }) => cabinClass),
      status: booking.status,
    };
  }

  private async getFlightDetails(booking: FlightBooking) {
    return Promise.all(
      booking.segments.map(async (segment) => {
        const flight = await this.flightsService.findById(segment.flightId.toString());
        return {
          flightId: segment.flightId.toString(),
          flightNumber: flight.flightNumber,
          departureAirportId: flight.departureAirportId.toString(),
          arrivalAirportId: flight.arrivalAirportId.toString(),
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          cabinClass: segment.cabinClass,
          fare: segment.fare,
        };
      }),
    );
  }

  private getAcceptedCancellationTiers(
    booking: FlightBooking,
  ): { daysBefore: number; refundPercent: number }[] {
    const snapshot = booking.policyAcceptance?.policySnapshot as
      | { cancellationTiers?: { daysBefore: number; refundPercent: number }[] }
      | undefined;
    if (!snapshot || !Array.isArray(snapshot.cancellationTiers)) {
      throw new BadRequestException('Accepted cancellation policy is missing');
    }
    return snapshot.cancellationTiers;
  }

  private async changeHeldSeats(
    flightId: string,
    cabinId: string,
    seats: number,
    action:
      | 'hold'
      | 'release'
      | 'confirm'
      | 'revert-confirm'
      | 'cancel-confirmed'
      | 'revert-cancel',
  ): Promise<void> {
    const cabinObjectId = new Types.ObjectId(cabinId);
    const filter: Record<string, unknown> = {
      _id: flightId,
      'cabins._id': cabinObjectId,
    };
    let inc: Record<string, number>;
    if (action === 'hold') {
      filter.status = FlightStatus.SCHEDULED;
      filter.cabins = {
        $elemMatch: { _id: cabinObjectId, availableSeats: { $gte: seats } },
      };
      inc = { 'cabins.$.availableSeats': -seats, 'cabins.$.heldSeats': seats };
    } else if (action === 'release') {
      filter.cabins = {
        $elemMatch: { _id: cabinObjectId, heldSeats: { $gte: seats } },
      };
      inc = { 'cabins.$.heldSeats': -seats, 'cabins.$.availableSeats': seats };
    } else if (action === 'confirm') {
      filter.cabins = {
        $elemMatch: { _id: cabinObjectId, heldSeats: { $gte: seats } },
      };
      inc = { 'cabins.$.heldSeats': -seats, 'cabins.$.bookedSeats': seats };
    } else if (action === 'revert-confirm') {
      filter.cabins = {
        $elemMatch: { _id: cabinObjectId, bookedSeats: { $gte: seats } },
      };
      inc = { 'cabins.$.bookedSeats': -seats, 'cabins.$.heldSeats': seats };
    } else if (action === 'cancel-confirmed') {
      filter.cabins = {
        $elemMatch: { _id: cabinObjectId, bookedSeats: { $gte: seats } },
      };
      inc = { 'cabins.$.bookedSeats': -seats, 'cabins.$.availableSeats': seats };
    } else {
      filter.cabins = {
        $elemMatch: { _id: cabinObjectId, availableSeats: { $gte: seats } },
      };
      inc = { 'cabins.$.availableSeats': -seats, 'cabins.$.bookedSeats': seats };
    }

    const updated = await this.flightModel
      .findOneAndUpdate({ ...filter }, { $inc: inc }, { new: true })
      .exec();
    if (!updated) {
      throw new ConflictException('Flight cabin inventory changed; retry the request');
    }
  }

  private async releaseHeldSegments(
    segments: Array<{ flightId: string; cabinId: string }>,
    seats: number,
  ): Promise<void> {
    for (const segment of segments.reverse()) {
      await this.changeHeldSeats(segment.flightId, segment.cabinId, seats, 'release');
    }
  }

  private generateBookingReference(): string {
    return `FL${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  /** FLT-12/19/21: validate and calculate a summary without writing or holding seats. */
  async createSummary(dto: CreateBookingSummaryDto) {
    const selected = await Promise.all(
      [dto.outbound, ...(dto.return ? [dto.return] : [])].map((selection) =>
        this.getScheduledFlightAndCabin(selection.flightId, selection.cabinId),
      ),
    );
    const outbound = selected[0];
    const returnSegment = selected[1];

    if (returnSegment) {
      if (outbound.flight.airlineId.toString() !== returnSegment.flight.airlineId.toString()) {
        throw new BadRequestException('Round-trip segments must be operated by the same airline');
      }
      if (
        outbound.flight.arrivalAirportId.toString() !==
          returnSegment.flight.departureAirportId.toString() ||
        outbound.flight.departureAirportId.toString() !==
          returnSegment.flight.arrivalAirportId.toString()
      ) {
        throw new BadRequestException('Return flight must use the reverse airport route');
      }
      if (returnSegment.flight.departureTime <= outbound.flight.arrivalTime) {
        throw new BadRequestException('Return flight must depart after the outbound flight arrives');
      }
    }

    const airline = await this.airlinesService.findById(
      outbound.flight.airlineId.toString(),
    );
    if (!airline.isActive) {
      throw new BadRequestException('The airline is not currently bookable');
    }
    const segments = returnSegment ? [outbound, returnSegment] : [outbound];
    const passengerData = this.classifyPassengers(dto.passengers, outbound.flight.departureTime);
    const seatCount = passengerData.filter(
      (passenger) => passenger.type !== 'infant',
    ).length;

    for (const segment of segments) {
      for (const passenger of passengerData) {
        if (passenger.extraBags > airline.baggagePolicy.maxExtraBagsPerPassenger) {
          throw new BadRequestException(
            'Passenger extra bags exceed the airline baggage policy',
          );
        }
        if (passenger.extraBags === 0 && passenger.extraBagsWeightKg > 0) {
          throw new BadRequestException(
            'Extra bag weight must be zero when no extra bags are selected',
          );
        }
        if (passenger.extraBagsWeightKg > segment.cabin.maxBagWeightKg) {
          throw new BadRequestException(
            'An extra bag exceeds the selected cabin weight limit',
          );
        }
      }
      if (segment.cabin.availableSeats < seatCount) {
        throw new ConflictException('Not enough seats remain in the selected cabin');
      }
    }

    let baggageFee = 0;
    let totalPrice = 0;
    const segmentSummaries = segments.map((segment, index) => {
      let passengerFareTotal = 0;
      const passengers = passengerData.map((passenger) => {
        const fare = passenger.type === 'infant'
          ? (segment.cabin.price * INFANT_FARE_PERCENT) / 100
          : segment.cabin.price;
        passengerFareTotal += fare;
        return { ...passenger, fare };
      });

      // Section 10 default: each extra bag is charged once per round-trip segment.
      const segmentBaggageFee = passengerData.reduce(
        (sum, passenger) => sum + passenger.extraBags * airline.baggagePolicy.extraBagPrice,
        0,
      );
      baggageFee += segmentBaggageFee;
      totalPrice += passengerFareTotal + segmentBaggageFee;

      return {
        direction: index === 0 ? 'outbound' : 'return',
        flight: {
          flightId: segment.flightId,
          flightNumber: segment.flight.flightNumber,
          departureAirportId: segment.flight.departureAirportId.toString(),
          arrivalAirportId: segment.flight.arrivalAirportId.toString(),
          departureTime: segment.flight.departureTime,
          arrivalTime: segment.flight.arrivalTime,
        },
        cabin: {
          cabinId: segment.cabinId,
          cabinClass: segment.cabin.cabinClass,
          farePerSeat: segment.cabin.price,
          freeBags: segment.cabin.freeBags,
          maxBagWeightKg: segment.cabin.maxBagWeightKg,
          seatsRemaining: segment.cabin.availableSeats,
        },
        passengers,
        baggageFee: segmentBaggageFee,
      };
    });

    return {
      tripType: returnSegment ? 'round_trip' : 'one_way',
      segments: segmentSummaries,
      passengers: passengerData,
      baggage: {
        extraBagPricePerSegment: airline.baggagePolicy.extraBagPrice,
        totalFee: baggageFee,
      },
      totalPrice,
    };
  }

  private async getScheduledFlightAndCabin(flightId: string, cabinId: string) {
    const flight = await this.flightsService.findById(flightId);
    if (flight.status !== FlightStatus.SCHEDULED || flight.departureTime <= new Date()) {
      throw new BadRequestException('Only future scheduled flights can be booked');
    }
    const cabin = flight.cabins.find(
      (candidate) =>
        (candidate as typeof candidate & { _id?: Types.ObjectId })._id?.toString() === cabinId,
    );
    if (!cabin) throw new NotFoundException('Cabin not found on the selected flight');
    return {
      flight,
      flightId,
      cabinId,
      cabin,
    };
  }

  private classifyPassengers(
    passengers: CreateBookingSummaryDto['passengers'],
    departureTime: Date,
  ) {
    const departureDate = new Date(
      Date.UTC(
        departureTime.getUTCFullYear(),
        departureTime.getUTCMonth(),
        departureTime.getUTCDate(),
      ),
    );
    let adultCount = 0;
    let infantCount = 0;
    const classified = passengers.map((passenger) => {
      const [year, month, day] = passenger.dateOfBirth.split('-').map(Number);
      const birthDate = new Date(Date.UTC(year, month - 1, day));
      if (
        Number.isNaN(birthDate.getTime()) ||
        birthDate.toISOString().slice(0, 10) !== passenger.dateOfBirth ||
        birthDate > departureDate
      ) {
        throw new BadRequestException('Passenger date of birth must be on or before outbound departure');
      }
      let age = departureDate.getUTCFullYear() - birthDate.getUTCFullYear();
      const beforeBirthday =
        departureDate.getUTCMonth() < birthDate.getUTCMonth() ||
        (departureDate.getUTCMonth() === birthDate.getUTCMonth() &&
          departureDate.getUTCDate() < birthDate.getUTCDate());
      if (beforeBirthday) age -= 1;

      const type = age >= ADULT_MIN_AGE ? 'adult' : age >= CHILD_MIN_AGE ? 'child' : 'infant';
      if (type === 'adult') adultCount += 1;
      if (type === 'infant') infantCount += 1;

      const extraBags = passenger.extraBags ?? 0;
      const extraBagsWeightKg = passenger.extraBagsWeightKg ?? 0;
      return {
        fullName: passenger.fullName.trim(),
        dateOfBirth: birthDate,
        documentNumber: passenger.documentNumber.trim(),
        type,
        extraBags,
        extraBagsWeightKg,
      };
    });

    if (adultCount < MIN_ADULT_PASSENGERS) {
      throw new BadRequestException('A booking must include at least one adult');
    }
    if (infantCount > adultCount * MAX_INFANTS_PER_ADULT) {
      throw new BadRequestException('A booking cannot have more infants than adults');
    }
    return classified;
  }

  /** PAY-02: return the policy details attached to the booking's airline. */
  async getPolicies(bookingId: string, userId: string) {
    const booking = await this.getOwnedPendingBooking(bookingId, userId);
    const policies = await this.airlinesService.getModeratorPolicies(
      booking.airlineId.toString(),
    );
    return {
      bookingType: 'flight' as const,
      baggagePolicy: policies.baggagePolicy,
      cancellationTiers: policies.cancellationTiers,
    };
  }

  /** PAY-02: persist a timestamp and exact policy snapshot for later cancellations. */
  async acceptPolicies(bookingId: string, userId: string): Promise<FlightBooking> {
    const booking = await this.getOwnedPendingBooking(bookingId, userId);
    const policies = await this.airlinesService.getModeratorPolicies(
      booking.airlineId.toString(),
    );
    const acceptedAt = new Date();
    const updated = await this.flightBookingModel
      .findOneAndUpdate(
        {
          _id: bookingId,
          userId: new Types.ObjectId(userId),
          status: 'pending_payment',
          holdExpiresAt: { $gt: acceptedAt },
        },
        {
          $set: {
            policyAcceptance: {
              acceptedAt,
              policySnapshot: {
                baggagePolicy: policies.baggagePolicy,
                cancellationTiers: policies.cancellationTiers,
              },
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new BadRequestException('Booking is no longer eligible for policy acceptance');
    }
    return updated;
  }

  private async getOwnedPendingBooking(
    bookingId: string,
    userId: string,
  ): Promise<FlightBooking> {
    const booking = await this.flightBookingModel
      .findOne({ _id: bookingId, userId })
      .exec();
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'pending_payment') {
      throw new BadRequestException('Booking is not pending payment');
    }
    if (booking.holdExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Booking payment hold has expired');
    }
    return booking;
  }
}
