import { CommentSchema } from './comment.schema';
import { LikeSchema } from './like.schema';
import { PostSchema } from './post.schema';

describe('blog ObjectId schema paths', () => {
  it.each([
    ['Post.authorId', PostSchema, 'authorId'],
    ['Comment.postId', CommentSchema, 'postId'],
    ['Comment.authorId', CommentSchema, 'authorId'],
    ['Like.postId', LikeSchema, 'postId'],
    ['Like.userId', LikeSchema, 'userId'],
  ])('%s is stored as an ObjectId', (_label, schema, path) => {
    expect(schema.path(path as string).instance).toBe('ObjectId');
  });
});
