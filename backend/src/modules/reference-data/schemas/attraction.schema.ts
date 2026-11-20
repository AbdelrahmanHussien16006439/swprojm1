import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Attraction {
  /** Official dataset identifier, for example, "att-1". */
  @Prop({ required: true, unique: true, trim: true })
  attractionId: string;

  @Prop({ required: true, trim: true })
  name: string;

  /** Official city identifier retained alongside the ObjectId relationship. */
  @Prop({ required: true, lowercase: true, trim: true })
  cityCode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'City', required: true })
  cityId: Types.ObjectId;
}

export const AttractionSchema = SchemaFactory.createForClass(Attraction);
