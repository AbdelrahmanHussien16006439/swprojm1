import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
}
