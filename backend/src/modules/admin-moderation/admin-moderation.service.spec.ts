import { NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  AdminModerationService,
  ModeratedContentType,
} from './admin-moderation.service';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ReportResolutionAction } from './dto/resolve-report.dto';
import { BlogService } from '../blog/blog.service';
import {
  Report,
  ReportStatus,
  ReportTargetType,
} from '../reports/schemas/report.schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const id = new Types.ObjectId();
const adminId = new Types.ObjectId().toString();

function execResult<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function createService(targetType = ReportTargetType.POST) {
  const report: any = {
    _id: id,
    targetId: new Types.ObjectId(),
    targetType,
    reason: 'Spam',
    status: ReportStatus.OPEN,
    save: jest.fn().mockResolvedValue(undefined),
  };
  const reportModel: any = {
    findById: jest.fn().mockReturnValue(execResult(report)),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue(execResult([report])),
        }),
      }),
    }),
    countDocuments: jest.fn().mockReturnValue(execResult(1)),
  };
  const blog: any = {
    setPostHidden: jest.fn().mockResolvedValue(undefined),
    setCommentHidden: jest.fn().mockResolvedValue(undefined),
    deletePostForModeration: jest.fn().mockResolvedValue(undefined),
    deleteCommentForModeration: jest.fn().mockResolvedValue(undefined),
  };
  const review = { _id: new Types.ObjectId(), hotelId: new Types.ObjectId() };
  const reviewModel: any = {
    findByIdAndUpdate: jest.fn().mockReturnValue(execResult(review)),
    findByIdAndDelete: jest.fn().mockReturnValue(execResult(review)),
  };
  const itineraryModel: any = {
    findByIdAndUpdate: jest.fn().mockReturnValue(execResult({ _id: id })),
    findByIdAndDelete: jest.fn().mockReturnValue(execResult({ _id: id })),
  };
  const reviews: any = { recalculateHotelRating: jest.fn().mockResolvedValue(undefined) };
  const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new AdminModerationService(
    reportModel as Model<Report>,
    reviewModel,
    itineraryModel,
    blog as BlogService,
    reviews,
    audit as AuditLogsService,
  );
  return { service, report, reportModel, blog, review, reviewModel, itineraryModel, reviews, audit };
}

