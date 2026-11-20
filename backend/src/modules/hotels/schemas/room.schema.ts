import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema()
export class RoomDateRange {
  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;
}

export const RoomDateRangeSchema = SchemaFactory.createForClass(RoomDateRange);

export function isPositiveRoomPrice(price: number): boolean {
  return typeof price === 'number' && Number.isFinite(price) && price > 0;
}

export function hasValidRoomRangeDates(ranges: RoomDateRange[]): boolean {
  return (
    Array.isArray(ranges) &&
    ranges.every(
      (range) =>
        range.startDate instanceof Date &&
        range.endDate instanceof Date &&
        !Number.isNaN(range.startDate.getTime()) &&
        !Number.isNaN(range.endDate.getTime()) &&
        range.startDate.getTime() <= range.endDate.getTime(),
    )
  );
}

/** HTL-04: availability ranges use inclusive UTC calendar-date ranges. */
export function availabilityRangesDoNotOverlap(ranges: RoomDateRange[]): boolean {
  if (!hasValidRoomRangeDates(ranges)) return false;
  for (let leftIndex = 0; leftIndex < ranges.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ranges.length; rightIndex += 1) {
      const left = ranges[leftIndex];
      const right = ranges[rightIndex];
      if (
        left.startDate.getTime() <= right.endDate.getTime() &&
        right.startDate.getTime() <= left.endDate.getTime()
      ) {
        return false;
      }
    }
  }
  return true;
}

@Schema({ timestamps: true })
export class Room {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Hotel', required: true, index: true })
  hotelId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  type: string;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  beds: number;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  maxOccupancy: number;

  @Prop({
    required: true,
    validate: {
      validator: isPositiveRoomPrice,
      message: 'pricePerNight must be greater than 0',
    },
  })
  pricePerNight: number;

  @Prop({
    type: [RoomDateRangeSchema],
    default: [],
    validate: {
      validator: availabilityRangesDoNotOverlap,
      message: 'Availability ranges must be valid and must not overlap',
    },
  })
  availabilityRanges: RoomDateRange[];

  @Prop({
    type: [RoomDateRangeSchema],
    default: [],
    validate: {
      validator: hasValidRoomRangeDates,
      message: 'Blocked ranges must have valid start and end dates',
    },
  })
  blockedRanges: RoomDateRange[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  everReserved: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
RoomSchema.index({ hotelId: 1, name: 1 }, { unique: true });
