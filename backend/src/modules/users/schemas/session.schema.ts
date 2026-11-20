import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

/** Server-side login session (ACC-06, ACC-19). One per login. */
@Schema({ timestamps: true })
export class Session {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  // SHA-256 of the opaque refresh token — the raw token only lives in the cookie
  @Prop({ required: true, unique: true })
  refreshTokenHash: string;

  // Updated on every authenticated request; idle > 30 min = expired (ACC-06)
  @Prop({ required: true })
  lastActivityAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop()
  userAgent?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
