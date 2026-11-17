import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
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
    type: [String],
    default: [],
    validate: {
      validator: (images: string[]) =>
        Array.isArray(images) && images.length <= 5,
      message: 'A post can have at most 5 images',
    },
  })
  images: string[];

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
