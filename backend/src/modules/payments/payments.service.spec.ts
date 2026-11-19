import {
  BadRequestException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { FlightBooking } from '../flight-bookings/schemas/flight-booking.schema';
import { Payment } from './schemas/payment.schema';
import { Refund } from './schemas/refund.schema';
import { PaymentsService } from './payments.service';
import { Role } from '../../common/enums/role.enum';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentModel: {
    create: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
  };
  let refundModel: { create: jest.Mock; findById: jest.Mock };
  let bookingModel: { findOne: jest.Mock };
  let stripe: {
    paymentIntents: {
      create: jest.Mock;
      confirm: jest.Mock;
      cancel: jest.Mock;
      retrieve: jest.Mock;
    };
    refunds: { create: jest.Mock };
    webhooks: { constructEvent: jest.Mock };
  };
  let flightBookingsService: { onPaymentSucceeded: jest.Mock };

  beforeEach(() => {
    paymentModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };
    refundModel = { create: jest.fn(), findById: jest.fn() };
    bookingModel = { findOne: jest.fn() };
    flightBookingsService = { onPaymentSucceeded: jest.fn() };
    stripe = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' }),
        confirm: jest.fn().mockResolvedValue({
          status: 'succeeded',
          client_secret: 'secret_retry',
        }),
        cancel: jest.fn().mockResolvedValue({ status: 'canceled' }),
        retrieve: jest.fn().mockResolvedValue({
          status: 'requires_payment_method',
          client_secret: 'secret_retry',
        }),
      },
      refunds: { create: jest.fn() },
      webhooks: { constructEvent: jest.fn() },
    };
    const config = {
      getOrThrow: jest.fn((key: string) =>
        key === 'PLATFORM_CURRENCY' ? 'USD' : 'whsec_test',
      ),
    } as unknown as ConfigService;
    service = new PaymentsService(
      paymentModel as unknown as Model<Payment>,
      refundModel as unknown as Model<Refund>,
      bookingModel as unknown as Model<FlightBooking>,
      config,
      stripe as unknown as Stripe,
      flightBookingsService as never,
    );
  });

  it('calculates the refund tier with the highest applicable threshold', () => {
    expect(
      service.calculateRefundPercent(
        [
          { daysBefore: 30, refundPercent: 100 },
          { daysBefore: 7, refundPercent: 50 },
          { daysBefore: 0, refundPercent: 0 },
        ],
        10,
      ),
    ).toBe(50);
    expect(
      service.calculateRefundPercent([{ daysBefore: 7, refundPercent: 50 }], 2),
    ).toBe(0);
  });

  it('derives amount and currency from the owned booking and does not store the test method', async () => {
    const bookingId = new Types.ObjectId().toString();
    bookingModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        status: 'pending_payment',
        holdExpiresAt: new Date(Date.now() + 60_000),
        policyAcceptance: { acceptedAt: new Date(), policySnapshot: { baggagePolicy: {} } },
        totalPrice: 10.5,
      }),
    });
    paymentModel.create.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(
      service.createPaymentForBooking('flight', bookingId, 'user-1', 'pm_card_visa'),
    ).resolves.toEqual({ paymentId: expect.any(String), clientSecret: 'secret_test' });
    expect(bookingModel.findOne).toHaveBeenCalledWith({ _id: bookingId, userId: 'user-1' });
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1050,
        currency: 'usd',
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      }),
    );
    expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test', {
      payment_method: 'pm_card_visa',
    });
    expect(paymentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10.5, currency: 'USD', status: 'pending' }),
    );
    expect(JSON.stringify(paymentModel.create.mock.calls)).not.toContain('pm_card_visa');
  });

  it('returns a clear 503 when Stripe rejects the configured credentials', async () => {
    stripe.paymentIntents.create.mockRejectedValue({
      type: 'StripeAuthenticationError',
    });

    const error = await service
      .createPayment('flight', 'booking-1', 25, 'user-1')
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error).toMatchObject({
      status: 503,
      message:
        'Stripe is temporarily unavailable; check the configured test credentials and try again.',
    });
  });

  it('rejects payment for someone else’s booking as not found', async () => {
    bookingModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(
      service.createPaymentForBooking('flight', new Types.ObjectId().toString(), 'user-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects expired holds and unaccepted policies', async () => {
    const booking = {
      status: 'pending_payment',
      holdExpiresAt: new Date(Date.now() - 1),
      policyAcceptance: { acceptedAt: new Date(), policySnapshot: {} },
      totalPrice: 30,
    };
    bookingModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(booking) });
    await expect(
      service.createPaymentForBooking('flight', 'booking-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    booking.holdExpiresAt = new Date(Date.now() + 60_000);
    booking.policyAcceptance = null;
    await expect(
      service.createPaymentForBooking('flight', 'booking-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 501 for hotel payments until hotel bookings are implemented', async () => {
    await expect(
      service.createPaymentForBooking('hotel', 'booking-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });

  it('cancels a pending Stripe intent and records its payment state', async () => {
    const payment = {
      status: 'pending',
      stripePaymentIntentId: 'pi_to_cancel',
      save: jest.fn().mockResolvedValue(undefined),
    };
    paymentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });

    await service.cancelPayment('payment-1');

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_to_cancel');
    expect(payment.status).toBe('cancelled');
    expect(payment.save).toHaveBeenCalled();
  });

  it('creates a Stripe refund and records the returned refund id and status', async () => {
    const payment = {
      _id: new Types.ObjectId(),
      status: 'succeeded',
      stripePaymentIntentId: 'pi_paid',
      bookingType: 'flight',
      bookingId: new Types.ObjectId(),
      amount: 80,
    };
    const refund = { save: jest.fn().mockResolvedValue(undefined) };
    paymentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });
    refundModel.create.mockResolvedValue(refund);
    stripe.refunds.create.mockResolvedValue({ id: 're_test', status: 'succeeded' });

    await expect(
      service.createRefund('payment-1', 40, 50, 'user cancellation'),
    ).resolves.toBe(refund);
    expect(stripe.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_paid',
      amount: 4000,
    });
    expect(refund).toMatchObject({ stripeRefundId: 're_test', status: 'refunded' });
    expect(refund.save).toHaveBeenCalled();
  });

  it('verifies webhook signatures and records succeeded payment events', async () => {
    const payment = {
      bookingId: new Types.ObjectId(),
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const event = {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_verified' } },
    };
    stripe.webhooks.constructEvent.mockReturnValue(event);
    paymentModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(payment),
    });

    await expect(service.handleWebhook(Buffer.from('{}'), 'sig_verified')).resolves.toEqual({
      received: true,
    });
    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      Buffer.from('{}'),
      'sig_verified',
      'whsec_test',
    );
    expect(paymentModel.findOne).toHaveBeenCalledWith({
      stripePaymentIntentId: 'pi_verified',
    });
    expect(payment.status).toBe('succeeded');
    expect(payment.save).toHaveBeenCalled();
    expect(flightBookingsService.onPaymentSucceeded).toHaveBeenCalledWith(
      payment.bookingId.toString(),
    );
  });

  it('rejects invalid webhook signatures without changing payment state', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    await expect(service.handleWebhook(Buffer.from('{}'), 'bad_sig')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(paymentModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('retries only an owned failed payment whose booking hold is still active', async () => {
    const bookingId = new Types.ObjectId();
    paymentModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        userId: 'user-1',
        bookingType: 'flight',
        bookingId,
        stripePaymentIntentId: 'pi_retry',
        status: 'failed',
      }),
    });
    bookingModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        status: 'pending_payment',
        holdExpiresAt: new Date(Date.now() + 60_000),
        policyAcceptance: { acceptedAt: new Date(), policySnapshot: {} },
      }),
    });

    await expect(
      service.retryPayment('payment-1', 'user-1', 'pm_card_visa'),
    ).resolves.toEqual({ paymentId: expect.any(String), clientSecret: 'secret_retry' });
    expect(paymentModel.findOne).toHaveBeenCalledWith({ _id: 'payment-1', userId: 'user-1' });
    expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_retry', {
      payment_method: 'pm_card_visa',
    });
  });

  it('hides another user’s payment with a 404', async () => {
    paymentModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        userId: new Types.ObjectId().toString(),
        bookingType: 'flight',
      }),
    });
    await expect(
      service.getPayment('payment-1', {
        sub: new Types.ObjectId().toString(),
        role: Role.USER,
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
