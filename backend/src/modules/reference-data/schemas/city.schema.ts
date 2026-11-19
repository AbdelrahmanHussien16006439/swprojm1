import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class City {
  /** Official dataset identifier (for example, "cairo"). */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  cityId: string;

  @Prop({ required: true, trim: true })
  name: string;

  /** Official country code retained alongside the ObjectId relationship. */
  @Prop({ required: true, uppercase: true, trim: true })
  countryCode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Country', required: true })
  countryId: Types.ObjectId;
}

export const CitySchema = SchemaFactory.createForClass(City);
