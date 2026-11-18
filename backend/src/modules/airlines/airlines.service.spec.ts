import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AirlinesService } from './airlines.service';
import { Airline } from './schemas/airline.schema';
import { UploadsService } from '../uploads/uploads.service';

const id = new Types.ObjectId();
const airline = { _id: id, name: 'Cairo Air', code: 'CA' } as Airline;
const exec = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

function setup(
  overrides: Record<string, jest.Mock> = {},
  uploadOverrides: Record<string, jest.Mock> = {},
) {
  const model = {
    create: jest.fn().mockResolvedValue(airline),
    findById: jest.fn().mockReturnValue(exec(airline)),
    findByIdAndUpdate: jest.fn().mockReturnValue(exec(airline)),
    findOneAndUpdate: jest.fn().mockReturnValue(exec(airline)),
    ...overrides,
  } as unknown as Model<Airline>;
  const uploadsService = {
    saveImage: jest.fn().mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      url: '/uploads/550e8400-e29b-41d4-a716-446655440000.png',
    }),
    deleteImage: jest.fn().mockResolvedValue(undefined),
    ...uploadOverrides,
  } as unknown as UploadsService;
  return {
    service: new AirlinesService(model, uploadsService),
    model,
    uploadsService,
  };
}

const moderator = {
  sub: new Types.ObjectId().toString(),
  sid: 'session',
  email: 'mod@example.com',
  role: Role.AIRLINE_MODERATOR,
  providerId: id.toString(),
} as JwtUser;

describe('AirlinesService', () => {
  it('normalizes the airline code on create', async () => {
    const { service, model } = setup();
    await service.create({ name: ' Cairo Air ', code: 'ca' });
    expect(model.create).toHaveBeenCalledWith({ name: 'Cairo Air', code: 'CA' });
  });

  it('maps duplicate codes to a conflict', async () => {
    const { service } = setup({ create: jest.fn().mockRejectedValue({ code: 11000 }) });
    await expect(service.create({ name: 'Other', code: 'CA' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('hides updates for a moderator who does not own the airline', async () => {
    const { service, model } = setup();
    await expect(
      service.update(new Types.ObjectId().toString(), { name: 'Other' }, moderator),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns a not-found error for a missing airline', async () => {
    const { service } = setup({ findById: jest.fn().mockReturnValue(exec(null)) });
    await expect(service.findById(id.toString())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates the baggage policy for the owning moderator', async () => {
    const { service, model } = setup();
    const policy = { extraBagPrice: 25, maxExtraBagsPerPassenger: 2 };

    await expect(service.updateBaggagePolicy(id.toString(), policy, moderator)).resolves.toBe(
      airline,
    );
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id.toString() },
      { $set: { baggagePolicy: policy } },
      { new: true, runValidators: true },
    );
  });

  it('does not update baggage policy for another airline', async () => {
    const { service, model } = setup();

    await expect(
      service.updateBaggagePolicy(new Types.ObjectId().toString(), {
        extraBagPrice: 25,
        maxExtraBagsPerPassenger: 2,
      }, moderator),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('replaces the old managed logo and deletes the old file', async () => {
    const oldId = '550e8400-e29b-41d4-a716-446655440001';
    const { service, model, uploadsService } = setup({
      findById: jest.fn().mockReturnValue(
        exec({ ...airline, logoUrl: `/uploads/${oldId}.jpg` }),
      ),
      findOneAndUpdate: jest.fn().mockReturnValue(
        exec({
          ...airline,
          logoUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.png',
        }),
      ),
    });

    await service.uploadLogo(id.toString(), moderator, {
      buffer: Buffer.from('png'),
      size: 3,
      mimetype: 'image/png',
    } as Express.Multer.File);

    expect(uploadsService.deleteImage).toHaveBeenCalledWith(oldId);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id.toString() },
      { $set: { logoUrl: '/uploads/550e8400-e29b-41d4-a716-446655440000.png' } },
      { new: true, runValidators: true },
    );
  });

  it('deletes a newly uploaded logo if the database update fails', async () => {
    const databaseError = new Error('database update failed');
    const { service, uploadsService } = setup({
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(databaseError),
      }),
    });

    await expect(
      service.uploadLogo(id.toString(), moderator, {} as Express.Multer.File),
    ).rejects.toBe(databaseError);
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });
});
