import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AirlinesService } from './airlines.service';
import { Airline } from './schemas/airline.schema';

const id = new Types.ObjectId();
const airline = { _id: id, name: 'Cairo Air', code: 'CA' } as Airline;
const exec = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

function setup(overrides: Record<string, jest.Mock> = {}) {
  const model = {
    create: jest.fn().mockResolvedValue(airline),
    findById: jest.fn().mockReturnValue(exec(airline)),
    findByIdAndUpdate: jest.fn().mockReturnValue(exec(airline)),
    findOneAndUpdate: jest.fn().mockReturnValue(exec(airline)),
    ...overrides,
  } as unknown as Model<Airline>;
  return { service: new AirlinesService(model), model };
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
});
