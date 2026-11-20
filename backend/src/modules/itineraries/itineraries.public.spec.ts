import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { UsersService } from '../users/users.service';
import { ItinerariesService } from './itineraries.service';

describe('ItinerariesService public visibility, search, and clone (ITN-20, ITN-21)', () => {
  const ownerId = new Types.ObjectId();
  const countryId = new Types.ObjectId();
  const cityId = new Types.ObjectId();
  const cloneId = new Types.ObjectId();
  let service: ItinerariesService;
  let model: any;
  let referenceData: any;
  let users: any;
  let source: any;
  let cloneDocument: any;
  let listQuery: any;

  const makeQuery = (value: any) => {
    const query: any = {
      exec: jest.fn().mockResolvedValue(value),
      populate: jest.fn(),
    };
    query.populate.mockReturnValue(query);
    return query;
  };

  const makePublicItinerary = () => ({
    _id: new Types.ObjectId(),
    ownerId,
    title: 'Egypt trip',
    countryIds: [countryId],
    startDate: new Date('2026-12-01T00:00:00.000Z'),
    isPublic: true,
    isHidden: false,
    updatedAt: new Date('2026-11-20T00:00:00.000Z'),
    days: [
      {
        _id: new Types.ObjectId(),
        cityId,
        notes: 'Museum',
        activities: [
          {
            _id: new Types.ObjectId(),
            name: 'Museum visit',
            description: 'Explore the collection',
            images: [{ id: 'image-1', url: '/uploads/image-1.jpg' }],
          },
        ],
        budgetEntries: [
          { _id: new Types.ObjectId(), category: 'food', amount: 10, currency: 'EGP' },
        ],
      },
    ],
    transportCosts: [],
    toObject() {
      return { ...this };
    },
  });

  beforeEach(() => {
    source = makePublicItinerary();
    cloneDocument = makePublicItinerary();
    cloneDocument._id = cloneId;
    listQuery = {
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      populate: jest.fn(),
      exec: jest.fn().mockResolvedValue([source]),
    };
    listQuery.sort.mockReturnValue(listQuery);
    listQuery.skip.mockReturnValue(listQuery);
    listQuery.limit.mockReturnValue(listQuery);
    listQuery.populate.mockReturnValue(listQuery);
    model = {
      findOne: jest.fn().mockImplementation(() => makeQuery(source)),
      findById: jest.fn().mockImplementation(() => makeQuery(cloneDocument)),
      findOneAndUpdate: jest.fn().mockImplementation(() => makeQuery(source)),
      create: jest.fn().mockImplementation(async (data) => ({ _id: cloneId, ...data })),
      distinct: jest.fn().mockReturnValue(makeQuery([ownerId])),
      find: jest.fn().mockReturnValue(listQuery),
      countDocuments: jest.fn().mockReturnValue(makeQuery(1)),
    };
    referenceData = {
      findCountry: jest.fn().mockResolvedValue({ _id: countryId }),
      findCity: jest.fn().mockResolvedValue({ _id: cityId }),
      isSupportedCurrency: jest.fn().mockResolvedValue(true),
      listCountries: jest.fn().mockResolvedValue({
        data: [{ _id: countryId, code: 'EG', name: 'Egypt' }],
        totalPages: 1,
      }),
      listCities: jest.fn().mockResolvedValue({
        data: [{ _id: cityId, cityId: 'cairo', name: 'Cairo' }],
        totalPages: 1,
      }),
    };
    users = {
      findById: jest.fn().mockResolvedValue({
        _id: ownerId,
        name: 'Trip Author',
        preferredCurrency: 'EGP',
        status: UserStatus.ACTIVE,
      }),
      findPublicProfile: jest.fn().mockResolvedValue({
        id: ownerId.toString(),
        name: 'Trip Author',
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        status: UserStatus.ACTIVE,
      }),
    };
    service = new ItinerariesService(
      model,
      referenceData as ReferenceDataService,
      {} as UploadsService,
      {} as ExchangeRatesService,
      users as UsersService,
    );
  });

  it('sets Public/Private through the itinerary update and returns recalculated details', async () => {
    await service.update(
      source._id.toString(),
      { isPublic: false },
      { sub: ownerId.toString(), sid: 'session', email: 'owner@example.com', role: Role.USER },
    );
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: source._id.toString(), ownerId: expect.any(Types.ObjectId) },
      { $set: { isPublic: false } },
      { new: true, runValidators: true },
    );
  });

  it('searches title, seeded country/city names, duration and ID filters with pagination', async () => {
    const result = await service.searchPublic({
      q: 'Egypt',
      minDays: 1,
      maxDays: 3,
      countryId: 'EG',
      cityId: 'cairo',
      page: 1,
    });

    const [field, filter] = model.distinct.mock.calls[0];
    expect(field).toBe('ownerId');
    expect(filter).toEqual(expect.objectContaining({
      isPublic: true,
      isHidden: false,
      ownerId: { $in: [ownerId] },
      countryIds: countryId,
      'days.cityId': cityId,
      $or: expect.arrayContaining([
        expect.objectContaining({ title: expect.any(RegExp) }),
        { countryIds: { $in: [countryId] } },
        { 'days.cityId': { $in: [] } },
      ]),
      $expr: expect.any(Object),
    }));
    expect(referenceData.listCountries).toHaveBeenCalledWith(1);
    expect(referenceData.listCities).toHaveBeenCalledWith(1);
    expect(result.data[0].author.name).toBe('Trip Author');
    expect(result.total).toBe(1);

    await service.searchPublic({ q: 'Cairo', page: 1 });
    const citySearchFilter = model.distinct.mock.calls[1][1];
    expect(citySearchFilter.$or).toContainEqual({
      'days.cityId': { $in: [cityId] },
    });
  });

  it('rejects invalid duration ranges', async () => {
    await expect(
      service.searchPublic({ minDays: 4, maxDays: 2 }),
    ).rejects.toThrow(BadRequestException);
    expect(model.distinct).not.toHaveBeenCalled();
  });

  it('returns public read-only details with computed dates and author, hiding deactivated owners', async () => {
    const result = await service.findPublic(source._id.toString());
    expect(result.author.name).toBe('Trip Author');
    expect(result.days[0].dayNumber).toBe(1);
    expect(result.days[0].date).toEqual(new Date('2026-12-01T00:00:00.000Z'));
    expect(result.days[0].activities[0].name).toBe('Museum visit');
    expect(result.days[0].budgetEntries[0].amount).toBe(10);

    users.findById.mockResolvedValue({
      _id: ownerId,
      status: UserStatus.DEACTIVATED,
    });
    await expect(service.findPublic(source._id.toString())).rejects.toThrow(NotFoundException);
  });

  it('clones public content into an independent private itinerary with attribution', async () => {
    const user = {
      sub: new Types.ObjectId().toString(),
      sid: 'session',
      email: 'cloner@example.com',
      role: Role.USER,
    } as JwtUser;
    const result = await service.clonePublic(source._id.toString(), user);
    const cloneData = model.create.mock.calls[0][0];
    expect(cloneData.ownerId.toString()).toBe(user.sub);
    expect(cloneData.isPublic).toBe(false);
    expect(cloneData.clonedFromId).toEqual(source._id);
    expect(cloneData.originalAuthorId).toEqual(ownerId);
    expect(cloneData.days).toHaveLength(1);
    expect(cloneData.days[0].activities[0]).toEqual(
      expect.objectContaining({ name: 'Museum visit', images: [{ id: 'image-1', url: '/uploads/image-1.jpg' }] }),
    );
    expect(cloneData.days[0].budgetEntries[0].amount).toBe(10);
    expect(result._id).toEqual(cloneId);
    expect(model.findById).toHaveBeenCalledWith(cloneId);
  });
});
