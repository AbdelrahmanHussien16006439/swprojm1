import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { paginate } from '../../common/utils/pagination';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BlogService } from '../blog/blog.service';
import {
  Report,
  ReportStatus,
  ReportTargetType,
} from '../reports/schemas/report.schema';
import { Review } from '../reviews/schemas/review.schema';
import { ReviewsService } from '../reviews/reviews.service';
import { Itinerary } from '../itineraries/schemas/itinerary.schema';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ReportResolutionAction } from './dto/resolve-report.dto';

export enum ModeratedContentType {
  POST = 'post',
  COMMENT = 'comment',
  REVIEW = 'review',
  ITINERARY = 'itinerary',
}

@Injectable()
export class AdminModerationService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<Itinerary>,
    private readonly blogService: BlogService,
    private readonly reviewsService: ReviewsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  listReports(query: ListReportsQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.targetType) filter.targetType = query.targetType;
    if (query.status) filter.status = query.status;
    return paginate(this.reportModel, filter, query.page ?? 1, {
      sort: { createdAt: -1 },
    });
  }

  async resolveReport(
    reportId: string,
    adminId: string,
    action: ReportResolutionAction,
  ) {
    const report = await this.reportModel.findById(reportId).exec();
    if (!report) throw new NotFoundException('Report not found');

    if (action !== ReportResolutionAction.DISMISS) {
      await this.moderateTarget(
        report.targetType,
        report.targetId.toString(),
        action,
      );
    }

    report.status = this.statusForAction(action);
    report.resolvedBy = new Types.ObjectId(adminId);
    report.resolvedAt = new Date();
    await report.save();
    await this.auditLogs.log(
      adminId,
      `REPORT_${action.toUpperCase()}`,
      report.targetType,
      report.targetId.toString(),
      { reportId: report._id.toString(), reason: report.reason },
    );
    return {
      id: report._id.toString(),
      status: report.status,
      resolvedBy: report.resolvedBy.toString(),
      resolvedAt: report.resolvedAt,
    };
  }

  async setContentHidden(
    type: ModeratedContentType,
    id: string,
    adminId: string,
    hidden: boolean,
  ): Promise<{ message: string; hidden: boolean }> {
    switch (type) {
      case ModeratedContentType.POST:
        await this.blogService.setPostHidden(id, hidden);
        break;
      case ModeratedContentType.COMMENT:
        await this.blogService.setCommentHidden(id, hidden);
        break;
      case ModeratedContentType.REVIEW:
        await this.setReviewHidden(id, hidden);
        break;
      case ModeratedContentType.ITINERARY:
        await this.setItineraryHidden(id, hidden);
        break;
    }
    await this.auditLogs.log(
      adminId,
      hidden ? 'CONTENT_HIDDEN' : 'CONTENT_UNHIDDEN',
      type,
      id,
      { hidden },
    );
    return { message: hidden ? 'Content hidden' : 'Content restored', hidden };
  }

  async deleteContent(
    type: ModeratedContentType,
    id: string,
    adminId: string,
  ): Promise<{ message: string }> {
    switch (type) {
      case ModeratedContentType.POST:
        await this.blogService.deletePostForModeration(id);
        break;
      case ModeratedContentType.COMMENT:
        await this.blogService.deleteCommentForModeration(id);
        break;
      case ModeratedContentType.REVIEW:
        await this.deleteReview(id);
        break;
      case ModeratedContentType.ITINERARY: {
        const deleted = await this.itineraryModel
          .findByIdAndDelete(new Types.ObjectId(id))
          .exec();
        if (!deleted) throw new NotFoundException('Content not found');
        break;
      }
    }
    await this.auditLogs.log(adminId, 'CONTENT_DELETED', type, id, {
      cascadeCleanup: type === ModeratedContentType.POST,
    });
    return { message: 'Content deleted' };
  }

  private async moderateTarget(
    type: ReportTargetType,
    id: string,
    action: ReportResolutionAction.HIDE | ReportResolutionAction.DELETE,
  ) {
    if (type === ReportTargetType.POST) {
      if (action === ReportResolutionAction.HIDE) {
        await this.blogService.setPostHidden(id, true);
      } else {
        await this.blogService.deletePostForModeration(id);
      }
      return;
    }
    if (type === ReportTargetType.COMMENT) {
      if (action === ReportResolutionAction.HIDE) {
        await this.blogService.setCommentHidden(id, true);
      } else {
        await this.blogService.deleteCommentForModeration(id);
      }
      return;
    }

    if (type === ReportTargetType.REVIEW) {
      if (action === ReportResolutionAction.HIDE) {
        await this.setReviewHidden(id, true);
      } else {
        await this.deleteReview(id);
      }
      return;
    }
    if (type === ReportTargetType.ITINERARY) {
      if (action === ReportResolutionAction.HIDE) {
        await this.setItineraryHidden(id, true);
      } else {
        const deleted = await this.itineraryModel
          .findByIdAndDelete(new Types.ObjectId(id))
          .exec();
        if (!deleted) throw new NotFoundException('Content not found');
      }
    }
  }

  private async setReviewHidden(id: string, hidden: boolean): Promise<void> {
    const review = await this.reviewModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: { isHidden: hidden } },
        { new: true },
      )
      .exec();
    if (!review) throw new NotFoundException('Content not found');
    await this.reviewsService.recalculateHotelRating(review.hotelId.toString());
  }

  private async setItineraryHidden(id: string, hidden: boolean): Promise<void> {
    const itinerary = await this.itineraryModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: { isHidden: hidden } },
        { new: true },
      )
      .exec();
    if (!itinerary) throw new NotFoundException('Content not found');
  }

  private async deleteReview(id: string): Promise<void> {
    const review = await this.reviewModel
      .findByIdAndDelete(new Types.ObjectId(id))
      .exec();
    if (!review) throw new NotFoundException('Content not found');
    await this.reviewsService.recalculateHotelRating(review.hotelId.toString());
  }

  private statusForAction(action: ReportResolutionAction): ReportStatus {
    switch (action) {
      case ReportResolutionAction.DISMISS:
        return ReportStatus.DISMISSED;
      case ReportResolutionAction.HIDE:
        return ReportStatus.HIDDEN;
      case ReportResolutionAction.DELETE:
        return ReportStatus.DELETED;
    }
  }
}
