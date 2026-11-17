import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { paginate } from '../../common/utils/pagination';
import { AuditLog } from '../audit-logs/schemas/audit-log.schema';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@Injectable()
export class AdminAuditLogsService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  list(query: ListAuditLogsQueryDto) {
    const filter: FilterQuery<AuditLog> = {};
    if (query.actorId) filter.actorId = new Types.ObjectId(query.actorId);
    if (query.action) filter.action = query.action.trim();

    const startDate = query.startDate
      ? this.toDateBound(query.startDate, false)
      : undefined;
    const endDate = query.endDate
      ? this.toDateBound(query.endDate, true)
      : undefined;
    if (query.startDate && query.endDate) {
      if (startDate! > endDate!) {
        throw new BadRequestException(
          'startDate must be before or equal to endDate',
        );
      }
    }

    if (query.startDate || query.endDate) {
      const createdAt: { $gte?: Date; $lte?: Date } = {};
      if (startDate) createdAt.$gte = startDate;
      if (endDate) createdAt.$lte = endDate;
      filter.createdAt = createdAt;
    }

    return paginate(this.auditLogModel, filter, query.page ?? 1, {
      sort: { createdAt: -1 },
    });
  }

  private toDateBound(value: string, endOfDay: boolean): Date {
    const date = new Date(value);
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date.setUTCHours(23, 59, 59, 999);
    }
    return date;
  }
}
