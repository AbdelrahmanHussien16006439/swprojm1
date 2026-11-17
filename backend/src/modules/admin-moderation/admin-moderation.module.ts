import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BlogModule } from '../blog/blog.module';
import { ReportsModule } from '../reports/reports.module';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminModerationService } from './admin-moderation.service';

// Owner: Member 2 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [ReportsModule, BlogModule, AuditLogsModule],
  controllers: [AdminModerationController],
  providers: [AdminModerationService],
  exports: [AdminModerationService],
})
export class AdminModerationModule {}
