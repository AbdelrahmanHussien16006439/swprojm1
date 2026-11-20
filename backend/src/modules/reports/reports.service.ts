import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from '../blog/schemas/comment.schema';
import { Post, PostStatus } from '../blog/schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { UserStatus } from '../../common/enums/user-status.enum';
import { Review } from '../reviews/schemas/review.schema';
import { Itinerary } from '../itineraries/schemas/itinerary.schema';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateReportDto } from './dto/create-report.dto';
import { Report, ReportTargetType } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Itinerary.name)
    private readonly itineraryModel: Model<Itinerary>,
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
    switch (targetType) {
      case ReportTargetType.POST:
        await this.assertPublicPost(targetId);
        return;
      case ReportTargetType.COMMENT: {
        const comment = await this.commentModel
          .findOne({ _id: targetId, isHidden: false })
          .select('postId')
          .exec();
        if (!comment) throw new NotFoundException('Report target not found');
        await this.assertPublicPost(comment.postId);
        return;
      }
      case ReportTargetType.REVIEW: {
        const review = await this.reviewModel
          .exists({ _id: targetId, isHidden: false })
          .exec();
        if (!review) throw new NotFoundException('Report target not found');
        return;
      }
      case ReportTargetType.ITINERARY: {
        const itinerary = await this.itineraryModel
          .exists({ _id: targetId, isPublic: true, isHidden: false })
          .exec();
        if (!itinerary) throw new NotFoundException('Report target not found');
        return;
      }
      default:
        throw new NotFoundException('Report target not found');
    }
  }

  private async assertPublicPost(postId: Types.ObjectId): Promise<void> {
    const post = await this.postModel
      .findOne({
        _id: postId,
        status: PostStatus.PUBLISHED,
        isHidden: false,
      })
      .select('authorId')
      .exec();
    if (!post) throw new NotFoundException('Report target not found');

    const activeAuthor = await this.userModel
      .exists({
        _id: post.authorId,
        status: { $ne: UserStatus.DEACTIVATED },
      })
      .exec();
    if (!activeAuthor) throw new NotFoundException('Report target not found');
  }
}
