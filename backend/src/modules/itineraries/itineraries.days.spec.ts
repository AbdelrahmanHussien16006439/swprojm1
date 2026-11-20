import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { ItinerariesService } from './itineraries.service';

describe('ItinerariesService days (ITN-05, ITN-07, ITN-08, ITN-09)', () => {
  const user = { sub: new Types.ObjectId().toString() } as JwtUser;
  const cityA = new Types.ObjectId();
  const cityB = new Types.ObjectId();
  const makeDay = (cityId: Types.ObjectId) => ({
    _id: new Types.ObjectId(),
    cityId,
    notes: '',
    activities: [],
    budgetEntries: [],
  });
  let service: ItinerariesService;
  let model: any;
  let referenceData: jest.Mocked<Pick<ReferenceDataService, 'findCountry' | 'findCity'>>;
  let itinerary: any;

  const makeItinerary = (days = [makeDay(cityA), makeDay(cityB)]) => {
    itinerary = {
      _id: new Types.ObjectId(),
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      days,
      transportCosts: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject() {
        return {
          _id: this._id,
          startDate: this.startDate,
          days: this.days,
          transportCosts: this.transportCosts,
        };
      },
    };
    return itinerary;
  };

  beforeEach(() => {
    makeItinerary();
    model = {
      findOne: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(itinerary),
        populate: jest.fn().mockReturnThis(),
      })),
    };
    referenceData = {
      findCountry: jest.fn(),
      findCity: jest.fn().mockImplementation(async (id: string) => ({
        _id: id === 'cairo' ? cityA : cityB,
      })),
    };
    service = new ItinerariesService(model, referenceData as ReferenceDataService);
  });

  it('adds at the requested position and derives sequential day numbers, dates, and groups', async () => {
    itinerary.days[0].budgetEntries = [{ amount: 15, currency: 'USD' }];
    itinerary.days[0].activities = [{ cost: 5, currency: 'USD' }];
    itinerary.transportCosts = [
      { dayId: itinerary.days[0]._id, amount: 2, currency: 'USD' },
    ];
    const result = await service.addDay(
      new Types.ObjectId().toString(),
      { cityId: 'cairo', notes: 'Museum', position: 2 },
      user,
    );

    expect(itinerary.save).toHaveBeenCalled();
    expect(result.days.map((day: any) => day.dayNumber)).toEqual([1, 2, 3]);
    expect(result.days.map((day: any) => day.date.toISOString())).toEqual([
      '2026-12-01T00:00:00.000Z',
      '2026-12-02T00:00:00.000Z',
      '2026-12-03T00:00:00.000Z',
    ]);
    expect(result.cityGroups.map((group: any) => group.dayCount)).toEqual([2, 1]);
    expect(result.cityGroups[0].budgetSubtotal).toEqual([{ currency: 'USD', amount: 22 }]);
  });

  it('moves a day, then recalculates dates and consecutive city groups', async () => {
    const [first, second] = itinerary.days;
    const result = await service.reorderDay(
      new Types.ObjectId().toString(),
      { dayId: second._id.toString(), newPosition: 1 },
      user,
    );

    expect(itinerary.days[0]._id).toEqual(second._id);
    expect(result.days[0].date.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(result.days[1].date.toISOString()).toBe('2026-12-02T00:00:00.000Z');
    expect(result.cityGroups.map((group: any) => group.dayCount)).toEqual([1, 1]);
    expect(itinerary.days[1]._id).toEqual(first._id);
  });

  it('edits a day city and notes without storing a day number or date', async () => {
    const dayId = itinerary.days[0]._id.toString();
    const result = await service.updateDay(
      new Types.ObjectId().toString(),
      dayId,
      { cityId: 'alexandria', notes: 'Harbor walk' },
      user,
    );

    expect(referenceData.findCity).toHaveBeenCalledWith('alexandria');
    expect(itinerary.days[0].cityId).toEqual(cityB);
    expect(itinerary.days[0].notes).toBe('Harbor walk');
    expect(result.days[0].dayNumber).toBe(1);
    expect(result.days[0].date).toEqual(new Date('2026-12-01T00:00:00.000Z'));
    expect(itinerary.days[0]).not.toHaveProperty('dayNumber');
    expect(itinerary.days[0]).not.toHaveProperty('date');
  });

  it('deletes a day and its attached transport costs, shifting remaining dates', async () => {
    const [removed, retained] = itinerary.days;
    itinerary.transportCosts = [
      { dayId: removed._id, amount: 5, currency: 'USD' },
      { dayId: retained._id, amount: 7, currency: 'USD' },
    ];
    const result = await service.deleteDay(
      new Types.ObjectId().toString(),
      removed._id.toString(),
      { confirm: true },
      user,
    );

    expect(itinerary.days).toHaveLength(1);
    expect(itinerary.days[0]._id).toEqual(retained._id);
    expect(itinerary.transportCosts.map((cost: any) => cost.dayId)).toEqual([retained._id]);
    expect(result.days[0].dayNumber).toBe(1);
    expect(result.days[0].date.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('rejects a 61st day', async () => {
    makeItinerary(Array.from({ length: 60 }, () => makeDay(cityA)));
    await expect(
      service.addDay(new Types.ObjectId().toString(), { cityId: 'cairo' }, user),
    ).rejects.toThrow(BadRequestException);
  });
});
