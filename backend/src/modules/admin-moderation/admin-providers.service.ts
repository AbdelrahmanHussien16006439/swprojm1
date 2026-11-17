import { Inject, Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProviderType } from '../../common/enums/provider-type.enum';
import { PROVIDER_MODERATION_INTEGRATION } from './provider-moderation-integration';
import type { ProviderModerationIntegration } from './provider-moderation-integration';

@Injectable()
export class AdminProvidersService {
  constructor(
    private readonly auditLogs: AuditLogsService,
    @Inject(PROVIDER_MODERATION_INTEGRATION)
    private readonly providerIntegration: ProviderModerationIntegration,
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
    const action = isActive
      ? 'PROVIDER_REACTIVATION_UNAVAILABLE'
      : 'PROVIDER_DEACTIVATION_UNAVAILABLE';
    await this.auditLogs.log(adminId, action, type, id, {
      outcome: 'not_applied',
      missingIntegration: 'provider, bookings, and notifications',
    });

    await this.providerIntegration.changeStatusAndNotify(type, id, isActive);
  }
}
