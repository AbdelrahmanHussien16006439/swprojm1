import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { HotelsService } from '../hotels/hotels.service';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { UsersService } from '../users/users.service';
import { ItinerariesService } from './itineraries.service';

describe('ItinerariesService city-group hotel search (ITN-25)', () => {
  const user = {
    sub: new Types.ObjectId().toString(),
    sid: 'session',
    email: 'traveler@example.com',
    role: Role.USER,
  } as JwtUser;
  const cairoId = new Types.ObjectId();
  const alexandriaId = new Types.ObjectId();
  const firstDayId = new Types.ObjectId();
  const secondDayId = new Types.ObjectId();
  const thirdDayId = new Types.ObjectId();
  let service: ItinerariesService;
  let itineraryModel: any;
  let hotelsService: jest.Mocked<Pick<HotelsService, 'search'>>;
  let itinerary: any;

  beforeEach(() => {
    itinerary = {
      _id: new Types.ObjectId(),
      ownerId: new Types.ObjectId(user.sub),
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      days: [
        { _id: firstDayId, cityId: { _id: cairoId, cityId: 'cairo' }, activities: [], budgetEntries: [] },
        { _id: secondDayId, cityId: { _id: cairoId, cityId: 'cairo' }, activities: [], budgetEntries: [] },
        { _id: thirdDayId, cityId: { _id: alexandriaId, cityId: 'alexandria' }, activities: [], budgetEntries: [] },
      ],
      transportCosts: [],
      toObject() {
        return {
          _id: this._id,
          ownerId: this.ownerId,
          startDate: this.startDate,
          days: this.days,
          transportCosts: this.transportCosts,
        };
      },
    };
    const query: any = {
      populate: jest.fn(),
      exec: jest.fn().mockResolvedValue(itinerary),
    };
    query.populate.mockReturnValue(query);
    itineraryModel = { findOne: jest.fn().mockReturnValue(query) };
    hotelsService = { search: jest.fn().mockResolvedValue({ data: [], total: 0 }) };
    service = new ItinerariesService(
      itineraryModel,
      {} as ReferenceDataService,
      {} as UploadsService,
      {} as ExchangeRatesService,
      {} as UsersService,
      hotelsService as HotelsService,
      {} as any,
    );
  });

  it('uses the city-group city, first-day check-in, day-after-last check-out, and guest/room query', async () => {
    const result = await service.searchHotelsForCityGroup(
      itinerary._id.toString(),
      { groupIndex: 0, guests: 3, rooms: 2, page: 2 },
      user,
    );

    expect(result).toEqual({ data: [], total: 0 });
    expect(hotelsService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        cityId: 'cairo',
        checkIn: '2026-12-01',
        checkOut: '2026-12-03',
        guests: 3,
        rooms: 2,
        page: 2,
        sortBy: 'price',
        order: 'asc',
      }),
    );
  });

  it('rejects an unknown city group without calling hotel search', async () => {
    await expect(
      service.searchHotelsForCityGroup(
        itinerary._id.toString(),
        { groupIndex: 5, guests: 2 },
        user,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(hotelsService.search).not.toHaveBeenCalled();
  });
});
