import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { Payment } from './schemas/payment.schema';
import { Refund } from './schemas/refund.schema';
import { PaymentsService } from './payments.service';
import { Role } from '../../common/enums/role.enum';
import { HotelBookingsService } from '../hotel-bookings/hotel-bookings.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentModel: {
    create: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
  };
  let refundModel: { create: jest.Mock; findById: jest.Mock; findOne: jest.Mock };
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
  let flightBookingsService: { onPaymentSucceeded: jest.Mock; getAmountForPayment: jest.Mock };
  let hotelBookingsService: { onPaymentSucceeded: jest.Mock; getAmountForPayment: jest.Mock };
  let notificationsService: { notify: jest.Mock };

  beforeEach(() => {
    paymentModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };
    refundModel = { create: jest.fn(), findById: jest.fn(), findOne: jest.fn() };
    flightBookingsService = {
      onPaymentSucceeded: jest.fn(),
      getAmountForPayment: jest.fn().mockResolvedValue(10.5),
    };
    hotelBookingsService = {
      onPaymentSucceeded: jest.fn(),
      getAmountForPayment: jest.fn().mockResolvedValue(42),
    };
    notificationsService = { notify: jest.fn().mockResolvedValue(undefined) };
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
      config,
      stripe as unknown as Stripe,
      flightBookingsService as never,
      hotelBookingsService as never,
      notificationsService as never,
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
    paymentModel.create.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(
      service.createPaymentForBooking('flight', bookingId, 'user-1', 'pm_card_visa'),
    ).resolves.toEqual({ paymentId: expect.any(String), clientSecret: 'secret_test' });
    expect(flightBookingsService.getAmountForPayment).toHaveBeenCalledWith(bookingId, 'user-1');
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
    flightBookingsService.getAmountForPayment.mockRejectedValue(new NotFoundException());
    await expect(
      service.createPaymentForBooking('flight', new Types.ObjectId().toString(), 'user-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects expired holds and unaccepted policies', async () => {
    flightBookingsService.getAmountForPayment.mockRejectedValueOnce(new BadRequestException());
    await expect(
      service.createPaymentForBooking('flight', 'booking-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    flightBookingsService.getAmountForPayment.mockRejectedValueOnce(new BadRequestException());
    await expect(
      service.createPaymentForBooking('flight', 'booking-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a hotel payment using the hotel booking callback amount', async () => {
    paymentModel.create.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(service.createPaymentForBooking('hotel', 'hotel-booking-1', 'user-1'))
      .resolves.toMatchObject({ paymentId: expect.any(String), clientSecret: 'secret_test' });
    expect(hotelBookingsService.getAmountForPayment).toHaveBeenCalledWith(
      'hotel-booking-1',
      'user-1',
    );
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ bookingType: 'hotel' }) }),
    );
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
      userId: new Types.ObjectId(),
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
    expect(notificationsService.notify).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      'REFUND_CREATED',
      expect.stringContaining('has been created'),
      expect.stringContaining('/flight-bookings/'),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.any(String),
      'REFUND_REFUNDED',
      expect.stringContaining('has been completed'),
      expect.stringContaining('/flight-bookings/'),
    );
  });

  it('notifies when Stripe refund creation fails', async () => {
    const payment = {
      userId: new Types.ObjectId(),
      status: 'succeeded',
      stripePaymentIntentId: 'pi_paid',
      bookingType: 'flight',
      bookingId: new Types.ObjectId(),
      amount: 80,
    };
    const refund = { save: jest.fn().mockResolvedValue(undefined) };
    paymentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });
    refundModel.create.mockResolvedValue(refund);
    stripe.refunds.create.mockRejectedValue(new Error('stripe unavailable'));

    await expect(service.createRefund('payment-1', 40, 50, 'user cancellation'))
      .resolves.toBe(refund);
    expect(refund).toMatchObject({ status: 'failed' });
    expect(notificationsService.notify).toHaveBeenCalledWith(
      payment.userId.toString(),
      'REFUND_FAILED',
      expect.stringContaining('could not be processed'),
      expect.stringContaining('/flight-bookings/'),
    );
  });

  it('updates and notifies a refund status from verified Stripe refund events', async () => {
    const payment = { userId: new Types.ObjectId(), currency: 'USD' };
    const refund = {
      _id: new Types.ObjectId(),
      paymentId: new Types.ObjectId(),
      bookingType: 'flight',
      bookingId: new Types.ObjectId(),
      amount: 30,
      stripeRefundId: 're_webhook',
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined),
    };
    refundModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(refund) });
    paymentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'refund.updated',
      data: { object: { id: 're_webhook', status: 'succeeded' } },
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig_verified');

    expect(refund.status).toBe('refunded');
    expect(refund.save).toHaveBeenCalled();
    expect(notificationsService.notify).toHaveBeenCalledWith(
      payment.userId.toString(),
      'REFUND_REFUNDED',
      expect.stringContaining('has been completed'),
      expect.stringContaining('/flight-bookings/'),
    );
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

  it('routes a verified hotel payment success to HotelBookingsService', async () => {
    const payment = {
      bookingType: 'hotel',
      bookingId: new Types.ObjectId(),
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined),
    };
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_hotel_verified' } },
    });
    paymentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });

    await service.handleWebhook(Buffer.from('{}'), 'sig_verified');

    expect(hotelBookingsService.onPaymentSucceeded).toHaveBeenCalledWith(
      payment.bookingId.toString(),
    );
    expect(flightBookingsService.onPaymentSucceeded).not.toHaveBeenCalled();
  });

  it('routes hotel retries through HotelBookingsService amount validation', async () => {
    const bookingId = new Types.ObjectId();
    paymentModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        bookingType: 'hotel',
        bookingId,
        amount: 42,
        stripePaymentIntentId: 'pi_hotel_retry',
        status: 'failed',
      }),
    });

    await expect(service.retryPayment('payment-hotel', 'user-1', 'pm_card_visa'))
      .resolves.toMatchObject({ paymentId: expect.any(String), clientSecret: 'secret_retry' });
    expect(hotelBookingsService.getAmountForPayment).toHaveBeenCalledWith(
      bookingId.toString(),
      'user-1',
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
        amount: 10.5,
        stripePaymentIntentId: 'pi_retry',
        status: 'failed',
      }),
    });

    await expect(
      service.retryPayment('payment-1', 'user-1', 'pm_card_visa'),
    ).resolves.toEqual({ paymentId: expect.any(String), clientSecret: 'secret_retry' });
    expect(paymentModel.findOne).toHaveBeenCalledWith({ _id: 'payment-1', userId: 'user-1' });
    expect(flightBookingsService.getAmountForPayment).toHaveBeenCalledWith(
      bookingId.toString(),
      'user-1',
    );
    expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_retry', {
      payment_method: 'pm_card_visa',
    });
  });

  it('maps Stripe credential errors during retry lookup to 503', async () => {
    paymentModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        bookingType: 'flight',
        bookingId: new Types.ObjectId(),
        amount: 10.5,
        stripePaymentIntentId: 'pi_retry_auth',
        status: 'failed',
      }),
    });
    stripe.paymentIntents.retrieve.mockRejectedValue({ type: 'StripeAuthenticationError' });

    await expect(service.retryPayment('payment-1', 'user-1')).rejects.toMatchObject({
      status: 503,
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
