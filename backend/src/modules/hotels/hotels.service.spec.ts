import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { HotelsService } from './hotels.service';
import { Hotel } from './schemas/hotel.schema';
import { Room } from './schemas/room.schema';

describe('HotelsService basics', () => {
  let service: HotelsService;
  let hotelModel: {
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findOneAndUpdate: jest.Mock;
    create: jest.Mock;
  };
  let roomModel: {
    find: jest.Mock;
    updateMany: jest.Mock;
  };
  let referenceDataService: {
    findCity: jest.Mock;
    findCountry: jest.Mock;
  };

  beforeEach(() => {
    hotelModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
    };
    roomModel = {
      find: jest.fn(),
      updateMany: jest.fn(),
    };
    referenceDataService = {
      findCity: jest.fn(),
      findCountry: jest.fn(),
    };
    service = new HotelsService(
      hotelModel as unknown as Model<Hotel>,
      roomModel as unknown as Model<Room>,
      referenceDataService as unknown as ReferenceDataService,
    );
  });

  it('finds a hotel and populates reference data', async () => {
    const hotel = { name: 'Nile View' };
    const exec = jest.fn().mockResolvedValue(hotel);
    const populate = jest.fn().mockReturnValue({ exec });
    hotelModel.findById.mockReturnValue({ populate });

    await expect(service.findById('hotel-id')).resolves.toBe(hotel);
    expect(populate).toHaveBeenCalledWith('cityId countryId');
  });

  it('throws not found when a hotel does not exist', async () => {
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    });

    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates activation state and rating with validators enabled', async () => {
    const hotel = { isActive: false, averageRating: 4.5, ratingsCount: 2 };
    const exec = jest.fn().mockResolvedValue(hotel);
    hotelModel.findByIdAndUpdate.mockReturnValue({ exec });

    await expect(service.setActive('hotel-id', false)).resolves.toBe(hotel);
    expect(hotelModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'hotel-id',
      { $set: { isActive: false } },
      { new: true, runValidators: true },
    );

    await expect(service.updateRating('hotel-id', 4.5, 2)).resolves.toBe(hotel);
    expect(hotelModel.findByIdAndUpdate).toHaveBeenLastCalledWith(
      'hotel-id',
      { $set: { averageRating: 4.5, ratingsCount: 2 } },
      { new: true, runValidators: true },
    );
  });

  it('queries rooms by ids and marks reserved rooms as ever reserved', async () => {
    const rooms = [{ name: 'Room 1' }];
    roomModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(rooms) });
    roomModel.updateMany.mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) });

    await expect(service.findRoomsByIds(['room-id'])).resolves.toBe(rooms);
    expect(roomModel.find).toHaveBeenCalledWith({ _id: { $in: ['room-id'] } });

    await expect(service.markRoomsReserved(['room-id'])).resolves.toBeUndefined();
    expect(roomModel.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['room-id'] } },
      { $set: { everReserved: true } },
    );
  });

  it('does not issue an update for an empty room id list', async () => {
    await service.markRoomsReserved([]);
    expect(roomModel.updateMany).not.toHaveBeenCalled();
  });

  it('creates a hotel with ObjectId references resolved from official ids', async () => {
    const cityObjectId = '64b000000000000000000001';
    const countryObjectId = '64b000000000000000000002';
    referenceDataService.findCity.mockResolvedValue({
      _id: cityObjectId,
      countryId: { _id: countryObjectId },
    });
    referenceDataService.findCountry.mockResolvedValue({ _id: countryObjectId });
    const createdHotel = { name: 'Nile View Hotel' };
    hotelModel.create.mockResolvedValue(createdHotel);

    const result = await service.create({
      name: ' Nile View Hotel ',
      address: ' 12 Corniche ',
      cityId: 'cairo',
      countryId: 'EG',
      description: ' A riverside hotel ',
      stars: 5,
      amenities: [' Wi-Fi '],
    });

    expect(result).toBe(createdHotel);
    expect(hotelModel.create).toHaveBeenCalledWith({
      name: 'Nile View Hotel',
      address: '12 Corniche',
      cityId: cityObjectId,
      countryId: countryObjectId,
      description: 'A riverside hotel',
      stars: 5,
      amenities: ['Wi-Fi'],
    });
  });

  it('rejects a city and country pair that do not match', async () => {
    referenceDataService.findCity.mockResolvedValue({
      _id: '64b000000000000000000001',
      countryId: { _id: '64b000000000000000000003' },
    });
    referenceDataService.findCountry.mockResolvedValue({
      _id: '64b000000000000000000002',
    });

    await expect(
      service.create({
        name: 'Hotel',
        address: 'Address',
        cityId: 'cairo',
        countryId: 'AE',
        description: 'Description',
        stars: 4,
        amenities: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(hotelModel.create).not.toHaveBeenCalled();
  });

  it('hides hotel profile updates from a moderator who does not own the hotel', async () => {
    const user = { providerId: '64b000000000000000000002' } as JwtUser;

    await expect(
      service.update('64b000000000000000000001', { name: 'Other hotel' }, user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(hotelModel.findById).not.toHaveBeenCalled();
  });

  it('allows the owning moderator to update the hotel profile', async () => {
    const hotelId = '64b000000000000000000001';
    const countryId = '64b000000000000000000002';
    const hotel = { cityId: '64b000000000000000000003', countryId };
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(hotel) }),
    });
    const updated = { name: 'Updated Nile View' };
    hotelModel.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) }),
    });

    await expect(
      service.update(hotelId, { name: 'Updated Nile View' }, { providerId: hotelId } as JwtUser),
    ).resolves.toBe(updated);
    expect(hotelModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: hotelId },
      { $set: { name: 'Updated Nile View' } },
      { new: true, runValidators: true },
    );
  });

  it('updates policy times and cancellation tiers for the owning moderator', async () => {
    const hotelId = '64b000000000000000000001';
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ cityId: 'city-id', countryId: 'country-id' }),
      }),
    });
    const updated = { checkInTime: '14:00', checkOutTime: '11:00' };
    hotelModel.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) }),
    });
    const dto = {
      checkInTime: '14:00',
      checkOutTime: '11:00',
      tiers: [{ daysBefore: 30, refundPercent: 75 }],
    };

    await expect(
      service.updatePolicies(hotelId, dto, { providerId: hotelId } as JwtUser),
    ).resolves.toBe(updated);
    expect(hotelModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: hotelId },
      {
        $set: {
          checkInTime: '14:00',
          checkOutTime: '11:00',
          cancellationTiers: dto.tiers,
        },
      },
      { new: true, runValidators: true },
    );
  });
});
