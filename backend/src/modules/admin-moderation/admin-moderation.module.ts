import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdminProvidersController } from './admin-providers.controller';
import { AdminProvidersService } from './admin-providers.service';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { BlogModule } from '../blog/blog.module';
import { ReportsModule } from '../reports/reports.module';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminModerationService } from './admin-moderation.service';
import { ReviewsModule } from '../reviews/reviews.module';
import { ItinerariesModule } from '../itineraries/itineraries.module';
import { AirlinesModule } from '../airlines/airlines.module';
import { HotelsModule } from '../hotels/hotels.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

// Owner: Member 2 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    ReportsModule,
    BlogModule,
    AuditLogsModule,
    ReviewsModule,
    ItinerariesModule,
    AirlinesModule,
    HotelsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [
    AdminProvidersController,
    AdminAuditLogsController,
    AdminModerationController,
  ],
  providers: [
    AdminProvidersService,
    AdminAuditLogsService,
    AdminModerationService,
  ],
  exports: [
    AdminProvidersService,
    AdminAuditLogsService,
    AdminModerationService,
  ],
})
export class AdminModerationModule {}
