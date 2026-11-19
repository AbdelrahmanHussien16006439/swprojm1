import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const FLIGHT_BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'completed',
  'expired',
  'cancelled',
] as const;
export type FlightBookingStatus = (typeof FLIGHT_BOOKING_STATUSES)[number];
export type FlightBookingDocument = HydratedDocument<FlightBooking>;

@Schema({ _id: false })
export class FlightBookingSegment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Flight', required: true })
  flightId: Types.ObjectId;

  // Cabin ids are embedded in Flight documents; the Flight model owns their lifecycle.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Flight', required: true })
  cabinId: Types.ObjectId;

  @Prop({ required: true, enum: ['economy', 'premium_economy', 'business', 'first'] })
  cabinClass: string;

  @Prop({ required: true, min: 0 })
  fare: number;
}

@Schema({ _id: false })
export class FlightBookingPassenger {
  @Prop({ required: true, enum: ['adult', 'child', 'infant'] })
  type: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ type: Date, required: true })
  dateOfBirth: Date;

  @Prop({ required: true, trim: true })
  documentNumber: string;

  @Prop({ required: true, min: 0, validate: Number.isInteger, default: 0 })
  extraBags: number;

  @Prop({ required: true, min: 0, default: 0 })
  extraBagsWeightKg: number;
}

@Schema({ _id: false })
export class FlightPolicyAcceptance {
  @Prop({ type: Date, required: true })
  acceptedAt: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  policySnapshot: Record<string, unknown>;
}

@Schema({ timestamps: true })
export class FlightBooking {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Airline', required: true, index: true })
  airlineId: Types.ObjectId;

  @Prop({ required: true, enum: ['one_way', 'round_trip'] })
  tripType: string;

  @Prop({ type: [FlightBookingSegment], required: true, validate: (v: unknown[]) => v.length > 0 })
  segments: FlightBookingSegment[];

  @Prop({ type: [FlightBookingPassenger], required: true, validate: (v: unknown[]) => v.length > 0 })
  passengers: FlightBookingPassenger[];

  @Prop({ required: true, min: 0, validate: Number.isInteger })
  seatsHeld: number;

  @Prop({ required: true, min: 0, default: 0 })
  baggageFee: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: String, required: true, enum: FLIGHT_BOOKING_STATUSES, default: 'pending_payment', index: true })
  status: FlightBookingStatus;

  // Missing until verified payment; sparse unique indexing allows many pending holds.
  @Prop({ type: String, unique: true, sparse: true })
  bookingReference?: string;

  @Prop({ type: Date, required: true, index: true })
  holdExpiresAt: Date;

  @Prop({ type: FlightPolicyAcceptance, default: null })
  policyAcceptance: FlightPolicyAcceptance | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', default: null })
  paymentId: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Refund', default: null })
  refundId: Types.ObjectId | null;

  @Prop({ type: String, enum: ['user', 'provider'], default: null })
  cancelledBy: 'user' | 'provider' | null;

  createdAt: Date;
  updatedAt: Date;
}

export const FlightBookingSchema = SchemaFactory.createForClass(FlightBooking);
