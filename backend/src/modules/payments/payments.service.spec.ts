import { BadRequestException, NotFoundException, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { FlightBooking } from '../flight-bookings/schemas/flight-booking.schema';
import { Payment } from './schemas/payment.schema';
import { Refund } from './schemas/refund.schema';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentModel: { create: jest.Mock; findById: jest.Mock };
  let refundModel: { create: jest.Mock };
  let bookingModel: { findOne: jest.Mock };
  let stripe: {
    paymentIntents: { create: jest.Mock; confirm: jest.Mock; cancel: jest.Mock };
    refunds: { create: jest.Mock };
  };

  beforeEach(() => {
    paymentModel = { create: jest.fn(), findById: jest.fn() };
    refundModel = { create: jest.fn() };
    bookingModel = { findOne: jest.fn() };
    stripe = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' }),
        confirm: jest.fn().mockResolvedValue({ status: 'succeeded' }),
        cancel: jest.fn().mockResolvedValue({ status: 'canceled' }),
      },
      refunds: { create: jest.fn() },
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('USD'),
    } as unknown as ConfigService;
    service = new PaymentsService(
      paymentModel as unknown as Model<Payment>,
      refundModel as unknown as Model<Refund>,
      bookingModel as unknown as Model<FlightBooking>,
      config,
      stripe as unknown as Stripe,
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
    expect(service.calculateRefundPercent([{ daysBefore: 7, refundPercent: 50 }], 2)).toBe(0);
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
      expect.objectContaining({ amount: 1050, currency: 'usd' }),
    );
    expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test', {
      payment_method: 'pm_card_visa',
    });
    expect(paymentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10.5, currency: 'USD', status: 'pending' }),
    );
    expect(JSON.stringify(paymentModel.create.mock.calls)).not.toContain('pm_card_visa');
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

    await expect(service.createRefund('payment-1', 40, 50, 'user cancellation')).resolves.toBe(refund);
    expect(stripe.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_paid',
      amount: 4000,
    });
    expect(refund).toMatchObject({ stripeRefundId: 're_test', status: 'refunded' });
    expect(refund.save).toHaveBeenCalled();
  });
});
