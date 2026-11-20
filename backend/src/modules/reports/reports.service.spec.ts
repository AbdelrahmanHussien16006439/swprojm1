import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types } from 'mongoose';
import { UserStatus } from '../../common/enums/user-status.enum';
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
import { Post, PostStatus } from '../blog/schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { Review } from '../reviews/schemas/review.schema';
import { Itinerary } from '../itineraries/schemas/itinerary.schema';

const reporterId = new Types.ObjectId();
const targetId = new Types.ObjectId();
const user = { sub: reporterId.toString() } as JwtUser;

function execResult<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function selectedResult<T>(value: T) {
  return {
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
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
    findOne: jest
      .fn()
      .mockReturnValue(selectedResult({ authorId: targetId })),
    ...overrides.postModel,
  };
  const commentModel: Record<string, any> = {
    exists: jest.fn().mockReturnValue(execResult({ _id: targetId })),
    findOne: jest.fn().mockReturnValue(selectedResult({ postId: targetId })),
    ...overrides.commentModel,
  };
  const userModel: Record<string, any> = {
    exists: jest.fn().mockReturnValue(execResult({ _id: targetId })),
    ...overrides.userModel,
  };
  const reviewModel: Record<string, any> = {
    exists: jest.fn().mockReturnValue(execResult({ _id: targetId })),
    ...overrides.reviewModel,
  };
  const itineraryModel: Record<string, any> = {
    exists: jest.fn().mockReturnValue(execResult({ _id: targetId })),
    ...overrides.itineraryModel,
  };
  const service = new ReportsService(
    reportModel as unknown as Model<Report>,
    postModel as unknown as Model<Post>,
    commentModel as unknown as Model<Comment>,
    userModel as unknown as Model<User>,
    reviewModel as unknown as Model<Review>,
    itineraryModel as unknown as Model<Itinerary>,
  );
  return {
    service,
    reportModel,
    postModel,
    commentModel,
    userModel,
    reviewModel,
    itineraryModel,
  };
}

describe('ReportsService', () => {
  it('creates a report after confirming an existing post target', async () => {
    const { service, reportModel, postModel, userModel } = makeService();
    const dto = {
      targetType: ReportTargetType.POST,
      targetId: targetId.toString(),
      reason: 'Inappropriate content',
    } as CreateReportDto;

    const result = await service.createReport(user, dto);

    expect(postModel.findOne).toHaveBeenCalledWith({
      _id: targetId,
      status: PostStatus.PUBLISHED,
      isHidden: false,
    });
    expect(userModel.exists).toHaveBeenCalledWith({
      _id: targetId,
      status: { $ne: UserStatus.DEACTIVATED },
    });
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
    expect(postModel.findOne).not.toHaveBeenCalled();
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
      postModel: { findOne: jest.fn().mockReturnValue(selectedResult(null)) },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.POST,
        targetId: targetId.toString(),
        reason: 'Missing post',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 404 when a comment target is hidden or missing', async () => {
    const { service, postModel, commentModel } = makeService({
      commentModel: { findOne: jest.fn().mockReturnValue(selectedResult(null)) },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.COMMENT,
        targetId: targetId.toString(),
        reason: 'Missing comment',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(commentModel.findOne).toHaveBeenCalledWith({
      _id: targetId,
      isHidden: false,
    });
    expect(postModel.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 for a draft or hidden post', async () => {
    const { service, reportModel, userModel } = makeService({
      postModel: { findOne: jest.fn().mockReturnValue(selectedResult(null)) },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.POST,
        targetId: targetId.toString(),
        reason: 'Private post',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(userModel.exists).not.toHaveBeenCalled();
    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it('returns 404 for a comment whose parent post is not public', async () => {
    const { service, reportModel, postModel } = makeService({
      postModel: { findOne: jest.fn().mockReturnValue(selectedResult(null)) },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.COMMENT,
        targetId: targetId.toString(),
        reason: 'Private comment',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(postModel.findOne).toHaveBeenCalledWith({
      _id: targetId,
      status: PostStatus.PUBLISHED,
      isHidden: false,
    });
    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the post author is deactivated', async () => {
    const { service, reportModel } = makeService({
      userModel: { exists: jest.fn().mockReturnValue(execResult(null)) },
    });

    await expect(
      service.createReport(user, {
        targetType: ReportTargetType.POST,
        targetId: targetId.toString(),
        reason: 'Hidden author post',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it.each([
    [ReportTargetType.REVIEW, 'reviewModel', { _id: targetId, isHidden: false }],
    [ReportTargetType.ITINERARY, 'itineraryModel', { _id: targetId, isPublic: true, isHidden: false }],
  ])('checks a public, visible %s before accepting a report', async (targetType, modelKey, filter) => {
    const { service, reviewModel, itineraryModel } = makeService();
    await service.createReport(user, {
      targetType,
      targetId: targetId.toString(),
      reason: 'Needs review',
    } as CreateReportDto);

    const model = modelKey === 'reviewModel' ? reviewModel : itineraryModel;
    expect(model.exists).toHaveBeenCalledWith(filter);
  });

  it.each([
    [ReportTargetType.REVIEW, 'reviewModel'],
    [ReportTargetType.ITINERARY, 'itineraryModel'],
  ])('returns 404 for hidden or private %s targets', async (targetType, modelKey) => {
    const overrides = modelKey === 'reviewModel'
      ? { reviewModel: { exists: jest.fn().mockReturnValue(execResult(null)) } }
      : { itineraryModel: { exists: jest.fn().mockReturnValue(execResult(null)) } };
    const { service, reportModel } = makeService(overrides);
    await expect(service.createReport(user, {
      targetType,
      targetId: targetId.toString(),
      reason: 'Private target',
    } as CreateReportDto)).rejects.toBeInstanceOf(NotFoundException);
    expect(reportModel.create).not.toHaveBeenCalled();
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

  it('rejects report reasons longer than 500 characters', async () => {
    const invalid = plainToInstance(CreateReportDto, {
      targetType: ReportTargetType.POST,
      targetId: targetId.toString(),
      reason: 'x'.repeat(501),
    });
    const errors = await validate(invalid);

    expect(errors.map((error) => error.property)).toContain('reason');
    expect(ReportSchema.path('reason').options.maxlength).toBe(500);
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
