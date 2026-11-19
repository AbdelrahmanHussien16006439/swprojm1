import { PaymentSchema } from './payment.schema';

describe('Payment schema', () => {
  it('uses ObjectId paths for its references', () => {
    for (const path of ['userId', 'bookingId']) {
      expect(PaymentSchema.path(path).instance).toBe('ObjectId');
    }
  });

  it('stores only the allowed payment states and no card fields', () => {
    expect(PaymentSchema.path('status').enumValues).toEqual([
      'pending',
      'succeeded',
      'failed',
      'cancelled',
    ]);
    expect(PaymentSchema.path('cardNumber')).toBeUndefined();
    expect(PaymentSchema.path('cvc')).toBeUndefined();
    expect(PaymentSchema.path('cardDetails')).toBeUndefined();
  });
});
