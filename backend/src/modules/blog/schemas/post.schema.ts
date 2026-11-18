import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

export interface PostImage {
  id: string;
  url: string;
}

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  body: string;

  @Prop({
    type: String,
    enum: Object.values(PostStatus),
    default: PostStatus.DRAFT,
    required: true,
  })
  status: PostStatus;

  @Prop({
    type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
    default: [],
    validate: {
      validator: (tags: string[]) => Array.isArray(tags) && tags.length <= 5,
      message: 'A post can have at most 5 tags',
    },
  })
  tags: string[];

  @Prop({
    type: [MongooseSchema.Types.Mixed],
    default: [],
    validate: {
      validator: (images: Array<string | PostImage>) =>
        Array.isArray(images) && images.length <= 5,
      message: 'A post can have at most 5 images',
    },
  })
  // BLG-10 stores images as { id, url }; legacy string values are not trusted for file deletion.
  images: Array<string | PostImage>;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  likesCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  commentsCount: number;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  @Prop({ type: Boolean, default: false, required: true })
  isHidden: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
