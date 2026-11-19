import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { Role } from '../../common/enums/role.enum';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { HotelsService } from './hotels.service';
import { Hotel } from './schemas/hotel.schema';
import { Room } from './schemas/room.schema';

describe('HotelsService availability calendar', () => {
  const hotelId = new Types.ObjectId();
  let service: HotelsService;
  let hotelModel: { findById: jest.Mock };
  let roomModel: { find: jest.Mock };
  const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
  const query = (result: unknown) => ({ exec: jest.fn().mockResolvedValue(result) });
  const owner = {
    sub: new Types.ObjectId().toString(),
    sid: 'session',
    email: 'moderator@example.test',
    role: Role.HOTEL_MODERATOR,
    providerId: hotelId.toString(),
  } as JwtUser;

  beforeEach(() => {
    hotelModel = { findById: jest.fn() };
    roomModel = { find: jest.fn() };
    service = new HotelsService(
      hotelModel as unknown as Model<Hotel>,
      roomModel as unknown as Model<Room>,
      {} as ReferenceDataService,
      {} as UploadsService,
    );
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(query({ _id: hotelId })),
    });
  });

  it('returns each inclusive date as available or blocked for every hotel room', async () => {
    roomModel.find.mockReturnValue(query([
      {
        _id: new Types.ObjectId(),
        name: 'Room A',
        isActive: true,
        availabilityRanges: [{ startDate: date('2026-12-10'), endDate: date('2026-12-12') }],
        blockedRanges: [{ startDate: date('2026-12-11'), endDate: date('2026-12-11') }],
      },
      {
        _id: new Types.ObjectId(),
        name: 'Room B',
        isActive: false,
        availabilityRanges: [{ startDate: date('2026-12-10'), endDate: date('2026-12-12') }],
        blockedRanges: [],
      },
    ]));

    const result = await service.getAvailabilityCalendar(
      hotelId.toString(),
      '2026-12-10',
      '2026-12-12',
      owner,
    );

    expect(roomModel.find).toHaveBeenCalledWith({ hotelId: hotelId.toString() });
    expect(result[0].dates).toEqual([
      { date: '2026-12-10', status: 'Available' },
      { date: '2026-12-11', status: 'Blocked' },
      { date: '2026-12-12', status: 'Available' },
    ]);
    expect(result[1].dates.every(({ status }) => status === 'Blocked')).toBe(true);
  });

  it('rejects a reversed date range', async () => {
    await expect(
      service.getAvailabilityCalendar(hotelId.toString(), '2026-12-12', '2026-12-10', owner),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(roomModel.find).not.toHaveBeenCalled();
  });

  it('returns not found for a hotel moderator who does not own the hotel', async () => {
    const anotherUser = { ...owner, providerId: new Types.ObjectId().toString() } as JwtUser;
    await expect(
      service.getAvailabilityCalendar(
        hotelId.toString(),
        '2026-12-10',
        '2026-12-12',
        anotherUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(hotelModel.findById).not.toHaveBeenCalled();
    expect(roomModel.find).not.toHaveBeenCalled();
  });

  it('rejects malformed calendar dates', async () => {
    await expect(
      service.getAvailabilityCalendar(hotelId.toString(), '2026-02-30', '2026-03-01', owner),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
