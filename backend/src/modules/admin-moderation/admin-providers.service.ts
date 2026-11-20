import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProviderType } from '../../common/enums/provider-type.enum';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/schemas/user.schema';
import { AirlinesService } from '../airlines/airlines.service';
import { HotelsService } from '../hotels/hotels.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminProvidersService {
  constructor(
    private readonly auditLogs: AuditLogsService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly airlinesService: AirlinesService,
    private readonly hotelsService: HotelsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  deactivate(type: ProviderType, id: string, adminId: string): Promise<void> {
    return this.changeStatus(type, id, adminId, false);
  }

  reactivate(type: ProviderType, id: string, adminId: string): Promise<void> {
    return this.changeStatus(type, id, adminId, true);
  }

  private async changeStatus(
    type: ProviderType,
    id: string,
    adminId: string,
    isActive: boolean,
  ): Promise<void> {
    const providerId = new Types.ObjectId(id);
    const role =
      type === ProviderType.AIRLINE
        ? Role.AIRLINE_MODERATOR
        : Role.HOTEL_MODERATOR;
    const moderators = await this.userModel
      .find({ providerId, providerType: type, role })
      .select('_id')
      .exec();

    if (type === ProviderType.AIRLINE) {
      await this.airlinesService.setActive(id, isActive);
    } else {
      await this.hotelsService.setActive(id, isActive);
    }

    const action = isActive ? 'PROVIDER_REACTIVATED' : 'PROVIDER_DEACTIVATED';
    await this.auditLogs.log(adminId, action, type, id, {
      isActive,
      moderatorCount: moderators.length,
    });
    const message = isActive
      ? 'Your provider has been reactivated.'
      : 'Your provider has been deactivated.';
    await this.notificationsService.notifyMany(
      moderators.map((moderator) => moderator._id.toString()),
      action,
      message,
    );
  }
}
