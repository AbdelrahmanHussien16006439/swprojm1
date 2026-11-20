import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ModuleRef } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AirlinesService } from '../airlines/airlines.service';
import { CabinClass, FlightStatus } from './flights.constants';
import { FlightsService } from './flights.service';
import { Flight } from './schemas/flight.schema';

const flightId = new Types.ObjectId();
const flight = { _id: flightId, flightNumber: 'CA100' } as Flight;
const exec = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });
const airlineId = new Types.ObjectId();
const moderator = {
  sub: new Types.ObjectId().toString(),
  sid: 'session',
  email: 'moderator@example.com',
  role: Role.AIRLINE_MODERATOR,
  providerId: airlineId.toString(),
} as JwtUser;

function setup(overrides: Record<string, jest.Mock> = {}) {
  const model = {
    findById: jest.fn().mockReturnValue(
      exec({
        ...flight,
        airlineId,
        status: FlightStatus.SCHEDULED,
        cabins: [],
      }),
    ),
    findOneAndUpdate: jest.fn().mockReturnValue(exec(flight)),
    ...overrides,
  } as unknown as Model<Flight>;
  const airlinesService = {
    findById: jest.fn().mockResolvedValue({ _id: airlineId }),
  } as unknown as AirlinesService;
  return {
    model,
    airlinesService,
    service: new FlightsService(model, airlinesService),
  };
}

