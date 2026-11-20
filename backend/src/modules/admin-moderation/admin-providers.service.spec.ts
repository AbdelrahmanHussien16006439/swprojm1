import { Model, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProviderType } from '../../common/enums/provider-type.enum';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/schemas/user.schema';
import { AirlinesService } from '../airlines/airlines.service';
import { HotelsService } from '../hotels/hotels.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminProvidersService } from './admin-providers.service';

describe('AdminProvidersService ACC-15 integrations', () => {
  const adminId = '665f1e77d8e043d0b1c0a111';
  const providerId = '665f1e77d8e043d0b1c0a222';
  const moderatorId = new Types.ObjectId();

  function createService() {
    const moderators = [{ _id: moderatorId }];
    const userModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(moderators) }),
      }),
    };
    const airlines = { setActive: jest.fn().mockResolvedValue(undefined) };
    const hotels = { setActive: jest.fn().mockResolvedValue(undefined) };
    const notifications = { notifyMany: jest.fn().mockResolvedValue(undefined) };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminProvidersService(
      audit as unknown as AuditLogsService,
      userModel as unknown as Model<User>,
      airlines as unknown as AirlinesService,
      hotels as unknown as HotelsService,
      notifications as unknown as NotificationsService,
    );
    return { service, userModel, airlines, hotels, notifications, audit };
  }

  it.each([
    [ProviderType.AIRLINE, false, Role.AIRLINE_MODERATOR, 'PROVIDER_DEACTIVATED'],
    [ProviderType.AIRLINE, true, Role.AIRLINE_MODERATOR, 'PROVIDER_REACTIVATED'],
    [ProviderType.HOTEL, false, Role.HOTEL_MODERATOR, 'PROVIDER_DEACTIVATED'],
    [ProviderType.HOTEL, true, Role.HOTEL_MODERATOR, 'PROVIDER_REACTIVATED'],
  ])('updates %s status, notifies its moderator, and audits the change', async (type, isActive, role, action) => {
    const { service, userModel, airlines, hotels, notifications, audit } = createService();
    await (isActive
      ? service.reactivate(type, providerId, adminId)
      : service.deactivate(type, providerId, adminId));

    expect(userModel.find).toHaveBeenCalledWith({
      providerId: new Types.ObjectId(providerId),
      providerType: type,
      role,
    });
    expect(type === ProviderType.AIRLINE ? airlines.setActive : hotels.setActive)
      .toHaveBeenCalledWith(providerId, isActive);
    expect(notifications.notifyMany).toHaveBeenCalledWith(
      [moderatorId.toString()],
      action,
      isActive
        ? 'Your provider has been reactivated.'
        : 'Your provider has been deactivated.',
    );
    expect(audit.log).toHaveBeenCalledWith(adminId, action, type, providerId, {
      isActive,
      moderatorCount: 1,
    });
  });
});
