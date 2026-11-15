import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UsersModule } from '../users/users.module';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';

@Module({
  imports: [UsersModule, AuditLogsModule],
  providers: [AdminAccountsService],
  controllers: [AdminAccountsController],
})
export class AdminAccountsModule {}
