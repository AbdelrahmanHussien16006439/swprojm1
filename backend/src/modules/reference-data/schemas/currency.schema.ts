import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Currency {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);
