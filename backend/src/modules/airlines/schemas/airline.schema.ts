import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AirlineDocument = HydratedDocument<Airline>;

@Schema({ _id: false })
export class BaggagePolicy {
  @Prop({
    required: true,
    validate: {
      validator: (value: number) => value > 0,
      message: 'extraBagPrice must be greater than zero',
    },
  })
  extraBagPrice: number;

  @Prop({ required: true, min: 0, validate: Number.isInteger })
  maxExtraBagsPerPassenger: number;
}

@Schema({ _id: false })
export class CancellationTier {
  @Prop({ required: true, min: 0, validate: Number.isInteger })
  daysBefore: number;

  @Prop({ required: true, min: 0, max: 100 })
  refundPercent: number;
}

@Schema({ timestamps: true })
export class Airline {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: String, default: null })
  logoUrl: string | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: BaggagePolicy,
    required: true,
    default: { extraBagPrice: 1, maxExtraBagsPerPassenger: 0 },
  })
  baggagePolicy: BaggagePolicy;

  @Prop({ type: [CancellationTier], default: [] })
  cancellationTiers: CancellationTier[];

  createdAt: Date;
  updatedAt: Date;
}

export const AirlineSchema = SchemaFactory.createForClass(Airline);
