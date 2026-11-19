import { NotificationSchema } from './notification.schema';

describe('Notification schema', () => {
  it('uses a Mongoose ObjectId reference for userId', () => {
    expect(NotificationSchema.path('userId').instance).toBe('ObjectId');
    expect(NotificationSchema.path('userId').options.ref).toBe('User');
  });

  it('defaults notifications to unread and timestamps documents', () => {
    expect(NotificationSchema.path('isRead').defaultValue).toBe(false);
    expect(NotificationSchema.options.timestamps).toBe(true);
  });
});
