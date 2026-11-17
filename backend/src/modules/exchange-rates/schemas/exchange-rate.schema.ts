import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExchangeRateDocument = HydratedDocument<ExchangeRate>;

@Schema({ timestamps: true })
export class ExchangeRate {
  /** UTC midnight for the day represented by the fetched rates. */
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ required: true, uppercase: true, default: 'USD' })
  base: string;

  @Prop({ type: Map, of: Number, required: true })
  rates: Map<string, number>;

  @Prop({ type: Date, required: true })
  fetchedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ExchangeRateSchema = SchemaFactory.createForClass(ExchangeRate);

ExchangeRateSchema.index({ date: 1, base: 1 }, { unique: true });
ExchangeRateSchema.index({ date: -1, fetchedAt: -1 });
