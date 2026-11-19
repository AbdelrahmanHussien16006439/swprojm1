import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { HotelsService } from './hotels.service';
import { Hotel } from './schemas/hotel.schema';
import { Room } from './schemas/room.schema';

describe('HotelsService basics', () => {
  let service: HotelsService;
  let hotelModel: {
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  let roomModel: {
    find: jest.Mock;
    updateMany: jest.Mock;
  };

  beforeEach(() => {
    hotelModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    roomModel = {
      find: jest.fn(),
      updateMany: jest.fn(),
    };
    service = new HotelsService(
      hotelModel as unknown as Model<Hotel>,
      roomModel as unknown as Model<Room>,
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
});
