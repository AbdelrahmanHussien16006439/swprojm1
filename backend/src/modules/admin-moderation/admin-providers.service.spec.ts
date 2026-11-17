import { NotImplementedException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProviderType } from '../../common/enums/provider-type.enum';
import { AdminProvidersService } from './admin-providers.service';
import { PendingProviderModerationIntegration } from './provider-moderation-integration';

describe('AdminProvidersService ACC-15 dependency behavior', () => {
  const adminId = '665f1e77d8e043d0b1c0a111';
  const providerId = '665f1e77d8e043d0b1c0a222';

  it.each([
    ['deactivate', false, 'PROVIDER_DEACTIVATION_UNAVAILABLE'],
    ['reactivate', true, 'PROVIDER_REACTIVATION_UNAVAILABLE'],
  ] as const)(
    'audits %s as not applied and does not claim success when integrations are missing',
    async (operation, isActive, action) => {
      const auditLogs = { log: jest.fn().mockResolvedValue(undefined) };
      const integration = {
        changeStatusAndNotify: jest
          .fn()
          .mockRejectedValue(new NotImplementedException()),
      };
      const service = new AdminProvidersService(
        auditLogs as unknown as AuditLogsService,
        integration,
      );

      await expect(
        service[operation](ProviderType.AIRLINE, providerId, adminId),
      ).rejects.toBeInstanceOf(NotImplementedException);
      expect(auditLogs.log).toHaveBeenCalledWith(
        adminId,
        action,
        ProviderType.AIRLINE,
        providerId,
        {
          outcome: 'not_applied',
          missingIntegration: 'provider, bookings, and notifications',
        },
      );
      expect(integration.changeStatusAndNotify).toHaveBeenCalledWith(
        ProviderType.AIRLINE,
        providerId,
        isActive,
      );
    },
  );

  it('fails closed because the provider lookup, update, and recipient logic are unavailable', async () => {
    await expect(
      new PendingProviderModerationIntegration().changeStatusAndNotify(
        ProviderType.HOTEL,
        providerId,
        false,
      ),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });
});
