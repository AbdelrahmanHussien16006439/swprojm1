import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserStatus } from '../../common/enums/user-status.enum';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { Types } from 'mongoose';
import { AuthorsController } from './authors.controller';

describe('AuthorsController (BLG-12)', () => {
  const authorId = '665f1e77d8e043d0b1c0a111';
  const profile = {
    id: authorId,
    name: 'Travel Writer',
    joinedAt: new Date('2024-01-02T00:00:00Z'),
    status: UserStatus.ACTIVE,
  };

  function makeController(overrides: Record<string, any> = {}) {
    const usersService = {
      findPublicProfile: jest.fn().mockResolvedValue(profile),
      ...overrides.usersService,
    };
    const blogService = {
      listPublicPostsByAuthor: jest.fn().mockResolvedValue({
        data: [],
        page: 2,
        limit: 10,
        total: 0,
        totalPages: 0,
      }),
      ...overrides.blogService,
    };
    const itineraries = overrides.itineraries ?? [
      {
        _id: new Types.ObjectId('665f1e77d8e043d0b1c0a333'),
        title: 'Public itinerary',
        countryIds: [],
        startDate: new Date('2026-12-01T00:00:00Z'),
        days: [{}, {}],
      },
    ];
    const query = {
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(itineraries),
    };
    const itineraryModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(itineraries.length) }),
    };
    const controller = new AuthorsController(
      usersService as any,
      blogService as any,
      itineraryModel as any,
    );
    return { controller, usersService, blogService, itineraryModel, query };
  }

  it('returns the profile with paginated public posts and visible public itineraries', async () => {
    const { controller, usersService, blogService, itineraryModel } = makeController();

    const result = await controller.getAuthorProfile(authorId, { page: 2 });

    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthorsController),
    ).toBeUndefined();
    expect(usersService.findPublicProfile).toHaveBeenCalledWith(authorId);
    expect(blogService.listPublicPostsByAuthor).toHaveBeenCalledWith(
      authorId,
      2,
    );
    expect(itineraryModel.find).toHaveBeenCalledWith({
      ownerId: new Types.ObjectId(authorId),
      isPublic: true,
      isHidden: false,
    });
    expect(result).toEqual({
      author: {
        id: authorId,
        name: 'Travel Writer',
        joinedAt: profile.joinedAt,
      },
      posts: {
        data: [],
        page: 2,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
      itineraries: {
        data: [{
          id: '665f1e77d8e043d0b1c0a333',
          title: 'Public itinerary',
          countries: [],
          startDate: new Date('2026-12-01T00:00:00Z'),
          days: 2,
        }],
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns 404 when UsersService cannot find the author', async () => {
    const { controller, blogService, itineraryModel } = makeController({
      usersService: {
        findPublicProfile: jest
          .fn()
          .mockRejectedValue(new NotFoundException('User not found')),
      },
    });

    await expect(
      controller.getAuthorProfile(authorId, { page: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(blogService.listPublicPostsByAuthor).not.toHaveBeenCalled();
    expect(itineraryModel.find).not.toHaveBeenCalled();
  });

  it('does not query itineraries for a deactivated author', async () => {
    const { controller, itineraryModel } = makeController({
      usersService: {
        findPublicProfile: jest.fn().mockResolvedValue({
          ...profile,
          name: 'Deleted user',
          status: UserStatus.DEACTIVATED,
        }),
      },
    });

    const result = await controller.getAuthorProfile(authorId, { page: 1 });

    expect(result.author.name).toBe('Deleted user');
    expect(result.itineraries).toBeNull();
    expect(itineraryModel.find).not.toHaveBeenCalled();
  });

  it('validates author IDs as Mongo ObjectIds', () => {
    expect(() => new ParseObjectIdPipe().transform('bad-id')).toThrow(
      '"bad-id" is not a valid id',
    );
  });

});
