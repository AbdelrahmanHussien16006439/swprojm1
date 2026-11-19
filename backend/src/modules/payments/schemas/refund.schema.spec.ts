import { RefundSchema } from './refund.schema';

describe('Refund schema', () => {
  it('uses ObjectId paths for its references', () => {
    for (const path of ['paymentId', 'bookingId']) {
      expect(RefundSchema.path(path).instance).toBe('ObjectId');
    }
  });

  it('uses the required refund states', () => {
    expect(RefundSchema.path('status').enumValues).toEqual([
      'pending',
      'refunded',
      'failed',
    ]);
  });
});
