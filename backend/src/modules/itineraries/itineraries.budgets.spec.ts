import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateItineraryBudgetDto } from './dto/create-itinerary-budget.dto';
import { ItinerariesService } from './itineraries.service';

describe('ItinerariesService budgets and transport costs (ITN-14, ITN-16)', () => {
  const user = { sub: new Types.ObjectId().toString() } as JwtUser;
  const cityA = new Types.ObjectId();
  const cityB = new Types.ObjectId();
  let service: ItinerariesService;
  let model: any;
  let referenceData: jest.Mocked<Pick<ReferenceDataService, 'findCountry' | 'findCity' | 'isSupportedCurrency'>>;
  let itinerary: any;
  let firstDay: any;
  let secondDay: any;

  const makeDocument = () => {
    firstDay = {
      _id: new Types.ObjectId(), cityId: cityA, notes: '', activities: [], budgetEntries: [],
    };
    secondDay = {
      _id: new Types.ObjectId(), cityId: cityB, notes: '', activities: [], budgetEntries: [],
    };
    itinerary = {
      _id: new Types.ObjectId(),
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      days: [firstDay, secondDay],
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
  };

  beforeEach(() => {
    makeDocument();
    const query: any = {
      exec: jest.fn().mockResolvedValue(itinerary),
      populate: jest.fn(),
    };
    query.populate.mockReturnValue(query);
    model = { findOne: jest.fn().mockReturnValue(query) };
    referenceData = {
      findCountry: jest.fn(),
      findCity: jest.fn().mockImplementation(async (id: string) => ({
        _id: id === 'cairo' ? cityA : cityB,
      })),
      isSupportedCurrency: jest.fn().mockResolvedValue(true),
    };
    service = new ItinerariesService(
      model,
      referenceData as ReferenceDataService,
      { saveImage: jest.fn(), deleteImage: jest.fn() } as unknown as UploadsService,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('adds, edits, and deletes budget entries and recomputes the city subtotal', async () => {
    await service.addBudgetEntry(
      itinerary._id.toString(),
      firstDay._id.toString(),
      { category: 'food', amount: 20, currency: 'egp', note: 'Lunch' },
      user,
    );
    const entry = firstDay.budgetEntries[0];
    expect(referenceData.isSupportedCurrency).toHaveBeenCalledWith('egp');
    expect(entry).toEqual(expect.objectContaining({ amount: 20, currency: 'EGP' }));

    const subtotal = await service.findOwned(itinerary._id.toString(), user);
    expect(subtotal.cityGroups[0].budgetSubtotal).toEqual([{ currency: 'EGP', amount: 20 }]);

    await service.updateBudgetEntry(entry._id.toString(), { amount: 35, currency: 'USD' }, user);
    expect(entry.amount).toBe(35);
    expect(entry.currency).toBe('USD');
    const updated = await service.findOwned(itinerary._id.toString(), user);
    expect(updated.cityGroups[0].budgetSubtotal).toEqual([{ currency: 'USD', amount: 35 }]);

    await service.deleteBudgetEntry(entry._id.toString(), user);
    expect(firstDay.budgetEntries).toHaveLength(0);
    const afterDelete = await service.findOwned(itinerary._id.toString(), user);
    expect(afterDelete.cityGroups[0].budgetSubtotal).toEqual([]);
  });

  it('adds, edits, and deletes transport costs linked to a day and includes them in city totals', async () => {
    await service.addTransportCost(
      itinerary._id.toString(),
      {
        mode: 'Train',
        fromCityId: 'cairo',
        toCityId: 'alexandria',
        amount: 120,
        currency: 'EGP',
        dayId: firstDay._id.toString(),
      },
      user,
    );
    const cost = itinerary.transportCosts[0];
    expect(cost.fromCityId).toEqual(cityA);
    expect(cost.toCityId).toEqual(cityB);
    expect(cost.dayId).toEqual(firstDay._id);
    let view = await service.findOwned(itinerary._id.toString(), user);
    expect(view.cityGroups[0].budgetSubtotal).toEqual([{ currency: 'EGP', amount: 120 }]);

    await service.updateTransportCost(cost._id.toString(), { amount: 150 }, user);
    view = await service.findOwned(itinerary._id.toString(), user);
    expect(view.cityGroups[0].budgetSubtotal).toEqual([{ currency: 'EGP', amount: 150 }]);

    await service.deleteTransportCost(cost._id.toString(), user);
    expect(itinerary.transportCosts).toHaveLength(0);
    view = await service.findOwned(itinerary._id.toString(), user);
    expect(view.cityGroups[0].budgetSubtotal).toEqual([]);
  });

  it('rejects unsupported currencies and transport costs for a day outside the itinerary', async () => {
    referenceData.isSupportedCurrency.mockResolvedValue(false);
    await expect(
      service.addBudgetEntry(
        itinerary._id.toString(),
        firstDay._id.toString(),
        { category: 'food', amount: 1, currency: 'ZZZ' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);

    referenceData.isSupportedCurrency.mockResolvedValue(true);
    await expect(
      service.addTransportCost(
        itinerary._id.toString(),
        {
          mode: 'Bus', fromCityId: 'cairo', toCityId: 'alexandria', amount: 1,
          currency: 'EGP', dayId: new Types.ObjectId().toString(),
        },
        user,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a negative budget amount during DTO validation', async () => {
    const dto = Object.assign(new CreateItineraryBudgetDto(), {
      category: 'food', amount: -1, currency: 'EGP',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'amount')).toBe(true);
  });
});
