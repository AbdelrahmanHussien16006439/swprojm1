import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const REFUND_STATUSES = ['pending', 'refunded', 'failed'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];
export type RefundDocument = HydratedDocument<Refund>;

@Schema({ timestamps: true })
export class Refund {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', required: true, index: true })
  paymentId: Types.ObjectId;

  @Prop({ required: true, enum: ['flight', 'hotel'] })
  bookingType: 'flight' | 'hotel';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'FlightBooking', required: true, index: true })
  bookingId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, min: 0, max: 100 })
  refundPercent: number;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ type: String, default: null, index: true })
  stripeRefundId: string | null;

  @Prop({ type: String, required: true, enum: REFUND_STATUSES, default: 'pending', index: true })
  status: RefundStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);
