import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { HotelsService } from './hotels.service';
import { Hotel } from './schemas/hotel.schema';
import { Room } from './schemas/room.schema';

describe('HotelsService search and availability', () => {
  const hotelId = new Types.ObjectId();
  const cityId = new Types.ObjectId();
  const countryId = new Types.ObjectId();
  let service: HotelsService;
  let hotelModel: { find: jest.Mock; findById: jest.Mock };
  let roomModel: { find: jest.Mock };
  let referenceDataService: { findCity: jest.Mock; findCountry: jest.Mock };
  let hotelBookingsService: { findRoomNights: jest.Mock; hasActiveReservationOverlap: jest.Mock };

  const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
  const hotel = (overrides: Record<string, unknown> = {}) => ({
    _id: hotelId,
    name: 'Nile View',
    isActive: true,
    averageRating: 4.5,
    ratingsCount: 2,
    toObject: () => ({ name: 'Nile View', averageRating: 4.5, ...overrides }),
    ...overrides,
  });
  const room = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    hotelId,
    isActive: true,
    pricePerNight: 100,
    maxOccupancy: 2,
    availabilityRanges: [{ startDate: date('2026-12-01'), endDate: date('2026-12-31') }],
    blockedRanges: [],
    toObject: () => ({ name: 'Room', pricePerNight: 100, ...overrides }),
    ...overrides,
  });
  const query = (result: unknown) => ({ exec: jest.fn().mockResolvedValue(result) });

  beforeEach(() => {
    hotelModel = { find: jest.fn(), findById: jest.fn() };
    roomModel = { find: jest.fn() };
    referenceDataService = {
      findCity: jest.fn().mockResolvedValue({ _id: cityId }),
      findCountry: jest.fn().mockResolvedValue({ _id: countryId }),
    };
    hotelBookingsService = {
      findRoomNights: jest.fn().mockResolvedValue([]),
      hasActiveReservationOverlap: jest.fn().mockResolvedValue(false),
    };
    service = new HotelsService(
      hotelModel as unknown as Model<Hotel>,
      roomModel as unknown as Model<Room>,
      referenceDataService as unknown as ReferenceDataService,
      {} as UploadsService,
      hotelBookingsService as never,
      {} as never,
    );
  });

  const searchDto = (overrides: Partial<SearchHotelsDto> = {}): SearchHotelsDto => ({
    cityId: 'cairo',
    checkIn: '2026-12-10',
    checkOut: '2026-12-12',
    guests: 3,
    rooms: 2,
    page: 1,
    sortBy: 'price',
    order: 'asc',
    ...overrides,
  } as SearchHotelsDto);

  it('matches a hotel when multiple available rooms jointly cover guests', async () => {
    const hotelDoc = hotel();
    hotelModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue(query([hotelDoc])),
    });
    roomModel.find.mockReturnValue(query([room({ pricePerNight: 120 }), room({ pricePerNight: 80 })]));

    const result = await service.search(searchDto({ minPrice: 80, maxPrice: 80 }));

    expect(hotelModel.find).toHaveBeenCalledWith({ cityId, isActive: true });
    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({ cheapestRoomPrice: 80, availableRoomCount: 2 });
  });

  it('excludes a hotel when its rooms are blocked for any night or have too little capacity', async () => {
    const blocked = room({
      blockedRanges: [{ startDate: date('2026-12-11'), endDate: date('2026-12-11') }],
    });
    const tooSmall = room({ maxOccupancy: 1 });
    hotelModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue(query([hotel()])),
    });
    roomModel.find.mockReturnValue(query([blocked, tooSmall]));

    const result = await service.search(searchDto({ rooms: 1, guests: 2 }));
    expect(result.total).toBe(0);
  });

  it('excludes rooms with active RoomNight reservations from search and available rooms', async () => {
    const reservedRoom = room();
    const freeRoom = room();
    const hotelDoc = hotel();
    hotelModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue(query([hotelDoc])),
    });
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(query({ isActive: true })),
    });
    roomModel.find
      .mockReturnValueOnce(query([reservedRoom, freeRoom]))
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue(query([reservedRoom, freeRoom])),
      });
    hotelBookingsService.findRoomNights.mockResolvedValueOnce([
      { roomId: reservedRoom._id, date: date('2026-12-10'), bookingReference: 'HTL-BOOKED-1' },
    ]).mockResolvedValueOnce([
      { roomId: reservedRoom._id, date: date('2026-12-10'), bookingReference: 'HTL-BOOKED-1' },
    ]);

    const results = await service.search(searchDto({ rooms: 1, guests: 1 }));
    const freeRooms = await service.getFreeRooms(
      hotelId.toString(),
      '2026-12-10',
      '2026-12-12',
    );

    expect(results.data[0].availableRoomCount).toBe(1);
    expect(freeRooms).toHaveLength(1);
    expect(hotelBookingsService.findRoomNights).toHaveBeenNthCalledWith(
      1,
      [reservedRoom._id.toString(), freeRoom._id.toString()],
      date('2026-12-10'),
      date('2026-12-12'),
    );
  });

  it('applies rating and price bounds inclusively and sorts by rating', async () => {
    const lowerRated = hotel({ _id: new Types.ObjectId(), averageRating: 3, ratingsCount: 1 });
    const higherRated = hotel({ _id: new Types.ObjectId(), name: 'Garden', averageRating: 5 });
    hotelModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue(query([lowerRated, higherRated])),
    });
    roomModel.find.mockReturnValue(query([
      room({ hotelId: lowerRated._id, pricePerNight: 100 }),
      room({ hotelId: higherRated._id, pricePerNight: 100 }),
    ]));

    const result = await service.search(searchDto({
      rooms: 1,
      guests: 1,
      minPrice: 100,
      maxPrice: 100,
      minRating: 4,
      sortBy: 'rating',
      order: 'desc',
    }));

    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe('Garden');
  });

  it('requires exactly one valid city or country filter', async () => {
    await expect(service.search(searchDto({ cityId: undefined }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.search(searchDto({ countryId: 'EG' }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    referenceDataService.findCity.mockRejectedValue(new NotFoundException());
    await expect(service.search(searchDto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects past check-in and checkout dates that are not after check-in', async () => {
    await expect(service.search(searchDto({ checkIn: '2020-01-01' }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.search(searchDto({ checkOut: '2026-12-10' }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns free rooms with total stay price and omits rooms unavailable on a stay night', async () => {
    const hotelDoc = { isActive: true };
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(query(hotelDoc)),
    });
    const free = room({ pricePerNight: 125 });
    const unavailable = room({
      blockedRanges: [{ startDate: date('2026-12-11'), endDate: date('2026-12-11') }],
    });
    roomModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue(query([free, unavailable])),
    });

    const result = await service.getFreeRooms(hotelId.toString(), '2026-12-10', '2026-12-12');
    expect(result).toHaveLength(1);
    expect(result[0].totalStayPrice).toBe(250);
  });
});
