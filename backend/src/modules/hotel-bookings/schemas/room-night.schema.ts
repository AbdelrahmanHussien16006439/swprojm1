import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type RoomNightDocument = HydratedDocument<RoomNight>;

@Schema({ timestamps: true })
export class RoomNight {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  roomId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Hotel', required: true })
  hotelId: Types.ObjectId;

  /** One UTC-midnight calendar date, check-in inclusive and check-out exclusive. */
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'HotelBooking',
    required: true,
    index: true,
  })
  hotelBookingId: Types.ObjectId;

  // Set with the parent booking reference only after verified payment (HTL-17).
  @Prop({ type: String })
  bookingReference?: string;

  // Null after confirmation; otherwise the temporary hold expiry time.
  @Prop({ type: Date, default: null, index: true })
  holdExpiresAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const RoomNightSchema = SchemaFactory.createForClass(RoomNight);
RoomNightSchema.index({ roomId: 1, date: 1 }, { unique: true });
