import { Injectable, NotImplementedException } from '@nestjs/common';
import { ProviderType } from '../../common/enums/provider-type.enum';

export const PROVIDER_MODERATION_INTEGRATION = Symbol(
  'PROVIDER_MODERATION_INTEGRATION',
);

/**
 * Integration contract for the owning provider, booking, and notification
 * modules. Implementations must change provider status and notify moderators
 * and upcoming confirmed booking users before reporting success.
 */
export interface ProviderModerationIntegration {
  changeStatusAndNotify(
    type: ProviderType,
    id: string,
    isActive: boolean,
  ): Promise<void>;
}

/**
 * M3, M5, M6 and the booking modules are placeholders in this checkout.
 * Fail closed until those owners provide provider mutation and real recipient
 * discovery/notification methods. This stub never changes provider data.
 */
@Injectable()
export class PendingProviderModerationIntegration implements ProviderModerationIntegration {
  async changeStatusAndNotify(
    type: ProviderType,
    _id: string,
    _isActive: boolean,
  ): Promise<void> {
    throw new NotImplementedException(
      `ACC-15 for ${type} providers is pending provider, booking, and notification integrations`,
    );
  }
}
