import { Module } from '@nestjs/common';
import { AirlinesModule } from '../airlines/airlines.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { HotelsModule } from '../hotels/hotels.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';

@Module({
  imports: [
    UsersModule,
    AuditLogsModule,
    AirlinesModule,
    HotelsModule,
    NotificationsModule,
  ],
  providers: [AdminAccountsService],
  controllers: [AdminAccountsController],
})
export class AdminAccountsModule {}
