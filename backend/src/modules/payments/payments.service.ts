import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { Role } from '../../common/enums/role.enum';
import { FlightBooking } from '../flight-bookings/schemas/flight-booking.schema';
import { FlightBookingsService } from '../flight-bookings/flight-bookings.service';
import { Payment } from './schemas/payment.schema';
import { Refund } from './schemas/refund.schema';
import {
  STRIPE_THREE_DECIMAL_CURRENCIES,
  STRIPE_ZERO_DECIMAL_CURRENCIES,
  STRIPE_CLIENT,
} from './payments.constants';

export type BookingType = 'flight' | 'hotel';

@Injectable()
export class PaymentsService {
  private readonly platformCurrency: string;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
    @InjectModel(Refund.name)
    private readonly refundModel: Model<Refund>,
    @InjectModel(FlightBooking.name)
    private readonly flightBookingModel: Model<FlightBooking>,
    private readonly configService: ConfigService,
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
    @Inject(forwardRef(() => FlightBookingsService))
    private readonly flightBookingsService: FlightBookingsService,
  ) {
    const currency = configService.getOrThrow<string>('PLATFORM_CURRENCY').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error('PLATFORM_CURRENCY must be a three-letter currency code');
    }
    this.platformCurrency = currency;
  }

  /** PAY-01/PAY-04. Amount is computed from the owned pending booking by the caller. */
  async createPayment(
    bookingType: BookingType,
    bookingId: string,
    amount: number,
    userId: string,
    testPaymentMethod?: string,
  ): Promise<{ paymentId: string; clientSecret: string }> {
    if (bookingType === 'hotel') {
      throw new NotImplementedException('Hotel payments are not available yet');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.create({
        amount: this.toStripeAmount(amount),
        currency: this.platformCurrency.toLowerCase(),
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: { bookingType, bookingId, userId },
      });
    } catch (error) {
      this.throwStripeGatewayException(error);
    }
    if (!intent.client_secret) {
      await this.stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
      throw new InternalServerErrorException('Stripe did not return a client secret');
    }

    let payment: Payment;
    try {
      payment = await this.paymentModel.create({
        userId,
        bookingType,
        bookingId,
        stripePaymentIntentId: intent.id,
        amount,
        currency: this.platformCurrency,
        status: 'pending',
      });
    } catch (error) {
      await this.stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
      throw error;
    }

    if (testPaymentMethod) {
      try {
        await this.stripe.paymentIntents.confirm(intent.id, {
          payment_method: testPaymentMethod,
        });
      } catch (error) {
        // Stripe's signed webhook records failure. Booking state remains pending_payment.
        if (this.isStripeCardError(error)) {
          throw new BadRequestException('Stripe declined this test payment method');
        }
        this.throwStripeGatewayException(error);
      }
    }

    const paymentId = (payment as unknown as { _id: Types.ObjectId })._id;
    return { paymentId: paymentId.toString(), clientSecret: intent.client_secret };
  }

  /** Cancel the Stripe PaymentIntent when a booking hold expires (PAY-01). */
  async cancelPayment(paymentId: string): Promise<void> {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'pending' && payment.status !== 'failed') return;

    try {
      await this.stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
    } catch (error) {
      this.throwStripeGatewayException(error);
    }
    payment.status = 'cancelled';
    await payment.save();
  }

  async cancelPaymentsForBooking(
    bookingType: BookingType,
    bookingId: string,
  ): Promise<void> {
    const payments = await this.paymentModel
      .find({ bookingType, bookingId, status: { $in: ['pending', 'failed'] } })
      .exec();
    for (const payment of payments) {
      await this.cancelPayment(payment._id.toString());
    }
  }

  async findSucceededPaymentIdForBooking(bookingId: string): Promise<string | null> {
    const payment = await this.paymentModel
      .findOne({ bookingType: 'flight', bookingId, status: 'succeeded' })
      .sort({ createdAt: -1 })
      .exec();
    return payment?._id.toString() ?? null;
  }

  /** Issue and record a Stripe refund (PAY-03). */
  async createRefund(
    paymentId: string,
    amount: number,
    refundPercent: number,
    reason: string,
  ): Promise<Refund> {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'succeeded') {
      throw new BadRequestException('Only a succeeded payment can be refunded');
    }
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > payment.amount ||
      !Number.isFinite(refundPercent) ||
      refundPercent < 0 ||
      refundPercent > 100
    ) {
      throw new BadRequestException('Refund amount or percentage is invalid');
    }

    const refund = await this.refundModel.create({
      paymentId: (payment as unknown as { _id: Types.ObjectId })._id,
      bookingType: payment.bookingType,
      bookingId: payment.bookingId,
      amount,
      refundPercent,
      reason,
      status: 'pending',
    });
    try {
      const stripeRefund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: this.toStripeAmount(amount),
      });
      refund.stripeRefundId = stripeRefund.id;
      refund.status = stripeRefund.status === 'succeeded' ? 'refunded' : 'pending';
    } catch {
      refund.status = 'failed';
    }
    await refund.save();

    // TODO(Member 6): notify the user about the refund result when NotificationsService exists.
    return refund;
  }

  /** PAY-01: retry a failed intent while its booking hold is still valid. */
  async retryPayment(
    paymentId: string,
    userId: string,
    testPaymentMethod?: string,
  ): Promise<{ paymentId: string; clientSecret: string }> {
    const payment = await this.paymentModel.findOne({ _id: paymentId, userId }).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.bookingType === 'hotel') {
      throw new NotImplementedException('Hotel payments are not available yet');
    }
    if (payment.status !== 'failed') {
      throw new BadRequestException('Only failed payments can be retried');
    }

    const booking = await this.flightBookingModel
      .findOne({ _id: payment.bookingId, userId })
      .exec();
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertBookingCanBePaid(booking);

    const intent = await this.stripe.paymentIntents.retrieve(
      payment.stripePaymentIntentId,
    );
    if (intent.status !== 'requires_payment_method' && !testPaymentMethod) {
      if (!intent.client_secret) {
        throw new BadRequestException('PaymentIntent is not available for retry');
      }
      return { paymentId: payment._id.toString(), clientSecret: intent.client_secret };
    }

    try {
      const retried = await this.stripe.paymentIntents.confirm(
        payment.stripePaymentIntentId,
        testPaymentMethod ? { payment_method: testPaymentMethod } : {},
      );
      if (!retried.client_secret) {
        throw new BadRequestException('Stripe did not return a client secret');
      }
      return { paymentId: payment._id.toString(), clientSecret: retried.client_secret };
    } catch (error) {
      // The signed payment_failed event remains the source of persisted failure state.
      if (this.isStripeCardError(error)) {
        throw new BadRequestException('Stripe declined this retry payment method');
      }
      this.throwStripeGatewayException(error);
    }
  }

  /** PAY-01: accept only Stripe-verified events; rawBody is required for signature checks. */
  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!rawBody || !signature) {
      throw new BadRequestException('Stripe webhook body and signature are required');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    const intent = event.data.object as Stripe.PaymentIntent;
    if (event.type === 'payment_intent.succeeded') {
      const payment = await this.paymentModel
        .findOne({ stripePaymentIntentId: intent.id })
        .exec();
      if (payment && payment.status !== 'cancelled') {
        if (payment.status !== 'succeeded') {
          payment.status = 'succeeded';
          await payment.save();
        }
        await this.flightBookingsService.onPaymentSucceeded(
          payment.bookingId.toString(),
        );
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.paymentModel
        .findOneAndUpdate(
          {
            stripePaymentIntentId: intent.id,
            status: { $in: ['pending', 'failed'] },
          },
          { $set: { status: 'failed' } },
          { new: true },
        )
        .exec();
      // A failed payment changes no booking state; the user may retry until expiry.
    } else if (event.type === 'payment_intent.canceled') {
      await this.paymentModel
        .findOneAndUpdate(
          { stripePaymentIntentId: intent.id, status: { $ne: 'succeeded' } },
          { $set: { status: 'cancelled' } },
          { new: true },
        )
        .exec();
    }

    return { received: true };
  }

  async getPayment(paymentId: string, user: JwtUser) {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment || (user.role !== Role.ADMIN && payment.userId.toString() !== user.sub)) {
      throw new NotFoundException('Payment not found');
    }
    return {
      id: payment._id.toString(),
      bookingType: payment.bookingType,
      bookingId: payment.bookingId.toString(),
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
    };
  }

  async getBookingPaymentDetails(
    bookingId: string,
    userId: string,
    paymentId?: string,
  ) {
    let payment = paymentId
      ? await this.paymentModel
          .findOne({ _id: paymentId, bookingType: 'flight', bookingId, userId })
          .exec()
      : null;
    if (!payment) {
      payment = await this.paymentModel
        .findOne({ bookingType: 'flight', bookingId, userId, status: 'succeeded' })
        .sort({ createdAt: -1 })
        .exec();
    }
    if (!payment) {
      payment = await this.paymentModel
        .findOne({ bookingType: 'flight', bookingId, userId })
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
      },
      refund: refund
        ? {
            id: refund._id.toString(),
            amount: refund.amount,
            refundPercent: refund.refundPercent,
            status: refund.status,
          }
        : null,
    };
  }

  async getRefund(refundId: string, user: JwtUser) {
    const refund = await this.refundModel.findById(refundId).exec();
    if (!refund) throw new NotFoundException('Refund not found');
    const payment = await this.paymentModel.findById(refund.paymentId).exec();
    if (!payment || (user.role !== Role.ADMIN && payment.userId.toString() !== user.sub)) {
      throw new NotFoundException('Refund not found');
    }
    return {
      id: refund._id.toString(),
      paymentId: refund.paymentId.toString(),
      bookingType: refund.bookingType,
      bookingId: refund.bookingId.toString(),
      amount: refund.amount,
      refundPercent: refund.refundPercent,
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt,
    };
  }

  /** FLT-09: use the highest daysBefore threshold no greater than days remaining. */
  calculateRefundPercent(
    tiers: { daysBefore: number; refundPercent: number }[],
    daysRemaining: number,
  ): number {
    const applicable = tiers.filter(
      (tier) => tier.daysBefore <= daysRemaining,
    );
    if (applicable.length === 0) return 0;
    return applicable.reduce((best, tier) =>
      tier.daysBefore > best.daysBefore ? tier : best,
    ).refundPercent;
  }

  /** Validate hold, ownership and accepted policies; derive amount from persisted booking. */
  async createPaymentForBooking(
    bookingType: BookingType,
    bookingId: string,
    userId: string,
    testPaymentMethod?: string,
  ): Promise<{ paymentId: string; clientSecret: string }> {
    if (bookingType === 'hotel') {
      throw new NotImplementedException('Hotel payments are not available yet');
    }

    const booking = await this.flightBookingModel
      .findOne({ _id: bookingId, userId })
      .exec();
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertBookingCanBePaid(booking);

    return this.createPayment(
      bookingType,
      bookingId,
      booking.totalPrice,
      userId,
      testPaymentMethod,
    );
  }

  private assertBookingCanBePaid(booking: FlightBooking): void {
    if (booking.status !== 'pending_payment') {
      throw new BadRequestException('Booking is not pending payment');
    }
    if (booking.holdExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Booking payment hold has expired');
    }
    if (!booking.policyAcceptance?.acceptedAt || !booking.policyAcceptance.policySnapshot) {
      throw new BadRequestException('Accept booking policies before paying');
    }
  }

  private toStripeAmount(amount: number): number {
    const exponent = this.getCurrencyExponent();
    const minorUnits = Math.round(amount * 10 ** exponent);
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 1) {
      throw new BadRequestException('Amount is too small or too large for Stripe');
    }
    return minorUnits;
  }

  roundToPlatformCurrency(amount: number): number {
    const factor = 10 ** this.getCurrencyExponent();
    return Math.round((amount + Number.EPSILON) * factor) / factor;
  }

  getPlatformCurrency(): string {
    return this.platformCurrency;
  }

  private getCurrencyExponent(): number {
    return STRIPE_ZERO_DECIMAL_CURRENCIES.has(this.platformCurrency)
      ? 0
      : STRIPE_THREE_DECIMAL_CURRENCIES.has(this.platformCurrency)
        ? 3
        : 2;
  }

  private isStripeCardError(error: unknown): boolean {
    return this.getStripeErrorType(error) === 'StripeCardError';
  }

  private getStripeErrorType(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('type' in error)) {
      return undefined;
    }
    const type = (error as { type?: unknown }).type;
    return typeof type === 'string' ? type : undefined;
  }

  private throwStripeGatewayException(error: unknown): never {
    const type = this.getStripeErrorType(error);
    if (!type?.startsWith('Stripe')) throw error;
    if (
      type === 'StripeAuthenticationError' ||
      type === 'StripeConnectionError' ||
      type === 'StripeRateLimitError'
    ) {
      throw new ServiceUnavailableException(
        'Stripe is temporarily unavailable; check the configured test credentials and try again.',
      );
    }
    throw new BadGatewayException('Stripe could not process the payment request.');
  }
}
