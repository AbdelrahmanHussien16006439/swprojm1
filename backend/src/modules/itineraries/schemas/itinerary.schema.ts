import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { MAX_ITINERARY_DAYS } from '../itineraries.constants';

export type ItineraryDocument = HydratedDocument<Itinerary>;

@Schema()
export class ItineraryActivity {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ trim: true })
  time?: string;

  @Prop({ min: 0 })
  cost?: number;

  @Prop({ uppercase: true, trim: true })
  currency?: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  images: Array<{ id: string; url: string }>;
}

export const ItineraryActivitySchema = SchemaFactory.createForClass(ItineraryActivity);

@Schema()
export class ItineraryBudgetEntry {
  @Prop({ required: true, enum: ['food', 'accommodation', 'in-city transport', 'activities'] })
  category: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({ trim: true })
  note?: string;
}

export const ItineraryBudgetEntrySchema = SchemaFactory.createForClass(ItineraryBudgetEntry);

@Schema()
export class ItineraryDay {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'City', required: true })
  cityId: Types.ObjectId;

  @Prop({ trim: true, default: '' })
  notes: string;

  @Prop({ type: [ItineraryActivitySchema], default: [] })
  activities: ItineraryActivity[];

  @Prop({ type: [ItineraryBudgetEntrySchema], default: [] })
  budgetEntries: ItineraryBudgetEntry[];
}

export const ItineraryDaySchema = SchemaFactory.createForClass(ItineraryDay);

@Schema()
export class ItineraryTransportCost {
  @Prop({ required: true, trim: true })
  mode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'City', required: true })
  fromCityId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'City', required: true })
  toCityId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, uppercase: true, trim: true })
  currency: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  dayId: Types.ObjectId;
}

export const ItineraryTransportCostSchema = SchemaFactory.createForClass(ItineraryTransportCost);

@Schema({ timestamps: true })
export class Itinerary {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  title: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Country' }], required: true, validate: [(value: Types.ObjectId[]) => value.length > 0, 'countryIds must contain at least one country'] })
  countryIds: Types.ObjectId[];

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ default: false, index: true })
  isPublic: boolean;

  @Prop({ default: false, index: true })
  isHidden: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Itinerary', default: null })
  clonedFromId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  originalAuthorId?: Types.ObjectId;

  @Prop({ type: [ItineraryDaySchema], default: [], validate: [(value: ItineraryDay[]) => value.length <= MAX_ITINERARY_DAYS, 'days cannot contain more than 60 items'] })
  days: ItineraryDay[];

  @Prop({ type: [ItineraryTransportCostSchema], default: [] })
  transportCosts: ItineraryTransportCost[];

  createdAt: Date;
  updatedAt: Date;
}

export const ItinerarySchema = SchemaFactory.createForClass(Itinerary);
