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

describe('ItinerariesService budget summary (ITN-14, ITN-18)', () => {
  const ownerId = new Types.ObjectId();
  const cityA = new Types.ObjectId();
  const cityB = new Types.ObjectId();
  const day1Id = new Types.ObjectId();
  const day2Id = new Types.ObjectId();
  const day3Id = new Types.ObjectId();
  const rateDate = new Date('2026-11-20T00:00:00.000Z');
  let service: ItinerariesService;
  let itineraryModel: any;
  let referenceData: jest.Mocked<Pick<ReferenceDataService, 'findCountry' | 'isSupportedCurrency'>>;
  let exchangeRates: jest.Mocked<Pick<ExchangeRatesService, 'convert'>>;
  let users: jest.Mocked<Pick<UsersService, 'findById'>>;
  let itinerary: any;

  const makeQuery = () => ({
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(itinerary),
  });

  beforeEach(() => {
    itinerary = {
      _id: new Types.ObjectId(),
      ownerId,
      isPublic: true,
      isHidden: false,
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      days: [
        {
          _id: day1Id,
          cityId: cityA,
          budgetEntries: [{ category: 'food', amount: 10, currency: 'USD' }],
          activities: [{ cost: 5, currency: 'USD' }],
        },
        {
          _id: day2Id,
          cityId: cityA,
          budgetEntries: [{ category: 'accommodation', amount: 30, currency: 'EGP' }],
          activities: [],
        },
        { _id: day3Id, cityId: cityB, budgetEntries: [], activities: [] },
      ],
      transportCosts: [
        { dayId: day1Id, amount: 2, currency: 'EUR' },
      ],
    };
    itineraryModel = { findById: jest.fn().mockImplementation(makeQuery) };
    referenceData = {
      findCountry: jest.fn(),
      isSupportedCurrency: jest.fn().mockResolvedValue(true),
    };
    exchangeRates = {
      convert: jest.fn().mockImplementation(async (amount, from, to) => ({
        amount: amount * (from === to ? 1 : from === 'USD' ? 0.9 : 0.03),
        rate: from === to ? 1 : from === 'USD' ? 0.9 : 0.03,
        rateDate,
      })),
    };
    users = {
      findById: jest.fn().mockImplementation(async () => ({
        _id: ownerId,
        preferredCurrency: 'CAD',
        status: UserStatus.ACTIVE,
      })),
    };
    service = new ItinerariesService(
      itineraryModel,
      referenceData as ReferenceDataService,
      {} as UploadsService,
      exchangeRates as ExchangeRatesService,
      users as UsersService,
    );
  });

  it('converts budget, activity, and intercity costs by category, day, and city group', async () => {
    const result = await service.getBudgetSummary(
      itinerary._id.toString(),
      { currency: 'EUR' },
      { sub: ownerId.toString(), sid: 'session', email: 'owner@example.com', role: Role.USER },
    );

    expect(result.currency).toBe('EUR');
    expect(result.rateDate).toEqual(rateDate);
    expect(result.total).toBeCloseTo(16.4);
    expect(result.byCategory.find((item) => item.category === 'food')?.amount).toBe(9);
    expect(result.byCategory.find((item) => item.category === 'accommodation')?.amount).toBeCloseTo(0.9);
    expect(result.byCategory.find((item) => item.category === 'activities')?.amount).toBe(4.5);
    expect(result.byCategory.find((item) => item.category === 'intercity transport')?.amount).toBe(2);
    expect(result.byDay[0]).toEqual(
      expect.objectContaining({
        dayNumber: 1,
        date: new Date('2026-12-01T00:00:00.000Z'),
        total: 15.5,
      }),
    );
    expect(result.byGroup[0]).toEqual(
      expect.objectContaining({ fromDay: 1, toDay: 2, dayCount: 2 }),
    );
    expect(result.byGroup[0].budgetSubtotal).toBeCloseTo(16.4);
    expect(exchangeRates.convert).toHaveBeenCalledWith(10, 'USD', 'EUR');
    expect(exchangeRates.convert).toHaveBeenCalledWith(30, 'EGP', 'EUR');
    expect(exchangeRates.convert).toHaveBeenCalledWith(2, 'EUR', 'EUR');
    expect(exchangeRates.convert).toHaveBeenCalledWith(0, 'EUR', 'EUR');
  });

  it('uses a signed-in viewer preference when no currency override is supplied', async () => {
    users.findById.mockImplementation(async (id) => ({
      _id: new Types.ObjectId(id),
      preferredCurrency: id === ownerId.toString() ? 'CAD' : 'GBP',
      status: UserStatus.ACTIVE,
    }) as any);
    const viewerId = new Types.ObjectId().toString();
    const result = await service.getBudgetSummary(
      itinerary._id.toString(),
      {},
      { sub: viewerId, sid: 'session', email: 'viewer@example.com', role: Role.USER },
    );
    expect(result.currency).toBe('GBP');
  });

  it('allows public guest reads but hides private or deactivated-owner itineraries', async () => {
    await expect(
      service.getBudgetSummary(itinerary._id.toString(), {}, undefined),
    ).resolves.toMatchObject({ currency: 'CAD' });

    itinerary.isPublic = false;
    await expect(
      service.getBudgetSummary(itinerary._id.toString(), {}, undefined),
    ).rejects.toThrow(NotFoundException);

    itinerary.isPublic = true;
    users.findById.mockResolvedValue({
      _id: ownerId,
      preferredCurrency: 'CAD',
      status: UserStatus.DEACTIVATED,
    } as any);
    await expect(
      service.getBudgetSummary(itinerary._id.toString(), {}, undefined),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a target currency outside the seeded supported currency list', async () => {
    referenceData.isSupportedCurrency.mockResolvedValue(false);
    await expect(
      service.getBudgetSummary(
        itinerary._id.toString(),
        { currency: 'ZZZ' },
        { sub: ownerId.toString(), sid: 'session', email: 'owner@example.com', role: Role.USER },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(exchangeRates.convert).not.toHaveBeenCalled();
  });
});
