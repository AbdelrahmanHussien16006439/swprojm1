import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { paginate } from '../../common/utils/pagination';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { Notification } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  /** GEN-01: create one in-app notification for a user. */
  async notify(
    userId: string,
    type: string,
    message: string,
    link?: string,
  ): Promise<Notification> {
    return this.notificationModel.create({ userId, type, message, link });
  }

  /** GEN-01: create the same in-app notification for multiple users. */
  async notifyMany(
    userIds: string[],
    type: string,
    message: string,
    link?: string,
  ): Promise<Notification[]> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return [];
    return this.notificationModel.insertMany(
      uniqueIds.map((userId) => ({
        userId: new Types.ObjectId(userId),
        type,
        message,
        link: link ?? null,
      })),
    );
  }

  async listForUser(userId: string, query: ListNotificationsQueryDto) {
    const filter = { userId: new Types.ObjectId(userId) };
    const [result, unreadCount] = await Promise.all([
      paginate(this.notificationModel, filter, query.page, {
        sort: { createdAt: -1, _id: -1 },
      }),
      this.notificationModel.countDocuments({ ...filter, isRead: false }).exec(),
    ]);
    return { ...result, unreadCount };
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId: new Types.ObjectId(userId) },
      { $set: { isRead: true } },
      { new: true },
    ).exec();
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    ).exec();
    return { modifiedCount: result.modifiedCount };
  }
}
