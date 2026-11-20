import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ _id: false })
export class HotelPhoto {
  @Prop({ required: true, trim: true })
  id: string;

  @Prop({ required: true, trim: true })
  url: string;
}

export const HotelPhotoSchema = SchemaFactory.createForClass(HotelPhoto);

@Schema({ _id: false })
export class HotelCancellationTier {
  @Prop({ required: true, min: 0, validate: Number.isInteger })
  daysBefore: number;

  @Prop({ required: true, min: 0, max: 100 })
  refundPercent: number;
}

export const HotelCancellationTierSchema =
  SchemaFactory.createForClass(HotelCancellationTier);

export function photosWithinLimit(photos: HotelPhoto[]): boolean {
  return Array.isArray(photos) && photos.length <= 5;
}

export function uniqueCancellationThresholds(tiers: HotelCancellationTier[]): boolean {
  if (!Array.isArray(tiers)) return false;
  const thresholds = tiers.map((tier) => tier.daysBefore);
  return new Set(thresholds).size === thresholds.length;
}

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

@Schema({ timestamps: true })
export class Hotel {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'City', required: true })
  cityId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Country', required: true })
  countryId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({
    type: [HotelPhotoSchema],
    default: [],
    validate: {
      validator: photosWithinLimit,
      message: 'A hotel can have at most 5 photos',
    },
  })
  photos: HotelPhoto[];

  @Prop({ required: true, min: 1, max: 5, validate: Number.isInteger })
  stars: number;

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    match: [timePattern, 'checkInTime must use HH:mm format'],
  })
  checkInTime: string;

  @Prop({
    match: [timePattern, 'checkOutTime must use HH:mm format'],
  })
  checkOutTime: string;

  @Prop({
    type: [HotelCancellationTierSchema],
    default: [],
    validate: {
      validator: uniqueCancellationThresholds,
      message: 'Cancellation tier daysBefore values must be unique',
    },
  })
  cancellationTiers: HotelCancellationTier[];

  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number;

  @Prop({ default: 0, min: 0, validate: Number.isInteger })
  ratingsCount: number;
}

export const HotelSchema = SchemaFactory.createForClass(Hotel);
