import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { UploadsService } from '../uploads/uploads.service';
import { ItinerariesService } from './itineraries.service';

describe('ItinerariesService activities (ITN-10, ITN-12)', () => {
  const user = { sub: new Types.ObjectId().toString() } as JwtUser;
  const dayId = new Types.ObjectId();
  let service: ItinerariesService;
  let model: any;
  let referenceData: jest.Mocked<Pick<ReferenceDataService, 'findCountry' | 'findCity' | 'isSupportedCurrency'>>;
  let uploads: jest.Mocked<Pick<UploadsService, 'saveImage' | 'deleteImage'>>;
  let itinerary: any;
  let day: any;

  const makeDocument = () => {
    day = {
      _id: dayId,
      cityId: new Types.ObjectId(),
      notes: '',
      activities: [],
      budgetEntries: [],
    };
    itinerary = {
      _id: new Types.ObjectId(),
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      days: [day],
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
      findCity: jest.fn(),
      isSupportedCurrency: jest.fn().mockResolvedValue(true),
    };
    uploads = {
      saveImage: jest.fn().mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        url: '/uploads/550e8400-e29b-41d4-a716-446655440000.jpg',
      }),
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };
    service = new ItinerariesService(
      model,
      referenceData as ReferenceDataService,
      uploads as UploadsService,
    );
  });

  it('adds an activity and validates its optional cost currency', async () => {
    const result = await service.addActivity(
      itinerary._id.toString(),
      dayId.toString(),
      {
        name: '  Museum  ',
        description: '  See the collection  ',
        time: '09:30',
        cost: 12,
        currency: 'egp',
      },
      user,
    );

    expect(referenceData.isSupportedCurrency).toHaveBeenCalledWith('egp');
    expect(day.activities[0]).toEqual(
      expect.objectContaining({
        name: 'Museum',
        description: 'See the collection',
        time: '09:30',
        cost: 12,
        currency: 'EGP',
        images: [],
      }),
    );
    expect(result.days[0].activities).toHaveLength(1);
  });

  it('rejects an activity cost in an unsupported currency', async () => {
    referenceData.isSupportedCurrency.mockResolvedValue(false);
    await expect(
      service.addActivity(
        itinerary._id.toString(),
        dayId.toString(),
        { name: 'Museum', description: 'Collection', cost: 12, currency: 'XXX' },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(day.activities).toHaveLength(0);
  });

  it('updates and deletes activities only through the owner itinerary', async () => {
    const activity = {
      _id: new Types.ObjectId(),
      name: 'Museum',
      description: 'Collection',
      images: [],
    };
    day.activities.push(activity);
    const updated = await service.updateActivity(
      activity._id.toString(),
      { name: 'Museum visit' },
      user,
    );
    expect(activity.name).toBe('Museum visit');
    expect(updated.days[0].activities[0].name).toBe('Museum visit');

    await service.deleteActivity(activity._id.toString(), user);
    expect(day.activities).toHaveLength(0);
    expect(model.findOne).toHaveBeenCalledWith({
      'days.activities._id': activity._id.toString(),
      ownerId: expect.any(Types.ObjectId),
    });
  });

  it('attaches uploaded images, enforces five per activity, and removes images through UploadsService', async () => {
    const activity = { _id: new Types.ObjectId(), name: 'Museum', images: [] as any[] };
    day.activities.push(activity);
    const file = { buffer: Buffer.from('image'), size: 5, mimetype: 'image/jpeg' } as Express.Multer.File;
    await service.addActivityImage(activity._id.toString(), file, user);
    expect(uploads.saveImage).toHaveBeenCalledWith(file);
    expect(activity.images).toHaveLength(1);

    const attachedId = activity.images[0].id;
    await service.deleteActivityImage(activity._id.toString(), attachedId, user);
    expect(uploads.deleteImage).toHaveBeenCalledWith(attachedId);
    expect(activity.images).toHaveLength(0);

    activity.images = Array.from({ length: 5 }, (_, index) => ({ id: `image-${index}`, url: '/uploads/image.png' }));
    await expect(
      service.addActivityImage(activity._id.toString(), file, user),
    ).rejects.toThrow(BadRequestException);
    expect(uploads.saveImage).toHaveBeenCalledTimes(1);
  });

  it('rolls back the uploaded file if saving its activity reference fails', async () => {
    const activity = { _id: new Types.ObjectId(), name: 'Museum', images: [] as any[] };
    day.activities.push(activity);
    itinerary.save.mockRejectedValueOnce(new Error('database write failed'));
    await expect(
      service.addActivityImage(
        activity._id.toString(),
        { buffer: Buffer.from('image'), size: 5, mimetype: 'image/jpeg' } as Express.Multer.File,
        user,
      ),
    ).rejects.toThrow('database write failed');
    expect(uploads.deleteImage).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });
});
