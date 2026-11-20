import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/** GEN-07: record of an administrative action. Written only through AuditLogsService.log(). */
@Schema({ timestamps: true })
export class AuditLog {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  actorId: Types.ObjectId;

  // e.g. ACCOUNT_SUSPENDED — see audit-actions.ts
  @Prop({ required: true, index: true })
  action: string;

  // e.g. 'user', 'post', 'airline'
  @Prop({ required: true })
  targetType: string;

  @Prop({ required: true })
  targetId: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  details?: Record<string, any>;

  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1 });
