import { BadRequestException } from '@nestjs/common';
import { UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService (Member 1 integration)', () => {
  const userId = '665f1c2a6d3b4c5e7f8a9012';
  let userModel: Record<string, jest.Mock>;
  let referenceDataService: Record<string, jest.Mock>;
  let service: UsersService;

  beforeEach(() => {
    userModel = { findByIdAndUpdate: jest.fn() };
    referenceDataService = { isSupportedCurrency: jest.fn() };
    service = new UsersService(
      userModel as never,
      { revokeAllForUser: jest.fn() } as never,
      referenceDataService as never,
    );
  });

  it('rejects an unsupported preferred currency (ACC-09)', async () => {
    referenceDataService.isSupportedCurrency.mockResolvedValue(false);
    await expect(
      service.updateProfile(userId, { preferredCurrency: 'XYZ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('accepts a supported preferred currency (ACC-09)', async () => {
    referenceDataService.isSupportedCurrency.mockResolvedValue(true);
    userModel.findByIdAndUpdate.mockResolvedValue(null);
    await expect(
      service.updateProfile(userId, { preferredCurrency: 'EGP' }),
    ).rejects.toThrow('User not found');
    expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('stores providerId as an ObjectId', () => {
    expect(UserSchema.path('providerId').instance).toBe('ObjectId');
  });
});
