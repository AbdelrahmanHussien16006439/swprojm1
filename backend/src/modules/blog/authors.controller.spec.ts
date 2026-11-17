import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserStatus } from '../../common/enums/user-status.enum';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AuthorsController } from './authors.controller';
import {
  PendingPublicItineraryReader,
  PUBLIC_ITINERARY_READER,
} from './public-itinerary-reader';

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
    const itineraryReader = {
      listPublicByAuthor: jest.fn().mockResolvedValue(null),
      ...overrides.itineraryReader,
    };
    const controller = new AuthorsController(
      usersService as any,
      blogService as any,
      itineraryReader as any,
    );
    return { controller, usersService, blogService, itineraryReader };
  }

  it('is public and returns the profile with paginated public posts and the pending itinerary value', async () => {
    const { controller, usersService, blogService, itineraryReader } =
      makeController();

    const result = await controller.getAuthorProfile(authorId, { page: 2 });

    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthorsController),
    ).toBeUndefined();
    expect(usersService.findPublicProfile).toHaveBeenCalledWith(authorId);
    expect(blogService.listPublicPostsByAuthor).toHaveBeenCalledWith(
      authorId,
      2,
    );
    expect(itineraryReader.listPublicByAuthor).toHaveBeenCalledWith(
      authorId,
      2,
    );
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
      itineraries: null,
    });
  });

  it('returns 404 when UsersService cannot find the author', async () => {
    const { controller, blogService, itineraryReader } = makeController({
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
    expect(itineraryReader.listPublicByAuthor).not.toHaveBeenCalled();
  });

  it('does not query itineraries for a deactivated author', async () => {
    const { controller, itineraryReader } = makeController({
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
    expect(itineraryReader.listPublicByAuthor).not.toHaveBeenCalled();
  });

  it('validates author IDs as Mongo ObjectIds', () => {
    expect(() => new ParseObjectIdPipe().transform('bad-id')).toThrow(
      '"bad-id" is not a valid id',
    );
  });

  it('registers a dependency stub that returns null instead of invented itinerary data', async () => {
    expect(PUBLIC_ITINERARY_READER).toBeDefined();
    await expect(
      new PendingPublicItineraryReader().listPublicByAuthor(authorId, 1),
    ).resolves.toBeNull();
  });
});
