import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

// The audit-log viewer endpoint (GET /api/admin/audit-logs) is built by Member 2 using this model.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  providers: [AuditLogsService],
  exports: [AuditLogsService, MongooseModule],
})
export class AuditLogsModule {}
