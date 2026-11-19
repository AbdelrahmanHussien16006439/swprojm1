import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const PAYMENT_STATUSES = ['pending', 'succeeded', 'failed', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['flight', 'hotel'] })
  bookingType: 'flight' | 'hotel';

  // A booking can refer to FlightBooking or the future HotelBooking model.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'FlightBooking', required: true, index: true })
  bookingId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, index: true })
  stripePaymentIntentId: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3 })
  currency: string;

  @Prop({ type: String, required: true, enum: PAYMENT_STATUSES, default: 'pending', index: true })
  status: PaymentStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
