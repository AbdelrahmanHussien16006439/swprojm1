import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Airport {
  /** Official IATA identifier, for example, "CAI". */
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  iataCode: string;

  @Prop({ required: true, trim: true })
  name: string;

  /** Official city identifier retained alongside the ObjectId relationship. */
  @Prop({ required: true, lowercase: true, trim: true })
  cityCode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'City', required: true })
  cityId: Types.ObjectId;

  /** Official country code retained alongside the ObjectId relationship. */
  @Prop({ required: true, uppercase: true, trim: true })
  countryCode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Country', required: true })
  countryId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  timezone: string;
}

export const AirportSchema = SchemaFactory.createForClass(Airport);
