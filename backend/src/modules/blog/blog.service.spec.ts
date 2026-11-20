import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types } from 'mongoose';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { UserStatus } from '../../common/enums/user-status.enum';
import { CommentTextDto } from './dto/comment-text.dto';
import { BlogService } from './blog.service';
import { Comment } from './schemas/comment.schema';
import { Like } from './schemas/like.schema';
import { Post, PostStatus } from './schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { UploadsService } from '../uploads/uploads.service';
import { CreatePostDto } from './dto/create-post.dto';

const imageId = '550e8400-e29b-41d4-a716-446655440000';
const imageUrl = `/uploads/${imageId}.png`;

const postId = new Types.ObjectId();
const userId = new Types.ObjectId();
const otherUserId = new Types.ObjectId();

function execResult<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function makeService(overrides: Record<string, any> = {}) {
  const post = {
    _id: postId,
    authorId: otherUserId,
    status: PostStatus.PUBLISHED,
    isHidden: false,
    likesCount: 0,
    commentsCount: 0,
  };
  const postModel: Record<string, any> = {
    findById: jest.fn().mockReturnValue(execResult(post)),
    updateOne: jest.fn().mockReturnValue(execResult({ matchedCount: 1 })),
    findOneAndUpdate: jest
      .fn()
      .mockReturnValue(execResult({ ...post, likesCount: 1 })),
    aggregate: jest.fn().mockReturnValue(execResult([])),
    exists: jest.fn().mockReturnValue(execResult(null)),
    ...overrides.postModel,
  };
  const commentModel: Record<string, any> = {
    create: jest.fn(),
    findById: jest.fn(),
    findOneAndDelete: jest
      .fn()
      .mockReturnValue(execResult({ _id: new Types.ObjectId() })),
    deleteMany: jest.fn().mockReturnValue(execResult({ deletedCount: 0 })),
    ...overrides.commentModel,
  };
  const likeModel: Record<string, any> = {
    create: jest.fn(),
    deleteMany: jest.fn().mockReturnValue(execResult({ deletedCount: 0 })),
    findOneAndDelete: jest
      .fn()
      .mockReturnValue(execResult({ _id: new Types.ObjectId() })),
    deleteOne: jest.fn().mockReturnValue(execResult({ deletedCount: 1 })),
    ...overrides.likeModel,
  };
  const userModel: Record<string, any> = {
    collection: { name: 'users' },
    findById: jest.fn().mockReturnValue({
      select: jest
        .fn()
        .mockReturnValue(execResult({ status: UserStatus.ACTIVE })),
    }),
    ...overrides.userModel,
  };
  const uploadsService: Record<string, any> = {
    saveImage: jest.fn().mockResolvedValue({ id: imageId, url: imageUrl }),
    deleteImage: jest.fn().mockResolvedValue(undefined),
    ...overrides.uploadsService,
  };
  const service = new BlogService(
    postModel as unknown as Model<Post>,
    commentModel as unknown as Model<Comment>,
    likeModel as unknown as Model<Like>,
    userModel as unknown as Model<User>,
    uploadsService as unknown as UploadsService,
  );
  return {
    service,
    post,
    postModel,
    commentModel,
    likeModel,
    userModel,
    uploadsService,
  };
}

const user = { sub: userId.toString() } as JwtUser;

describe('BlogService post creation (BLG-01)', () => {
  it('rejects images supplied in the create-post body', async () => {
    const dto = plainToInstance(CreatePostDto, {
      title: 'Travel',
      body: 'Story',
      images: [imageUrl],
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((error) => error.property)).toContain('images');
  });

  it('creates posts without accepting caller-supplied image references', async () => {
    const createdPost = {
      _id: postId,
      authorId: userId,
      title: 'Travel',
      body: 'Story',
      status: PostStatus.DRAFT,
      tags: [],
      images: [],
      likesCount: 0,
      commentsCount: 0,
      publishedAt: null,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, postModel } = makeService({
      postModel: { create: jest.fn().mockResolvedValue(createdPost) },
    });

    await service.createPost(user, {
      title: 'Travel',
      body: 'Story',
      images: [imageUrl],
    } as unknown as CreatePostDto);

    expect(postModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ images: [] }),
    );
    expect(postModel.create.mock.calls[0][0].images).not.toContain(imageUrl);
  });
});

