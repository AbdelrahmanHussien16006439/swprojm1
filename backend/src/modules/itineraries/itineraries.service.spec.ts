import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { ItinerariesService } from './itineraries.service';

describe('ItinerariesService basics (ITN-01, ITN-03)', () => {
  const user = { sub: new Types.ObjectId().toString() } as JwtUser;
  const countryId = new Types.ObjectId();
  let service: ItinerariesService;
  let model: any;
  let referenceData: jest.Mocked<Pick<ReferenceDataService, 'findCountry'>>;

  beforeEach(() => {
    model = {
      create: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
    };
    referenceData = {
      findCountry: jest.fn().mockResolvedValue({ _id: countryId }),
    };
    service = new ItinerariesService(
      model,
      referenceData as ReferenceDataService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('validates seeded countries, stores UTC calendar date, and creates a private itinerary', async () => {
    model.create.mockImplementation((value) => value);
    const result = await service.create(
      { title: '  Cairo trip  ', countryIds: ['EG'], startDate: '2026-12-01' },
      user,
    );

    expect(referenceData.findCountry).toHaveBeenCalledWith('EG');
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: expect.any(Types.ObjectId),
        title: 'Cairo trip',
        countryIds: [countryId],
        startDate: new Date('2026-12-01T00:00:00.000Z'),
        isPublic: false,
      }),
    );
    expect(result.isPublic).toBe(false);
  });

  it('does not expose an itinerary owned by another user', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    const populate = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ exec }) });
    model.findOne.mockReturnValue({ populate });

    await expect(service.findOwned(new Types.ObjectId().toString(), user)).rejects.toThrow(
      NotFoundException,
    );
    expect(model.findOne).toHaveBeenCalledWith({
      _id: expect.any(String),
      ownerId: expect.any(Types.ObjectId),
    });
  });

  it('requires confirmation at the DTO/controller boundary before deleting', async () => {
    model.deleteOne.mockResolvedValue({ deletedCount: 1 });
    await service.delete(new Types.ObjectId().toString(), { confirm: true }, user);
    expect(model.deleteOne).toHaveBeenCalledWith({
      _id: expect.any(String),
      ownerId: expect.any(Types.ObjectId),
    });
  });
});
