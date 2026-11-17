import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { AuthorsController } from './authors.controller';
import { CommentsController } from './comments.controller';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { Post, PostSchema } from './schemas/post.schema';
import { TagsController } from './tags.controller';
import {
  PendingPublicItineraryReader,
  PUBLIC_ITINERARY_READER,
} from './public-itinerary-reader';

// Owner: Member 2 — see docs/TEAM_PLAN.md Section 7.
// Remember to export your service(s) AND MongooseModule (TEAM_PLAN 3.2).
@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema },
    ]),
  ],
  controllers: [
    BlogController,
    AuthorsController,
    CommentsController,
    TagsController,
  ],
  providers: [
    BlogService,
    PendingPublicItineraryReader,
    {
      provide: PUBLIC_ITINERARY_READER,
      useExisting: PendingPublicItineraryReader,
    },
  ],
  exports: [BlogService, MongooseModule],
})
export class BlogModule {}
