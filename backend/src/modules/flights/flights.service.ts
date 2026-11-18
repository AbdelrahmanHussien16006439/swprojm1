import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FlightStatus } from './flights.constants';
import { Flight } from './schemas/flight.schema';

@Injectable()
export class FlightsService {
  constructor(
    @InjectModel(Flight.name)
    private readonly flightModel: Model<Flight>,
  ) {}

  async findById(id: string): Promise<Flight> {
    const flight = await this.flightModel.findById(id).exec();
    if (!flight) throw new NotFoundException('Flight not found');
    return flight;
  }

  /** FLT-30: every minute, only scheduled flights past departure become departed. */
  @Cron(CronExpression.EVERY_MINUTE)
  async markDepartedFlights(): Promise<void> {
    await this.flightModel
      .updateMany(
        {
          status: FlightStatus.SCHEDULED,
          departureTime: { $lte: new Date() },
        },
        { $set: { status: FlightStatus.DEPARTED } },
      )
      .exec();
  }
}
