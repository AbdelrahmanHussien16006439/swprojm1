import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';
import {
  Report,
  ReportSchema,
  ReportStatus,
  ReportTargetType,
} from './schemas/report.schema';
import { Comment } from '../blog/schemas/comment.schema';
import { Post } from '../blog/schemas/post.schema';

const reporterId = new Types.ObjectId();
const targetId = new Types.ObjectId();
const user = { sub: reporterId.toString() } as JwtUser;

function execResult<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function makeService(overrides: Record<string, any> = {}) {
  const reportModel: Record<string, any> = {
    exists: jest.fn().mockReturnValue(execResult(null)),
    create: jest.fn().mockImplementation(async (data) => ({
      _id: new Types.ObjectId(),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      ...data,
      status: 'open',
    })),
    ...overrides.reportModel,
  };
  const postModel: Record<string, any> = {
    exists: jest.fn().mockReturnValue(execResult({ _id: targetId })),
    ...overrides.postModel,
  };
  const commentModel: Record<string, any> = {
    exists: jest.fn().mockReturnValue(execResult({ _id: targetId })),
    ...overrides.commentModel,
  };
  const service = new ReportsService(
    reportModel as unknown as Model<Report>,
    postModel as unknown as Model<Post>,
    commentModel as unknown as Model<Comment>,
  );
  return { service, reportModel, postModel, commentModel };
}

describe('ReportsService', () => {
  it('creates a report after confirming an existing post target', async () => {
    const { service, reportModel, postModel } = makeService();
    const dto = {
      targetType: ReportTargetType.POST,
      targetId: targetId.toString(),
      reason: 'Inappropriate content',
    } as CreateReportDto;

    const result = await service.createReport(user, dto);

    expect(postModel.exists).toHaveBeenCalledWith({ _id: targetId });
    expect(reportModel.create).toHaveBeenCalledWith({
      reporterId,
      targetType: ReportTargetType.POST,
      targetId,
      reason: dto.reason,
    });
    expect(result.status).toBe('open');
  });

  it('returns HTTP 409 when the reporter already reported the same item', async () => {
    const { service, reportModel, postModel } = makeService({
      reportModel: {
        exists: jest
          .fn()
          .mockReturnValue(execResult({ _id: new Types.ObjectId() })),
      },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.POST,
        targetId: targetId.toString(),
        reason: 'Duplicate',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(postModel.exists).not.toHaveBeenCalled();
    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it('returns HTTP 409 for concurrent duplicate inserts rejected by the unique index', async () => {
    const { service } = makeService({
      reportModel: {
        create: jest.fn().mockRejectedValue({ code: 11000 }),
      },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.POST,
        targetId: targetId.toString(),
        reason: 'Duplicate race',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when a post or comment target does not exist', async () => {
    const { service } = makeService({
      postModel: { exists: jest.fn().mockReturnValue(execResult(null)) },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.POST,
        targetId: targetId.toString(),
        reason: 'Missing post',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 404 when a comment target does not exist', async () => {
    const { service, postModel, commentModel } = makeService({
      commentModel: { exists: jest.fn().mockReturnValue(execResult(null)) },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.COMMENT,
        targetId: targetId.toString(),
        reason: 'Missing comment',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(commentModel.exists).toHaveBeenCalledWith({ _id: targetId });
    expect(postModel.exists).not.toHaveBeenCalled();
  });

  it('validates target type, Mongo id syntax, and a non-blank reason', async () => {
    const invalid = plainToInstance(CreateReportDto, {
      targetType: 'flight',
      targetId: 'not-an-id',
      reason: '   ',
    });
    const errors = await validate(invalid);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['targetType', 'targetId', 'reason']),
    );
  });

  it('uses the required target/status enums and unique compound index', () => {
    expect(ReportSchema.path('targetType').enumValues).toEqual(
      Object.values(ReportTargetType),
    );
    expect(ReportSchema.path('status').enumValues).toEqual(
      Object.values(ReportStatus),
    );
    expect(ReportSchema.indexes()).toContainEqual([
      { reporterId: 1, targetType: 1, targetId: 1 },
      { unique: true, background: true },
    ]);
  });
});
