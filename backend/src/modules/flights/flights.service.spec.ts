import { NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { FlightsService } from './flights.service';
import { Flight } from './schemas/flight.schema';

const flightId = new Types.ObjectId();
const flight = { _id: flightId, flightNumber: 'CA100' } as Flight;
const exec = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

describe('FlightsService', () => {
  it('finds a flight by id', async () => {
    const model = {
      findById: jest.fn().mockReturnValue(exec(flight)),
    } as unknown as Model<Flight>;
    const service = new FlightsService(model);

    await expect(service.findById(flightId.toString())).resolves.toBe(flight);
    expect(model.findById).toHaveBeenCalledWith(flightId.toString());
  });

  it('returns 404 when a flight does not exist', async () => {
    const model = {
      findById: jest.fn().mockReturnValue(exec(null)),
    } as unknown as Model<Flight>;
    const service = new FlightsService(model);

    await expect(service.findById(flightId.toString())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
