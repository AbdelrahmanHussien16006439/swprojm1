import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
  ) {}

  /**
   * GEN-07: record an admin action.
   * Example: log(admin.sub, AuditAction.ACCOUNT_SUSPENDED, 'user', userId, { reason })
   */
  async log(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.auditLogModel.create({
      actorId: new Types.ObjectId(actorId),
      action,
      targetType,
      targetId,
      details,
    });
  }
}
