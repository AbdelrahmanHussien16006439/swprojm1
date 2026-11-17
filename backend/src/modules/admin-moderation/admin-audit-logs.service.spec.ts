import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types } from 'mongoose';
import { AuditLog } from '../audit-logs/schemas/audit-log.schema';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

function execResult<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function makeService(rows: unknown[] = [], total = rows.length) {
  const query = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(rows),
  };
  const auditLogModel: any = {
    find: jest.fn().mockReturnValue(query),
    countDocuments: jest.fn().mockReturnValue(execResult(total)),
  };
  const service = new AdminAuditLogsService(auditLogModel as Model<AuditLog>);
  return { service, auditLogModel, query };
}

describe('AdminAuditLogsService', () => {
  it('uses shared pagination with a fixed limit of ten', async () => {
    const { service, auditLogModel, query } = makeService(
      [{ action: 'LOGIN' }],
      12,
    );

    const result = await service.list({ page: 2 } as ListAuditLogsQueryDto);

    expect(auditLogModel.find).toHaveBeenCalledWith({});
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      data: [{ action: 'LOGIN' }],
      page: 2,
      limit: 10,
      total: 12,
      totalPages: 2,
    });
  });

  it('filters by actor id', async () => {
    const actorId = new Types.ObjectId().toString();
    const { service, auditLogModel } = makeService();

    await service.list({ actorId } as ListAuditLogsQueryDto);

    expect(auditLogModel.find).toHaveBeenCalledWith({
      actorId: new Types.ObjectId(actorId),
    });
  });

  it('filters by action', async () => {
    const { service, auditLogModel } = makeService();

    await service.list({ action: 'CONTENT_HIDDEN' } as ListAuditLogsQueryDto);

    expect(auditLogModel.find).toHaveBeenCalledWith({
      action: 'CONTENT_HIDDEN',
    });
  });

  it('filters by an inclusive creation date range', async () => {
    const { service, auditLogModel } = makeService();
    const startDate = '2026-11-01T00:00:00.000Z';
    const endDate = '2026-11-30T23:59:59.999Z';

    await service.list({ startDate, endDate } as ListAuditLogsQueryDto);

    expect(auditLogModel.find).toHaveBeenCalledWith({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });
  });

  it('allows either date bound independently', async () => {
    const { service, auditLogModel } = makeService();

    await service.list({
      startDate: '2026-11-01T00:00:00.000Z',
    } as ListAuditLogsQueryDto);

    expect(auditLogModel.find).toHaveBeenCalledWith({
      createdAt: { $gte: new Date('2026-11-01T00:00:00.000Z') },
    });
  });

  it('includes the full UTC day when endDate is date-only', async () => {
    const { service, auditLogModel } = makeService();

    await service.list({ endDate: '2026-11-30' } as ListAuditLogsQueryDto);

    expect(auditLogModel.find).toHaveBeenCalledWith({
      createdAt: { $lte: new Date('2026-11-30T23:59:59.999Z') },
    });
  });

  it('rejects an inverted date range with HTTP 400', async () => {
    const { service, auditLogModel } = makeService();

    expect(() =>
      service.list({
        startDate: '2026-11-30T00:00:00.000Z',
        endDate: '2026-11-01T00:00:00.000Z',
      } as ListAuditLogsQueryDto),
    ).toThrow(BadRequestException);
    expect(auditLogModel.find).not.toHaveBeenCalled();
  });

  it('returns the standard empty paginated response when there are no matches', async () => {
    const { service } = makeService([], 0);

    await expect(
      service.list({ page: 1 } as ListAuditLogsQueryDto),
    ).resolves.toEqual({
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it('validates malformed date query values', async () => {
    const dto = plainToInstance(ListAuditLogsQueryDto, {
      startDate: 'not-a-date',
      endDate: '2026-02-30T00:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['startDate', 'endDate']),
    );
  });
});