describe('BlogService comments and likes', () => {
  it('rejects blank and overlong comment text after trimming', async () => {
    const blank = plainToInstance(CommentTextDto, { text: '   ' });
    const tooLong = plainToInstance(CommentTextDto, { text: 'x'.repeat(501) });

    expect(await validate(blank)).not.toHaveLength(0);
    expect(await validate(tooLong)).not.toHaveLength(0);
    expect(
      await validate(plainToInstance(CommentTextDto, { text: ' ok ' })),
    ).toHaveLength(0);
  });

  it('allows comments only on published, visible posts', async () => {
    const { service, commentModel, postModel } = makeService({
      postModel: {
        findById: jest
          .fn()
          .mockReturnValue(execResult({ status: PostStatus.DRAFT })),
      },
    });

    await expect(
      service.addComment(postId.toString(), user, { text: 'Nice post' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(commentModel.create).not.toHaveBeenCalled();
    expect(postModel.updateOne).not.toHaveBeenCalled();
  });

  it('creates a comment and increments the post comment count', async () => {
    const author = { _id: userId, name: 'Reader' };
    const comment: Record<string, any> = {
      _id: new Types.ObjectId(),
      postId,
      authorId: userId,
      text: 'Nice post',
      createdAt: new Date(),
      updatedAt: new Date(),
      populate: jest.fn().mockImplementation(async () => {
        comment.authorId = author;
        return comment;
      }),
    };
    const { service, commentModel, postModel } = makeService({
      commentModel: { create: jest.fn().mockResolvedValue(comment) },
    });

    const result = await service.addComment(postId.toString(), user, {
      text: 'Nice post',
    });

    expect(commentModel.create).toHaveBeenCalledWith({
      postId,
      authorId: userId,
      text: 'Nice post',
    });
    expect(postModel.updateOne).toHaveBeenCalledWith(
      { _id: postId },
      { $inc: { commentsCount: 1 } },
    );
    expect(result.author.name).toBe('Reader');
  });

  it('rolls back a newly created comment if its post counter cannot be updated', async () => {
    const comment = {
      _id: new Types.ObjectId(),
      postId,
      authorId: userId,
      text: 'Nice post',
      deleteOne: jest.fn(),
    };
    const { service } = makeService({
      commentModel: { create: jest.fn().mockResolvedValue(comment) },
      postModel: {
        updateOne: jest.fn().mockReturnValue(execResult({ matchedCount: 0 })),
      },
    });

    await expect(
      service.addComment(postId.toString(), user, { text: 'Nice post' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(comment.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('prevents a user from editing another author’s comment', async () => {
    const comment = {
      authorId: otherUserId,
      save: jest.fn(),
    };
    const { service } = makeService({
      commentModel: {
        findById: jest.fn().mockReturnValue(execResult(comment)),
      },
    });

    await expect(
      service.updateComment(new Types.ObjectId().toString(), user.sub, {
        text: 'Edited',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(comment.save).not.toHaveBeenCalled();
  });

  it('deletes only the author’s comment and clamps the comment counter at zero', async () => {
    const comment = { _id: new Types.ObjectId(), authorId: userId, postId };
    const { service, commentModel, postModel } = makeService({
      commentModel: {
        findById: jest.fn().mockReturnValue(execResult(comment)),
        findOneAndDelete: jest.fn().mockReturnValue(execResult(comment)),
      },
    });

    await service.deleteComment(comment._id.toString(), user.sub);

    expect(commentModel.findOneAndDelete).toHaveBeenCalledWith({
      _id: comment._id,
      authorId: userId,
    });
    expect(postModel.updateOne).toHaveBeenCalledWith(
      { _id: postId, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } },
    );
  });

  it('returns HTTP 409 when a user likes the same post twice', async () => {
    const { service, likeModel, postModel } = makeService({
      likeModel: { create: jest.fn().mockRejectedValue({ code: 11000 }) },
    });

    await expect(
      service.likePost(postId.toString(), user.sub),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(postModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('increments the like count atomically and clamps a corrupt negative count', async () => {
    const like = { _id: new Types.ObjectId() };
    const { service, postModel } = makeService({
      likeModel: { create: jest.fn().mockResolvedValue(like) },
    });

    const result = await service.likePost(postId.toString(), user.sub);
    const update = postModel.findOneAndUpdate.mock.calls[0][1];

    expect(result.likesCount).toBe(1);
    expect(update[0].$set.likesCount.$add[0].$max[1]).toBe(0);
  });

  it('removes a like without allowing likesCount to become negative', async () => {
    const { service, postModel, likeModel } = makeService({
      postModel: {
        findOneAndUpdate: jest.fn().mockReturnValue(execResult(null)),
      },
    });

    const result = await service.unlikePost(postId.toString(), user.sub);
    const update = postModel.findOneAndUpdate.mock.calls[0][1];

    expect(likeModel.findOneAndDelete).toHaveBeenCalledWith({
      postId,
      userId,
    });
    expect(result.likesCount).toBe(0);
    expect(update[0].$set.likesCount.$max[1]).toBe(0);
  });

  it('does not remove another user’s like', async () => {
    const { service, postModel, likeModel } = makeService({
      likeModel: {
        findOneAndDelete: jest.fn().mockReturnValue(execResult(null)),
      },
    });

    await expect(
      service.unlikePost(postId.toString(), user.sub),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(postModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns tagged posts through the same public filters as the list endpoint', async () => {
    const { service, postModel } = makeService();

    await service.listPostsByTag('Egypt', 2);

    const pipeline = postModel.aggregate.mock.calls[0][0];
    expect(pipeline[0].$match).toEqual({
      status: PostStatus.PUBLISHED,
      isHidden: false,
      tags: 'egypt',
    });
    expect(pipeline[1].$lookup).toBeDefined();
  });
});

describe('BlogService post images (BLG-10)', () => {
  const file = {
    buffer: Buffer.from('png'),
    size: 3,
    mimetype: 'image/png',
  } as Express.Multer.File;

  it('uploads for the post author and returns the attached image and updated post', async () => {
    const updatedPost = {
      _id: postId,
      authorId: userId,
      title: 'Travel',
      body: 'Story',
      status: PostStatus.DRAFT,
      tags: [],
      images: [{ id: imageId, url: imageUrl }],
      likesCount: 0,
      commentsCount: 0,
      publishedAt: null,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, postModel, uploadsService } = makeService({
      postModel: {
        findById: jest
          .fn()
          .mockReturnValue(execResult({ ...updatedPost, images: [] })),
        findOneAndUpdate: jest.fn().mockReturnValue(execResult(updatedPost)),
      },
    });

    const result = await service.addPostImage(
      postId.toString(),
      userId.toString(),
      file,
    );

    expect(uploadsService.saveImage).toHaveBeenCalledWith(file);
    const [filter, update, options] = postModel.findOneAndUpdate.mock.calls[0];
    expect(filter.authorId).toEqual(userId);
    expect(filter.$expr).toBeDefined();
    expect(update).toEqual({
      $push: { images: { id: imageId, url: imageUrl } },
    });
    expect(options).toEqual({ new: true, runValidators: true });
    expect(result.image).toEqual({ id: imageId, url: imageUrl });
    expect(result.post.images).toEqual([{ id: imageId, url: imageUrl }]);
  });

  it('does not upload when the post already has five images', async () => {
    const fullPost = {
      _id: postId,
      authorId: userId,
      images: ['/1', '/2', '/3', '/4', '/5'],
    };
    const { service, uploadsService } = makeService({
      postModel: {
        findById: jest.fn().mockReturnValue(execResult(fullPost)),
      },
    });

    await expect(
      service.addPostImage(postId.toString(), userId.toString(), file),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadsService.saveImage).not.toHaveBeenCalled();
  });

  it('rejects uploads from users who do not own the post', async () => {
    const { service, uploadsService } = makeService();

    await expect(
      service.addPostImage(postId.toString(), userId.toString(), file),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(uploadsService.saveImage).not.toHaveBeenCalled();
  });

  it('removes the saved file if the post database update fails', async () => {
    const databaseError = new Error('database update failed');
    const { service, uploadsService } = makeService({
      postModel: {
        findOneAndUpdate: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(databaseError),
        }),
      },
    });

    await expect(
      service.addPostImage(postId.toString(), otherUserId.toString(), file),
    ).rejects.toBe(databaseError);
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(imageId);
  });

  it('removes an owned image reference and deletes its file when unused elsewhere', async () => {
    const post = {
      _id: postId,
      authorId: userId,
      images: [{ id: imageId, url: imageUrl }],
    };
    const updatedPost = {
      _id: postId,
      authorId: userId,
      title: 'Travel',
      body: 'Story',
      status: PostStatus.DRAFT,
      tags: [],
      images: [],
      likesCount: 0,
      commentsCount: 0,
      publishedAt: null,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, postModel, uploadsService } = makeService({
      postModel: {
        findById: jest.fn().mockReturnValue(execResult(post)),
        findOneAndUpdate: jest.fn().mockReturnValue(execResult(updatedPost)),
        exists: jest.fn().mockReturnValue(execResult(null)),
      },
    });

    const result = await service.deletePostImage(
      postId.toString(),
      imageId,
      userId.toString(),
    );

    expect(postModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: postId,
        authorId: userId,
        images: { $elemMatch: { id: imageId, url: imageUrl } },
      },
      { $pull: { images: { id: imageId, url: imageUrl } } },
      { new: true, runValidators: true },
    );
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(imageId);
    expect(result.post.images).toEqual([]);
  });

  it('does not delete an image still referenced by another post', async () => {
    const post = {
      _id: postId,
      authorId: userId,
      images: [{ id: imageId, url: imageUrl }],
    };
    const updatedPost = {
      _id: postId,
      authorId: userId,
      title: 'Travel',
      body: 'Story',
      status: PostStatus.DRAFT,
      tags: [],
      images: [],
      likesCount: 0,
      commentsCount: 0,
      publishedAt: null,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { service, uploadsService } = makeService({
      postModel: {
        findById: jest.fn().mockReturnValue(execResult(post)),
        findOneAndUpdate: jest.fn().mockReturnValue(execResult(updatedPost)),
        exists: jest.fn().mockReturnValue(execResult({ _id: otherUserId })),
      },
    });

    await service.deletePostImage(
      postId.toString(),
      imageId,
      userId.toString(),
    );

    expect(uploadsService.deleteImage).not.toHaveBeenCalled();
  });

  it('does not remove legacy string image references through the image route', async () => {
    const post = {
      _id: postId,
      authorId: userId,
      images: [imageUrl],
    };
    const { service, uploadsService } = makeService({
      postModel: {
        findById: jest.fn().mockReturnValue(execResult(post)),
      },
    });

    await expect(
      service.deletePostImage(postId.toString(), imageId, userId.toString()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(uploadsService.deleteImage).not.toHaveBeenCalled();
  });

  it('does not delete the file when removing the post reference fails', async () => {
    const post = {
      _id: postId,
      authorId: userId,
      images: [{ id: imageId, url: imageUrl }],
    };
    const databaseError = new Error('database update failed');
    const { service, uploadsService } = makeService({
      postModel: {
        findById: jest.fn().mockReturnValue(execResult(post)),
        findOneAndUpdate: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(databaseError),
        }),
      },
    });

    await expect(
      service.deletePostImage(postId.toString(), imageId, userId.toString()),
    ).rejects.toBe(databaseError);
    expect(uploadsService.deleteImage).not.toHaveBeenCalled();
  });

  it('never unlinks a legacy string URL when deleting its post', async () => {
    const post = {
      _id: postId,
      authorId: userId,
      images: [imageUrl],
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };
    const { service, uploadsService } = makeService({
      postModel: {
        findById: jest.fn().mockReturnValue(execResult(post)),
      },
    });
      expect((service as any).isManagedPostImage(post.images[0])).toBe(false);

    await service.deletePost(postId.toString(), userId.toString());

    expect(uploadsService.deleteImage).not.toHaveBeenCalled();
  });

  it('unlinks a canonical upload attached to the deleted post when unused elsewhere', async () => {
    const post = {
      _id: postId,
      authorId: userId,
      images: [{ id: imageId, url: imageUrl }],
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };
    const { service, uploadsService } = makeService({
      postModel: {
        findById: jest.fn().mockReturnValue(execResult(post)),
        exists: jest.fn().mockReturnValue(execResult(null)),
      },
    });

    await service.deletePost(postId.toString(), userId.toString());

    expect(uploadsService.deleteImage).toHaveBeenCalledTimes(1);
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(imageId);
  });

  it('preserves a canonical upload still referenced by another post', async () => {
    const post = {
      _id: postId,
      authorId: userId,
      images: [{ id: imageId, url: imageUrl }],
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };
    const { service, uploadsService } = makeService({
      postModel: {
        findById: jest.fn().mockReturnValue(execResult(post)),
        exists: jest.fn().mockReturnValue(execResult({ _id: otherUserId })),
      },
    });

    await service.deletePost(postId.toString(), userId.toString());

    expect(uploadsService.deleteImage).not.toHaveBeenCalled();
  });
});
