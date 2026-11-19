import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewModel: {
    create: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
    aggregate: jest.Mock;
  };
  let hotelsService: { findById: jest.Mock; updateRating: jest.Mock };
  let usersService: { findPublicProfile: jest.Mock };

  beforeEach(() => {
    reviewModel = {
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn().mockReturnValue(query([])),
    };
    hotelsService = {
      findById: jest
        .fn()
        .mockResolvedValue({ averageRating: 4.5, ratingsCount: 2 }),
      updateRating: jest.fn().mockResolvedValue(undefined),
    };
    usersService = {
      findPublicProfile: jest.fn().mockResolvedValue({
        id: 'user-id',
        name: 'Deleted user',
        joinedAt: new Date(),
        status: 'deactivated',
      }),
    };
    service = new ReviewsService(
      reviewModel as never,
      hotelsService as never,
      usersService as never,
    );
  });

  it('creates a review and recalculates the visible hotel rating', async () => {
    const userId = new Types.ObjectId();
    const hotelId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const review = reviewDocument(userId, hotelId, bookingId, 5, 'Great stay');
    reviewModel.create.mockResolvedValue(review);
    reviewModel.aggregate.mockReturnValue(
      query([{ averageRating: 4.75, ratingsCount: 4 }]),
    );

    const result = await service.createForBooking(
      userId.toString(),
      hotelId.toString(),
      bookingId.toString(),
      { rating: 5, text: 'Great stay' },
    );

    expect(reviewModel.create).toHaveBeenCalledWith({
      userId,
      hotelId,
      hotelBookingId: bookingId,
      rating: 5,
      text: 'Great stay',
    });
    expect(hotelsService.updateRating).toHaveBeenCalledWith(
      hotelId.toString(),
      4.75,
      4,
    );
    expect(result.author.name).toBe('Deleted user');
  });

  it('returns 409 when the unique booking review already exists', async () => {
    reviewModel.create.mockRejectedValue({ code: 11000 });
    await expect(
      service.createForBooking(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        { rating: 4 },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates an owned review and recalculates its hotel rating', async () => {
    const userId = new Types.ObjectId();
    const hotelId = new Types.ObjectId();
    const review = reviewDocument(
      userId,
      hotelId,
      new Types.ObjectId(),
      4,
      'Updated text',
    );
    reviewModel.findOneAndUpdate.mockReturnValue(query(review));

    await service.update(new Types.ObjectId().toString(), userId.toString(), {
      text: 'Updated text',
    });

    expect(
      reviewModel.findOneAndUpdate.mock.calls[0][0].userId.toString(),
    ).toBe(userId.toString());
    expect(hotelsService.updateRating).toHaveBeenCalledWith(
      hotelId.toString(),
      0,
      0,
    );
  });

  it('rejects an empty review update', async () => {
    await expect(
      service.update(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 when a review is not owned by the caller', async () => {
    reviewModel.findOneAndDelete.mockReturnValue(query(null));
    await expect(
      service.remove(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists visible reviews newest-first with rating totals and deleted-user label', async () => {
    const hotelId = new Types.ObjectId();
    const review = reviewDocument(
      new Types.ObjectId(),
      hotelId,
      new Types.ObjectId(),
      5,
      'Lovely',
    );
    reviewModel.find.mockReturnValue(query([review]));
    reviewModel.countDocuments.mockReturnValue(query(1));

    const result = await service.listForHotel(hotelId.toString(), { page: 1 });

    expect(reviewModel.find.mock.calls[0][0]).toEqual({
      hotelId,
      isHidden: false,
    });
    expect(result).toMatchObject({
      averageRating: 4.5,
      ratingsCount: 2,
      page: 1,
      limit: 10,
      total: 1,
    });
    expect(result.data[0].author.name).toBe('Deleted user');
  });
});

function query<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function reviewDocument(
  userId: Types.ObjectId,
  hotelId: Types.ObjectId,
  hotelBookingId: Types.ObjectId,
  rating: number,
  text?: string,
) {
  return {
    _id: new Types.ObjectId(),
    userId,
    hotelId,
    hotelBookingId,
    rating,
    text,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  };
}
