import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const HOTEL_BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'completed',
  'expired',
  'cancelled',
] as const;
export type HotelBookingStatus = (typeof HOTEL_BOOKING_STATUSES)[number];
export type HotelBookingDocument = HydratedDocument<HotelBooking>;

@Schema({ _id: false })
export class HotelBookingRoom {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  roomId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  roomName: string;

  @Prop({ required: true, min: 0 })
  pricePerNight: number;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  adults: number;

  @Prop({
    type: [Number],
    default: [],
    validate: (ages: number[]) =>
      ages.every((age) => Number.isInteger(age) && age >= 0 && age <= 17),
  })
  children: number[];
}

export const HotelBookingRoomSchema =
  SchemaFactory.createForClass(HotelBookingRoom);

@Schema({ _id: false })
export class HotelBookingPolicyAcceptance {
  @Prop({ type: Date, required: true })
  acceptedAt: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  policySnapshot: Record<string, unknown>;
}

export const HotelBookingPolicyAcceptanceSchema = SchemaFactory.createForClass(
  HotelBookingPolicyAcceptance,
);

@Schema({ timestamps: true })
export class HotelBooking {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true,
  })
  hotelId: Types.ObjectId;

  @Prop({
    type: [HotelBookingRoomSchema],
    required: true,
    validate: (rooms: unknown[]) => rooms.length > 0,
  })
  rooms: HotelBookingRoom[];

  @Prop({ type: Date, required: true })
  checkIn: Date;

  @Prop({ type: Date, required: true })
  checkOut: Date;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  nights: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({
    type: String,
    required: true,
    enum: HOTEL_BOOKING_STATUSES,
    default: 'pending_payment',
    index: true,
  })
  status: HotelBookingStatus;

  // Added only after successful payment (HTL-17); sparse index ignores missing values.
  @Prop({ type: String, unique: true, sparse: true })
  bookingReference?: string;

  @Prop({ type: Date, required: true, index: true })
  holdExpiresAt: Date;

  @Prop({ type: HotelBookingPolicyAcceptanceSchema, default: null })
  policyAcceptance: HotelBookingPolicyAcceptance | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', default: null })
  paymentId: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Refund', default: null })
  refundId: Types.ObjectId | null;

  @Prop({ type: String, enum: ['user', 'provider'], default: null })
  cancelledBy: 'user' | 'provider' | null;

  createdAt: Date;
  updatedAt: Date;
}

export const HotelBookingSchema = SchemaFactory.createForClass(HotelBooking);
