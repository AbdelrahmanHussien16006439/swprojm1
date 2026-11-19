import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let model: {
    create: jest.Mock;
    insertMany: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
    findOneAndUpdate: jest.Mock;
    updateMany: jest.Mock;
  };

  beforeEach(() => {
    model = {
      create: jest.fn(),
      insertMany: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateMany: jest.fn(),
    };
    service = new NotificationsService(model as never);
  });

  it('creates a notification for one user', async () => {
    model.create.mockResolvedValue({ type: 'BOOKING_CONFIRMED' });
    await expect(
      service.notify('665f1d4a2a8c7b4e5f123456', 'BOOKING_CONFIRMED', 'Confirmed'),
    ).resolves.toEqual({ type: 'BOOKING_CONFIRMED' });
    expect(model.create).toHaveBeenCalledWith({
      userId: '665f1d4a2a8c7b4e5f123456',
      type: 'BOOKING_CONFIRMED',
      message: 'Confirmed',
      link: undefined,
    });
  });

  it('creates one notification per unique recipient', async () => {
    model.insertMany.mockResolvedValue([]);
    const user1 = '665f1d4a2a8c7b4e5f123456';
    const user2 = '665f1d4a2a8c7b4e5f123457';
    await service.notifyMany([user1, user1, user2], 'NOTICE', 'Hello', '/inbox');
    const inserted = model.insertMany.mock.calls[0][0];
    expect(inserted).toHaveLength(2);
    expect(inserted.map((item: { userId: Types.ObjectId }) => item.userId.toString())).toEqual([
      user1,
      user2,
    ]);
    expect(inserted[0]).toMatchObject({ type: 'NOTICE', message: 'Hello', link: '/inbox' });
  });

  it('returns empty for no recipients without writing', async () => {
    await expect(service.notifyMany([], 'NOTICE', 'Hello')).resolves.toEqual([]);
    expect(model.insertMany).not.toHaveBeenCalled();
  });

  it('does not mark another user\'s notification as read', async () => {
    model.findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) });
    await expect(
      service.markRead('665f1d4a2a8c7b4e5f123456', new Types.ObjectId().toString()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
