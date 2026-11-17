import {
  Injectable,
  NotFoundException,
  NotImplementedException,
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
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ReportResolutionAction } from './dto/resolve-report.dto';

export enum ModeratedContentType {
  POST = 'post',
  COMMENT = 'comment',
}

@Injectable()
export class AdminModerationService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    private readonly blogService: BlogService,
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
    if (type === ModeratedContentType.POST) {
      await this.blogService.setPostHidden(id, hidden);
    } else {
      await this.blogService.setCommentHidden(id, hidden);
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
    if (type === ModeratedContentType.POST) {
      await this.blogService.deletePostForModeration(id);
    } else {
      await this.blogService.deleteCommentForModeration(id);
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

    // Review and itinerary modules belong to other members and do not yet
    // expose moderation methods. Keep the integration boundary explicit.
    throw new NotImplementedException(
      `Moderation for ${type} targets is pending the owning module integration`,
    );
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
