import { NotFoundException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { AdminAccountsService } from './admin-accounts.service';

describe('AdminAccountsService (Member 1 integration)', () => {
  const admin = { sub: 'admin-id', role: Role.ADMIN } as never;
  const userId = '665f1c2a6d3b4c5e7f8a9012';
  let usersService: Record<string, jest.Mock>;
  let sessionsService: Record<string, jest.Mock>;
  let auditLogsService: Record<string, jest.Mock>;
  let airlinesService: Record<string, jest.Mock>;
  let hotelsService: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;
  let service: AdminAccountsService;

  const account = (status: UserStatus) => ({
    _id: userId,
    role: Role.USER,
    status,
  });

  beforeEach(() => {
    usersService = {
      getByIdOrFail: jest.fn(),
      setStatus: jest.fn(),
      create: jest.fn().mockResolvedValue({ _id: userId }),
      toAccountSummary: jest.fn().mockReturnValue({ id: userId }),
    };
    sessionsService = { revokeAllForUser: jest.fn() };
    auditLogsService = { log: jest.fn() };
    airlinesService = { findById: jest.fn() };
    hotelsService = { findById: jest.fn() };
    notificationsService = { notify: jest.fn() };
    service = new AdminAccountsService(
      usersService as never,
      sessionsService as never,
      auditLogsService as never,
      airlinesService as never,
      hotelsService as never,
      notificationsService as never,
    );
  });

  it('notifies the user when the account is suspended (ACC-15)', async () => {
    usersService.getByIdOrFail.mockResolvedValue(account(UserStatus.ACTIVE));
    await service.suspend(admin, userId, { reason: 'spam' } as never);
    expect(notificationsService.notify).toHaveBeenCalledWith(
      userId,
      'ACCOUNT_SUSPENDED',
      expect.any(String),
    );
  });

  it('notifies the user when the account is reactivated (ACC-16)', async () => {
    usersService.getByIdOrFail.mockResolvedValue(account(UserStatus.SUSPENDED));
    await service.reactivate(admin, userId);
    expect(notificationsService.notify).toHaveBeenCalledWith(
      userId,
      'ACCOUNT_REACTIVATED',
      expect.any(String),
    );
  });

  it('still suspends when the notification fails', async () => {
    usersService.getByIdOrFail.mockResolvedValue(account(UserStatus.ACTIVE));
    notificationsService.notify.mockRejectedValue(new Error('down'));
    await expect(
      service.suspend(admin, userId, { reason: 'spam' } as never),
    ).resolves.toEqual({ id: userId });
    expect(usersService.setStatus).toHaveBeenCalledWith(userId, UserStatus.SUSPENDED);
  });

  it('checks airline moderators against AirlinesService (ACC-13)', async () => {
    await service.createModerator(admin, {
      role: Role.AIRLINE_MODERATOR,
      providerId: userId,
    } as never);
    expect(airlinesService.findById).toHaveBeenCalledWith(userId);
    expect(hotelsService.findById).not.toHaveBeenCalled();
  });

  it('rejects a moderator for a hotel that does not exist (ACC-13)', async () => {
    hotelsService.findById.mockRejectedValue(new NotFoundException('Hotel not found'));
    await expect(
      service.createModerator(admin, {
        role: Role.HOTEL_MODERATOR,
        providerId: userId,
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(usersService.create).not.toHaveBeenCalled();
  });
});
