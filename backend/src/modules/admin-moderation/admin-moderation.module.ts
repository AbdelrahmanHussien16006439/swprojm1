import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdminProvidersController } from './admin-providers.controller';
import { AdminProvidersService } from './admin-providers.service';
import {
  PendingProviderModerationIntegration,
  PROVIDER_MODERATION_INTEGRATION,
} from './provider-moderation-integration';

// Owner: Member 2 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [AuditLogsModule],
  controllers: [AdminProvidersController],
  providers: [
    AdminProvidersService,
    PendingProviderModerationIntegration,
    {
      provide: PROVIDER_MODERATION_INTEGRATION,
      useExisting: PendingProviderModerationIntegration,
    },
  ],
  exports: [AdminProvidersService],
})
export class AdminModerationModule {}
