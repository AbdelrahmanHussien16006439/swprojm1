import { Model, Types } from 'mongoose';
import { BlogService } from './blog.service';
import { Comment } from './schemas/comment.schema';
import { Like } from './schemas/like.schema';
import { Post, PostStatus } from './schemas/post.schema';
import { User } from '../users/schemas/user.schema';

const authorId = new Types.ObjectId();
const postId = new Types.ObjectId();

describe('BlogService author posts (BLG-12 visibility)', () => {
  it('reuses public post filters and excludes drafts, hidden posts, and deactivated authors', async () => {
    const aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          data: [
            {
              _id: postId,
              title: 'Public story',
              author: { id: authorId, name: 'Author' },
              date: new Date('2026-01-01T00:00:00Z'),
              excerpt: 'Story excerpt',
              likesCount: 3,
              commentsCount: 2,
            },
          ],
          total: [{ count: 1 }],
        },
      ]),
    });
    const service = new BlogService(
      { aggregate } as unknown as Model<Post>,
      {} as Model<Comment>,
      {} as Model<Like>,
      { collection: { name: 'users' } } as unknown as Model<User>,
    );

    const result = await service.listPublicPostsByAuthor(
      authorId.toString(),
      3,
    );
    const pipeline = aggregate.mock.calls[0][0];

    expect(pipeline[0].$match).toEqual({
      status: PostStatus.PUBLISHED,
      isHidden: false,
      authorId,
    });
    expect(pipeline[1].$lookup).toBeDefined();
    expect(pipeline[3].$match).toEqual({
      'author.status': { $ne: 'deactivated' },
    });
    expect(result).toEqual({
      data: [
        {
          id: postId.toString(),
          title: 'Public story',
          author: { id: authorId.toString(), name: 'Author' },
          date: new Date('2026-01-01T00:00:00Z'),
          excerpt: 'Story excerpt',
          likesCount: 3,
          commentsCount: 2,
        },
      ],
      page: 3,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });
});
