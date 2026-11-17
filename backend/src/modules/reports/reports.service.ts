import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from '../blog/schemas/comment.schema';
import { Post } from '../blog/schemas/post.schema';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateReportDto } from './dto/create-report.dto';
import { Report, ReportTargetType } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
  ) {}

  async createReport(user: JwtUser, dto: CreateReportDto) {
    const targetId = new Types.ObjectId(dto.targetId);
    const existing = await this.reportModel
      .exists({
        reporterId: new Types.ObjectId(user.sub),
        targetType: dto.targetType,
        targetId,
      })
      .exec();
    if (existing) {
      throw new ConflictException('You have already reported this item');
    }
    await this.assertKnownTarget(dto.targetType, targetId);

    try {
      const report = await this.reportModel.create({
        reporterId: new Types.ObjectId(user.sub),
        targetType: dto.targetType,
        targetId,
        reason: dto.reason,
      });
      return {
        id: report._id.toString(),
        reporterId: report.reporterId.toString(),
        targetType: report.targetType,
        targetId: report.targetId.toString(),
        reason: report.reason,
        status: report.status,
        resolvedBy: report.resolvedBy?.toString() ?? null,
        resolvedAt: report.resolvedAt,
        createdAt: report.createdAt,
      };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('You have already reported this item');
      }
      throw error;
    }
  }

  private async assertKnownTarget(
    targetType: ReportTargetType,
    targetId: Types.ObjectId,
  ): Promise<void> {
    let exists: boolean;
    switch (targetType) {
      case ReportTargetType.POST:
        exists = Boolean(await this.postModel.exists({ _id: targetId }).exec());
        break;
      case ReportTargetType.COMMENT:
        exists = Boolean(
          await this.commentModel.exists({ _id: targetId }).exec(),
        );
        break;
      case ReportTargetType.REVIEW:
      case ReportTargetType.ITINERARY:
        // Their modules have no schemas/services in this checkout. The DTO still
        // validates ObjectId syntax; existence checks can be added when merged.
        return;
      default:
        throw new NotFoundException('Report target not found');
    }

    if (!exists) throw new NotFoundException('Report target not found');
  }
}
