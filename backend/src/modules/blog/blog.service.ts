import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage, Types } from 'mongoose';
import { unlink } from 'fs/promises';
import { resolve } from 'path';
import {
  PAGE_SIZE,
  paginate,
  toPaginated,
} from '../../common/utils/pagination';
import { escapeRegex } from '../../common/utils/escape-regex';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { User } from '../users/schemas/user.schema';
import type { UserDocument } from '../users/schemas/user.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Comment } from './schemas/comment.schema';
import { Like } from './schemas/like.schema';
import { Post, PostDocument, PostStatus } from './schemas/post.schema';

interface PublicPostSummary {
  _id: Types.ObjectId;
  title: string;
  author: { id: Types.ObjectId; name: string };
  date: Date;
  excerpt: string;
  likesCount: number;
  commentsCount: number;
}

interface PublicPostAggregate {
  data: PublicPostSummary[];
  total: { count: number }[];
}

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Like.name) private readonly likeModel: Model<Like>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async createPost(user: JwtUser, dto: CreatePostDto) {
    const status = dto.status ?? PostStatus.DRAFT;
    const post = await this.postModel.create({
      authorId: new Types.ObjectId(user.sub),
      title: dto.title,
      body: dto.body,
      tags: dto.tags ?? [],
      images: dto.images ?? [],
      status,
      publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
    });
    return this.toPostResponse(post);
  }

  async listPublicPosts(query: ListPostsQueryDto) {
    const page = query.page ?? 1;
    const match: Record<string, unknown> = {
      status: PostStatus.PUBLISHED,
      isHidden: false,
    };
    if (query.tag) match.tags = query.tag;

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      { $match: { 'author.status': { $ne: UserStatus.DEACTIVATED } } },
    ];

    if (query.q) {
      const pattern = new RegExp(escapeRegex(query.q), 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: pattern },
            { tags: pattern },
            { 'author.name': pattern },
          ],
        },
      });
    }

    pipeline.push(
      {
        $addFields: {
          interactionScore: {
            $add: [
              { $ifNull: ['$likesCount', 0] },
              { $ifNull: ['$commentsCount', 0] },
            ],
          },
        },
      },
      {
        $facet: {
          data: [
            {
              $sort: query.q
                ? { interactionScore: -1, createdAt: -1 }
                : { createdAt: -1 },
            },
            { $skip: (page - 1) * PAGE_SIZE },
            { $limit: PAGE_SIZE },
            {
              $project: {
                _id: 1,
                title: 1,
                author: { id: '$author._id', name: '$author.name' },
                date: { $ifNull: ['$publishedAt', '$createdAt'] },
                excerpt: { $substrCP: ['$body', 0, 200] },
                likesCount: 1,
                commentsCount: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    );

    const [result] = await this.postModel
      .aggregate<PublicPostAggregate>(pipeline)
      .exec();
    const data = (result?.data ?? []).map((post) => ({
      id: post._id.toString(),
      title: post.title,
      author: { id: post.author.id.toString(), name: post.author.name },
      date: post.date,
      excerpt: post.excerpt,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
    }));
    return toPaginated(data, result?.total[0]?.count ?? 0, page);
  }

  async listMyPosts(userId: string, page = 1) {
    const result = await paginate(
      this.postModel,
      { authorId: new Types.ObjectId(userId) } as FilterQuery<Post>,
      page,
      {
        select: 'title status createdAt publishedAt likesCount commentsCount',
        sort: { createdAt: -1 },
      },
    );

    return {
      ...result,
      data: result.data.map((item) => {
        const post = item as PostDocument;
        return {
          id: post._id.toString(),
          title: post.title,
          status: post.status,
          date: post.publishedAt ?? post.createdAt,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
        };
      }),
    };
  }

  async getPost(id: string, viewer?: JwtUser) {
    const post = await this.postModel
      .findById(id)
      .populate({ path: 'authorId', select: 'name status' })
      .exec();
    if (!post) throw new NotFoundException('Post not found');

    const author = post.authorId as unknown as UserDocument;
    if (!author || author.status === UserStatus.DEACTIVATED) {
      throw new NotFoundException('Post not found');
    }

    const isAuthor = author._id.toString() === viewer?.sub;
    const isAdmin = viewer?.role === Role.ADMIN;
    if (post.status !== PostStatus.PUBLISHED && !isAuthor) {
      throw new NotFoundException('Post not found');
    }
    if (post.isHidden && !isAuthor && !isAdmin) {
      throw new NotFoundException('Post not found');
    }

    const commentFilter: FilterQuery<Comment> = isAdmin
      ? { postId: post._id }
      : viewer
        ? {
            postId: post._id,
            $or: [
              { isHidden: false },
              { authorId: new Types.ObjectId(viewer.sub) },
            ],
          }
        : { postId: post._id, isHidden: false };
    const comments = await this.commentModel
      .find(commentFilter)
      .sort({ createdAt: 1 })
      .populate({ path: 'authorId', select: 'name status' })
      .exec();

    return {
      id: post._id.toString(),
      title: post.title,
      author: { id: author._id.toString(), name: author.name },
      date: post.publishedAt ?? post.createdAt,
      body: post.body,
      tags: post.tags,
      images: post.images,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      comments: comments.map((comment) => {
        const commentAuthor = comment.authorId as unknown as UserDocument;
        return {
          id: comment._id.toString(),
          text: comment.text,
          date: comment.createdAt,
          isHidden: comment.isHidden,
          author: {
            id: commentAuthor?._id.toString(),
            name:
              commentAuthor?.status === UserStatus.DEACTIVATED
                ? 'Deleted user'
                : commentAuthor?.name,
          },
        };
      }),
    };
  }

  async updatePost(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.findOwnedPost(id, userId);
    if (dto.title !== undefined) post.title = dto.title;
    if (dto.body !== undefined) post.body = dto.body;
    if (dto.tags !== undefined) post.tags = dto.tags;
    if (dto.status !== undefined && dto.status !== post.status) {
      post.status = dto.status;
      post.publishedAt =
        dto.status === PostStatus.PUBLISHED ? new Date() : null;
    }
    await post.save();
    return this.toPostResponse(post);
  }

  async deletePost(id: string, userId: string): Promise<{ message: string }> {
    const post = await this.findOwnedPost(id, userId);
    await Promise.all([
      this.commentModel.deleteMany({ postId: post._id }).exec(),
      this.likeModel.deleteMany({ postId: post._id }).exec(),
    ]);
    await post.deleteOne();
    await this.removeUploadedImages(post.images ?? []);
    return { message: 'Post deleted' };
  }

  private async findOwnedPost(id: string, userId: string) {
    const post = await this.postModel.findById(id).exec();
    if (!post || post.authorId.toString() !== userId) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  private toPostResponse(post: PostDocument) {
    return {
      id: post._id.toString(),
      authorId: post.authorId.toString(),
      title: post.title,
      body: post.body,
      status: post.status,
      tags: post.tags,
      images: post.images,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      publishedAt: post.publishedAt,
      isHidden: post.isHidden,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private async removeUploadedImages(images: string[]): Promise<void> {
    const uploadsDirectory = resolve(__dirname, '../../../uploads');
    const safeImageUrls = new Set(
      images.filter((url) =>
        /^\/uploads\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(?:jpg|png)$/i.test(
          url,
        ),
      ),
    );

    await Promise.all(
      [...safeImageUrls].map(async (url) => {
        // Keep files that another post still references.
        if (await this.postModel.exists({ images: url })) return;
        const filename = url.slice('/uploads/'.length);
        try {
          await unlink(resolve(uploadsDirectory, filename));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            this.logger.warn(
              'Could not remove a post image from uploads storage',
            );
          }
        }
      }),
    );
  }
}