describe('AdminModerationService', () => {
  it('lists reports with the shared pagination helper and optional filters', async () => {
    const { service, reportModel } = createService();
    const query = {
      page: 2,
      targetType: ReportTargetType.POST,
      status: ReportStatus.OPEN,
    } as ListReportsQueryDto;

    const result = await service.listReports(query);

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(reportModel.find).toHaveBeenCalledWith({
      targetType: ReportTargetType.POST,
      status: ReportStatus.OPEN,
    });
    expect(reportModel.countDocuments).toHaveBeenCalledWith({
      targetType: ReportTargetType.POST,
      status: ReportStatus.OPEN,
    });
  });

  it.each([
    [ReportResolutionAction.DISMISS, ReportStatus.DISMISSED],
    [ReportResolutionAction.HIDE, ReportStatus.HIDDEN],
    [ReportResolutionAction.DELETE, ReportStatus.DELETED],
  ])(
    'resolves a report with action %s and audits it',
    async (action, status) => {
      const { service, report, blog, audit } = createService();

      const result = await service.resolveReport(
        id.toString(),
        adminId,
        action,
      );

      expect(result.status).toBe(status);
      expect(report.resolvedBy.toString()).toBe(adminId);
      expect(report.resolvedAt).toBeInstanceOf(Date);
      expect(report.save).toHaveBeenCalledTimes(1);
      if (action === ReportResolutionAction.HIDE) {
        expect(blog.setPostHidden).toHaveBeenCalledWith(
          report.targetId.toString(),
          true,
        );
      }
      if (action === ReportResolutionAction.DELETE) {
        expect(blog.deletePostForModeration).toHaveBeenCalledWith(
          report.targetId.toString(),
        );
      }
      expect(audit.log).toHaveBeenCalledWith(
        adminId,
        `REPORT_${action.toUpperCase()}`,
        ReportTargetType.POST,
        report.targetId.toString(),
        expect.objectContaining({ reportId: id.toString(), reason: 'Spam' }),
      );
    },
  );

  it('hides and restores content with distinct audit records', async () => {
    const { service, blog, audit } = createService();

    await service.setContentHidden(
      ModeratedContentType.COMMENT,
      id.toString(),
      adminId,
      true,
    );
    await service.setContentHidden(
      ModeratedContentType.COMMENT,
      id.toString(),
      adminId,
      false,
    );

    expect(blog.setCommentHidden).toHaveBeenNthCalledWith(
      1,
      id.toString(),
      true,
    );
    expect(blog.setCommentHidden).toHaveBeenNthCalledWith(
      2,
      id.toString(),
      false,
    );
    expect(audit.log).toHaveBeenNthCalledWith(
      1,
      adminId,
      'CONTENT_HIDDEN',
      'comment',
      id.toString(),
      { hidden: true },
    );
    expect(audit.log).toHaveBeenNthCalledWith(
      2,
      adminId,
      'CONTENT_UNHIDDEN',
      'comment',
      id.toString(),
      { hidden: false },
    );
  });

  it('deletes posts through cascade cleanup and audits the deletion', async () => {
    const { service, blog, audit } = createService();

    await service.deleteContent(
      ModeratedContentType.POST,
      id.toString(),
      adminId,
    );

    expect(blog.deletePostForModeration).toHaveBeenCalledWith(id.toString());
    expect(audit.log).toHaveBeenCalledWith(
      adminId,
      'CONTENT_DELETED',
      'post',
      id.toString(),
      { cascadeCleanup: true },
    );
  });

  it('deletes comments through BlogService and records audit details', async () => {
    const { service, blog, audit } = createService();

    await service.deleteContent(
      ModeratedContentType.COMMENT,
      id.toString(),
      adminId,
    );

    expect(blog.deleteCommentForModeration).toHaveBeenCalledWith(id.toString());
    expect(audit.log).toHaveBeenCalledWith(
      adminId,
      'CONTENT_DELETED',
      'comment',
      id.toString(),
      { cascadeCleanup: false },
    );
  });

  it('does not audit or resolve when the target is missing', async () => {
    const { service, report, blog, audit } = createService();
    blog.setPostHidden.mockRejectedValue(new NotFoundException());

    await expect(
      service.resolveReport(
        id.toString(),
        adminId,
        ReportResolutionAction.HIDE,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(report.save).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('returns not found and does not audit when directly hiding a missing target', async () => {
    const { service, blog, audit } = createService();
    blog.setCommentHidden.mockRejectedValue(new NotFoundException());

    await expect(
      service.setContentHidden(
        ModeratedContentType.COMMENT,
        id.toString(),
        adminId,
        true,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('hides and deletes reviews and recalculates their hotel rating', async () => {
    const { service, review, reviewModel, reviews, audit } = createService();

    await service.setContentHidden(ModeratedContentType.REVIEW, id.toString(), adminId, true);
    expect(reviewModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { $set: { isHidden: true } },
      { new: true },
    );
    expect(reviews.recalculateHotelRating).toHaveBeenCalledWith(review.hotelId.toString());

    await service.deleteContent(ModeratedContentType.REVIEW, id.toString(), adminId);
    expect(reviewModel.findByIdAndDelete).toHaveBeenCalledWith(id);
    expect(reviews.recalculateHotelRating).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(adminId, 'CONTENT_DELETED', 'review', id.toString(), { cascadeCleanup: false });
  });

  it('hides and deletes public itineraries through the shared model', async () => {
    const { service, itineraryModel, audit } = createService();
    await service.setContentHidden(ModeratedContentType.ITINERARY, id.toString(), adminId, false);
    expect(itineraryModel.findByIdAndUpdate).toHaveBeenCalledWith(id, { $set: { isHidden: false } }, { new: true });
    await service.deleteContent(ModeratedContentType.ITINERARY, id.toString(), adminId);
    expect(itineraryModel.findByIdAndDelete).toHaveBeenCalledWith(id);
    expect(audit.log).toHaveBeenCalledWith(adminId, 'CONTENT_DELETED', 'itinerary', id.toString(), { cascadeCleanup: false });
  });

  it('resolves a review report and recalculates rating after deletion', async () => {
    const { service, report, review, reviews, audit } = createService(ReportTargetType.REVIEW);
    await service.resolveReport(id.toString(), adminId, ReportResolutionAction.DELETE);
    expect(reviews.recalculateHotelRating).toHaveBeenCalledWith(review.hotelId.toString());
    expect(report.status).toBe(ReportStatus.DELETED);
    expect(audit.log).toHaveBeenCalledWith(adminId, 'REPORT_DELETE', 'review', report.targetId.toString(), expect.any(Object));
  });
});
