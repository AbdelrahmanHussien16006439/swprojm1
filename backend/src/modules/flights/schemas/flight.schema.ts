import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CabinClass, FlightStatus } from '../flights.constants';

export type FlightDocument = HydratedDocument<Flight>;

@Schema({ _id: true })
export class FlightCabin {
  @Prop({ type: String, enum: Object.values(CabinClass), required: true })
  cabinClass: CabinClass;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  totalSeats: number;

  @Prop({ required: true, min: 0, validate: Number.isInteger })
  availableSeats: number;

  @Prop({ required: true, min: 0, validate: Number.isInteger })
  heldSeats: number;

  @Prop({ required: true, min: 0, validate: Number.isInteger })
  bookedSeats: number;

  @Prop({ required: true, min: 0, validate: Number.isInteger })
  freeBags: number;

  @Prop({ required: true, min: 0 })
  maxBagWeightKg: number;
}

@Schema({ timestamps: true })
export class Flight {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Airline',
    required: true,
    index: true,
  })
  airlineId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  flightNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Airport', required: true })
  departureAirportId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Airport', required: true })
  arrivalAirportId: Types.ObjectId;

  // GEN-06: API local times are converted before persistence; these are UTC.
  @Prop({ type: Date, required: true, index: true })
  departureTime: Date;

  @Prop({ type: Date, required: true })
  arrivalTime: Date;

  @Prop({
    type: String,
    enum: Object.values(FlightStatus),
    default: FlightStatus.SCHEDULED,
    index: true,
  })
  status: FlightStatus;

  @Prop({ type: [FlightCabin], default: [] })
  cabins: FlightCabin[];

  createdAt: Date;
  updatedAt: Date;
}

export const FlightSchema = SchemaFactory.createForClass(Flight);

