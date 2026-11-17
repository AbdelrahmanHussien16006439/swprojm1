import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAuditLogsService } from './admin-audit-logs.service';

// Owner: Member 2 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [AuditLogsModule],
  controllers: [AdminAuditLogsController],
  providers: [AdminAuditLogsService],
  exports: [AdminAuditLogsService],
})
export class AdminModerationModule {}
