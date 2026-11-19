import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { HotelsService } from './hotels.service';
import { Hotel } from './schemas/hotel.schema';
import { Room, RoomDateRange } from './schemas/room.schema';

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
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    create: jest.Mock;
    deleteOne: jest.Mock;
    updateMany: jest.Mock;
  };
  let referenceDataService: {
    findCity: jest.Mock;
    findCountry: jest.Mock;
  };
  let uploadsService: {
    saveImage: jest.Mock;
    deleteImage: jest.Mock;
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
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
      updateMany: jest.fn(),
    };
    referenceDataService = {
      findCity: jest.fn(),
      findCountry: jest.fn(),
    };
    uploadsService = {
      saveImage: jest.fn(),
      deleteImage: jest.fn(),
    };
    service = new HotelsService(
      hotelModel as unknown as Model<Hotel>,
      roomModel as unknown as Model<Room>,
      referenceDataService as unknown as ReferenceDataService,
      uploadsService as unknown as UploadsService,
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

  it('creates a room for the owning hotel moderator', async () => {
    const hotelId = '64b000000000000000000001';
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: hotelId }) }),
    });
    const created = { name: 'Deluxe King 301' };
    roomModel.create.mockResolvedValue(created);
    const dto: CreateRoomDto = {
      name: ' Deluxe King 301 ',
      type: ' Deluxe ',
      beds: 1,
      maxOccupancy: 2,
      pricePerNight: 120,
    };

    await expect(
      service.createRoom(hotelId, dto, { providerId: hotelId } as JwtUser),
    ).resolves.toBe(created);
    expect(roomModel.create).toHaveBeenCalledWith({
      hotelId,
      name: 'Deluxe King 301',
      type: 'Deluxe',
      beds: 1,
      maxOccupancy: 2,
      pricePerNight: 120,
    });
  });

  it('maps duplicate room names to a conflict', async () => {
    const hotelId = '64b000000000000000000001';
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: hotelId }) }),
    });
    roomModel.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.createRoom(
        hotelId,
        { name: '301', type: 'Deluxe', beds: 1, maxOccupancy: 2, pricePerNight: 120 },
        { providerId: hotelId } as JwtUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when another hotel moderator tries to manage a room', async () => {
    await expect(
      service.createRoom(
        '64b000000000000000000001',
        { name: '301', type: 'Deluxe', beds: 1, maxOccupancy: 2, pricePerNight: 120 },
        { providerId: '64b000000000000000000002' } as JwtUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(hotelModel.findById).not.toHaveBeenCalled();
  });

  it('rejects an overlapping availability range before saving', async () => {
    const hotelId = '64b000000000000000000001';
    const roomId = '64b000000000000000000002';
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: hotelId }) }),
    });
    const room = {
      availabilityRanges: [
        {
          startDate: new Date('2026-12-01T00:00:00.000Z'),
          endDate: new Date('2026-12-10T00:00:00.000Z'),
        },
      ] as RoomDateRange[],
      save: jest.fn(),
    };
    roomModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(room) });

    await expect(
      service.addAvailability(
        hotelId,
        roomId,
        { startDate: '2026-12-10', endDate: '2026-12-15' },
        { providerId: hotelId } as JwtUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(room.save).not.toHaveBeenCalled();
  });

  it('only deletes rooms that have never been reserved', async () => {
    const hotelId = '64b000000000000000000001';
    const roomId = '64b000000000000000000002';
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: hotelId }) }),
    });
    roomModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: roomId, everReserved: true }),
    });

    await expect(
      service.deleteRoom(hotelId, roomId, { providerId: hotelId } as JwtUser),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(roomModel.deleteOne).not.toHaveBeenCalled();
  });

  it('edits room beds, occupancy and current price without changing room identity', async () => {
    const hotelId = '64b000000000000000000001';
    const roomId = '64b000000000000000000002';
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: hotelId }) }),
    });
    roomModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: roomId, hotelId, everReserved: true }),
    });
    const updated = { _id: roomId, beds: 2, maxOccupancy: 3, pricePerNight: 140 };
    roomModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });

    await expect(
      service.updateRoom(
        hotelId,
        roomId,
        { beds: 2, maxOccupancy: 3, pricePerNight: 140 },
        { providerId: hotelId } as JwtUser,
      ),
    ).resolves.toBe(updated);
    expect(roomModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: roomId, hotelId },
      { $set: { beds: 2, maxOccupancy: 3, pricePerNight: 140 } },
      { new: true, runValidators: true },
    );
  });

  it('deletes a never-reserved room', async () => {
    const hotelId = '64b000000000000000000001';
    const roomId = '64b000000000000000000002';
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: hotelId }) }),
    });
    roomModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: roomId, everReserved: false }),
    });
    roomModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) });

    await expect(
      service.deleteRoom(hotelId, roomId, { providerId: hotelId } as JwtUser),
    ).resolves.toBeUndefined();
    expect(roomModel.deleteOne).toHaveBeenCalledWith({ _id: roomId, hotelId });
  });

  it('uploads a photo through UploadsService and atomically adds it below the limit', async () => {
    const hotelId = '64b000000000000000000001';
    const image = { id: 'photo-uuid', url: '/uploads/photo-uuid.jpg' };
    const updated = { photos: [image] };
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: hotelId, photos: [] }),
      }),
    });
    uploadsService.saveImage.mockResolvedValue(image);
    hotelModel.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) }),
    });

    await expect(
      service.addPhoto(hotelId, {} as Express.Multer.File, { providerId: hotelId } as JwtUser),
    ).resolves.toBe(updated);
    expect(uploadsService.saveImage).toHaveBeenCalledTimes(1);
    expect(hotelModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: hotelId, 'photos.4': { $exists: false } },
      { $push: { photos: image } },
      { new: true, runValidators: true },
    );
    expect(uploadsService.deleteImage).not.toHaveBeenCalled();
  });

  it('rejects a sixth photo before writing a file', async () => {
    const hotelId = '64b000000000000000000001';
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: hotelId,
          photos: Array.from({ length: 5 }, (_, index) => ({ id: `photo-${index}` })),
        }),
      }),
    });

    await expect(
      service.addPhoto(hotelId, {} as Express.Multer.File, { providerId: hotelId } as JwtUser),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(uploadsService.saveImage).not.toHaveBeenCalled();
  });

  it('cleans up an uploaded file if the atomic photo add loses a race', async () => {
    const hotelId = '64b000000000000000000001';
    const image = { id: 'photo-uuid', url: '/uploads/photo-uuid.jpg' };
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: hotelId, photos: [] }),
      }),
    });
    uploadsService.saveImage.mockResolvedValue(image);
    hotelModel.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    });

    await expect(
      service.addPhoto(hotelId, {} as Express.Multer.File, { providerId: hotelId } as JwtUser),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(image.id);
  });

  it('removes the hotel photo record and its managed file', async () => {
    const hotelId = '64b000000000000000000001';
    const photoId = 'photo-uuid';
    const photo = { id: photoId, url: '/uploads/photo-uuid.jpg' };
    const updated = { photos: [] };
    hotelModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: hotelId, photos: [photo] }),
      }),
    });
    hotelModel.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) }),
    });

    await expect(
      service.removePhoto(hotelId, photoId, { providerId: hotelId } as JwtUser),
    ).resolves.toBe(updated);
    expect(hotelModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: hotelId, 'photos.id': photoId },
      { $pull: { photos: { id: photoId } } },
      { new: true, runValidators: true },
    );
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(photoId);
  });
});
