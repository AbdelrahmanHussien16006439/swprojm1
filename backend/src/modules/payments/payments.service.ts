import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { FlightBooking } from '../flight-bookings/schemas/flight-booking.schema';
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

    const intent = await this.stripe.paymentIntents.create({
      amount: this.toStripeAmount(amount),
      currency: this.platformCurrency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { bookingType, bookingId, userId },
    });
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
      } catch {
        // Stripe's signed webhook records failure. Booking state remains pending_payment.
        throw new BadRequestException('Stripe could not confirm this test payment method');
      }
    }

    const paymentId = (payment as unknown as { _id: Types.ObjectId })._id;
    return { paymentId: paymentId.toString(), clientSecret: intent.client_secret };
  }

  /** Cancel the Stripe PaymentIntent when a booking hold expires (PAY-01). */
  async cancelPayment(paymentId: string): Promise<void> {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'pending') return;

    await this.stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
    payment.status = 'cancelled';
    await payment.save();
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
    if (booking.status !== 'pending_payment') {
      throw new BadRequestException('Booking is not pending payment');
    }
    if (booking.holdExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Booking payment hold has expired');
    }
    if (!booking.policyAcceptance?.acceptedAt || !booking.policyAcceptance.policySnapshot) {
      throw new BadRequestException('Accept booking policies before paying');
    }

    return this.createPayment(
      bookingType,
      bookingId,
      booking.totalPrice,
      userId,
      testPaymentMethod,
    );
  }

  private toStripeAmount(amount: number): number {
    const exponent = STRIPE_ZERO_DECIMAL_CURRENCIES.has(this.platformCurrency)
      ? 0
      : STRIPE_THREE_DECIMAL_CURRENCIES.has(this.platformCurrency)
        ? 3
        : 2;
    const minorUnits = Math.round(amount * 10 ** exponent);
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 1) {
      throw new BadRequestException('Amount is too small or too large for Stripe');
    }
    return minorUnits;
  }
}