describe('FlightsService', () => {
  it('locks airport changes when bookings exist and notifies confirmed passengers after time changes', async () => {
    const departureAirportId = new Types.ObjectId();
    const arrivalAirportId = new Types.ObjectId();
    const departureTime = new Date('2027-03-10T08:00:00.000Z');
    const arrivalTime = new Date('2027-03-10T12:00:00.000Z');
    const updatedFlight = { ...flight, airlineId, departureAirportId, arrivalAirportId, departureTime: new Date('2027-03-10T09:00:00.000Z'), arrivalTime } as Flight;
    const model = {
      findById: jest.fn().mockReturnValue(exec({ ...flight, airlineId, status: FlightStatus.SCHEDULED, departureAirportId, arrivalAirportId, departureTime, arrivalTime, cabins: [] })),
      findOne: jest.fn().mockReturnValue(exec(null)),
      findOneAndUpdate: jest.fn().mockReturnValue(exec(updatedFlight)),
    } as unknown as Model<Flight>;
    const referenceDataService = {
      findAirport: jest.fn()
        .mockResolvedValueOnce({ _id: departureAirportId, timezone: 'Africa/Cairo' })
        .mockResolvedValueOnce({ _id: arrivalAirportId, timezone: 'Asia/Dubai' }),
    };
    const flightBookingsService = {
      hasBookings: jest.fn().mockResolvedValue(false),
      findConfirmedUserIdsForFlight: jest.fn().mockResolvedValue(['user-1']),
    };
    const notificationsService = { notifyMany: jest.fn().mockResolvedValue([]) };
    const moduleRef = { get: jest.fn().mockReturnValue(flightBookingsService) } as unknown as ModuleRef;
    const airlinesService = { findById: jest.fn().mockResolvedValue({ _id: airlineId }) } as unknown as AirlinesService;
    const service = new FlightsService(model, airlinesService, referenceDataService as never, moduleRef, notificationsService as never);

    await service.update(flightId.toString(), { departureTime: '2027-03-10T12:00:00' }, moderator);

    expect(flightBookingsService.findConfirmedUserIdsForFlight).toHaveBeenCalledWith(flightId.toString());
    expect(notificationsService.notifyMany).toHaveBeenCalledWith(
      ['user-1'],
      'FLIGHT_SCHEDULE_CHANGED',
      expect.stringContaining('schedule changed'),
      `/flights/${flightId.toString()}`,
    );
  });

  it('rejects airport changes when any booking exists', async () => {
    const departureAirportId = new Types.ObjectId();
    const arrivalAirportId = new Types.ObjectId();
    const model = {
      findById: jest.fn().mockReturnValue(exec({ ...flight, airlineId, status: FlightStatus.SCHEDULED, departureAirportId, arrivalAirportId, departureTime: new Date('2027-03-10T08:00:00.000Z'), arrivalTime: new Date('2027-03-10T12:00:00.000Z'), cabins: [] })),
    } as unknown as Model<Flight>;
    const flightBookingsService = { hasBookings: jest.fn().mockResolvedValue(true) };
    const moduleRef = { get: jest.fn().mockReturnValue(flightBookingsService) } as unknown as ModuleRef;
    const airlinesService = { findById: jest.fn().mockResolvedValue({ _id: airlineId }) } as unknown as AirlinesService;
    const service = new FlightsService(model, airlinesService, undefined, moduleRef);

    await expect(service.update(flightId.toString(), { arrivalAirportId: new Types.ObjectId().toString() }, moderator)).rejects.toBeInstanceOf(ConflictException);
  });

  it('cancels all bookings after changing the flight status', async () => {
    const model = {
      findById: jest.fn().mockReturnValue(exec({ ...flight, airlineId, status: FlightStatus.SCHEDULED, cabins: [] })),
      findOneAndUpdate: jest.fn().mockReturnValue(exec({ ...flight, status: FlightStatus.CANCELLED })),
    } as unknown as Model<Flight>;
    const flightBookingsService = { cancelAllForFlight: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = { get: jest.fn().mockReturnValue(flightBookingsService) } as unknown as ModuleRef;
    const airlinesService = { findById: jest.fn().mockResolvedValue({ _id: airlineId }) } as unknown as AirlinesService;
    const service = new FlightsService(model, airlinesService, undefined, moduleRef);

    await service.cancel(flightId.toString(), moderator);

    expect(flightBookingsService.cancelAllForFlight).toHaveBeenCalledWith(flightId.toString());
  });

  it('finds a flight by id', async () => {
    const model = {
      findById: jest.fn().mockReturnValue(exec(flight)),
    } as unknown as Model<Flight>;
    const airlinesService = {
      findById: jest.fn(),
    } as unknown as AirlinesService;
    const service = new FlightsService(model, airlinesService);

    await expect(service.findById(flightId.toString())).resolves.toBe(flight);
    expect(model.findById).toHaveBeenCalledWith(flightId.toString());
  });

  it('returns 404 when a flight does not exist', async () => {
    const model = {
      findById: jest.fn().mockReturnValue(exec(null)),
    } as unknown as Model<Flight>;
    const airlinesService = {
      findById: jest.fn(),
    } as unknown as AirlinesService;
    const service = new FlightsService(model, airlinesService);

    await expect(service.findById(flightId.toString())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('marks only scheduled flights past departure as departed', async () => {
    const updateMany = jest.fn().mockReturnValue(exec({ modifiedCount: 1 }));
    const { service } = setup({ updateMany });

    await service.markDepartedFlights();

    expect(updateMany).toHaveBeenCalledWith(
      {
        status: FlightStatus.SCHEDULED,
        departureTime: { $lte: expect.any(Date) },
      },
      { $set: { status: FlightStatus.DEPARTED } },
    );
  });

  it('adds a cabin with counters initialized atomically', async () => {
    const { service, model } = setup();
    await service.addCabin(
      flightId.toString(),
      {
        cabinClass: CabinClass.ECONOMY,
        price: 250,
        totalSeats: 180,
        freeBags: 1,
        maxBagWeightKg: 23,
      },
      moderator,
    );

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: flightId.toString(),
        status: FlightStatus.SCHEDULED,
        airlineId,
      }),
      {
        $push: {
          cabins: expect.objectContaining({
            cabinClass: CabinClass.ECONOMY,
            availableSeats: 180,
            heldSeats: 0,
            bookedSeats: 0,
          }),
        },
      },
      { new: true, runValidators: true },
    );
  });

  it('adds the first cabin when the scheduled flight has an empty cabins array', async () => {
    const updatedFlight = {
      ...flight,
      airlineId,
      status: FlightStatus.SCHEDULED,
      cabins: [{ cabinClass: CabinClass.ECONOMY, totalSeats: 180 }],
    } as Flight;
    const { service, model } = setup({
      findOneAndUpdate: jest.fn((filter) => {
        expect(filter.cabins).toBeUndefined();
        expect(filter.$expr).toEqual(expect.any(Object));
        expect(filter.airlineId).toBeInstanceOf(Types.ObjectId);
        expect(filter.airlineId).toEqual(airlineId);
        return exec(updatedFlight);
      }),
    });

    await expect(
      service.addCabin(
        flightId.toString(),
        {
          cabinClass: CabinClass.ECONOMY,
          price: 200,
          totalSeats: 180,
          freeBags: 1,
          maxBagWeightKg: 23,
        },
        moderator,
      ),
    ).resolves.toBe(updatedFlight);
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('uses an ObjectId for the airline ownership filter when adding the first cabin', async () => {
    const { service, model } = setup();

    await service.addCabin(
      flightId.toString(),
      {
        cabinClass: CabinClass.ECONOMY,
        price: 200,
        totalSeats: 180,
        freeBags: 1,
        maxBagWeightKg: 23,
      },
      moderator,
    );

    const filter = (model.findOneAndUpdate as jest.Mock).mock.calls[0][0];
    expect(filter.airlineId).toBeInstanceOf(Types.ObjectId);
    expect(filter.airlineId).toEqual(airlineId);
  });

  it('rejects a cabin class that already exists', async () => {
    const { service } = setup({
      findById: jest.fn().mockReturnValue(
        exec({
          ...flight,
          airlineId,
          status: FlightStatus.SCHEDULED,
          cabins: [{ cabinClass: CabinClass.BUSINESS }],
        }),
      ),
    });

    await expect(
      service.addCabin(
        flightId.toString(),
        {
          cabinClass: CabinClass.BUSINESS,
          price: 500,
          totalSeats: 20,
          freeBags: 2,
          maxBagWeightKg: 32,
        },
        moderator,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses an atomic capacity condition when changing seat count', async () => {
    const cabinId = new Types.ObjectId();
    const { service, model } = setup({
      findById: jest.fn().mockReturnValue(
        exec({
          ...flight,
          airlineId,
          status: FlightStatus.SCHEDULED,
          cabins: [
            {
              _id: cabinId,
              cabinClass: CabinClass.ECONOMY,
              bookedSeats: 10,
              heldSeats: 5,
            },
          ],
        }),
      ),
    });

    await service.updateCabin(
      flightId.toString(),
      cabinId.toString(),
      { totalSeats: 20 },
      moderator,
    );

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ $expr: expect.any(Object) }),
      expect.any(Array),
      { new: true },
    );
  });
});
