import { BadRequestException } from '@nestjs/common';
import { UserStatus } from '../../common/enums/user-status.enum';
import { FlightBookingsService } from '../flight-bookings/flight-bookings.service';
import { AccountDeactivationService } from './account-deactivation.service';

describe('AccountDeactivationService (ACC-12)', () => {
  const userId = '665f1c2a6d3b4c5e7f8a9012';
  let usersService: Record<string, jest.Mock>;
  let sessionsService: Record<string, jest.Mock>;
  let flightBookings: Record<string, jest.Mock>;
  let hotelBookings: Record<string, jest.Mock>;
  let service: AccountDeactivationService;

  beforeEach(() => {
    usersService = { setStatus: jest.fn() };
    sessionsService = { revokeAllForUser: jest.fn() };
    flightBookings = { hasUpcomingConfirmed: jest.fn().mockResolvedValue(false) };
    hotelBookings = { hasUpcomingConfirmed: jest.fn().mockResolvedValue(false) };
    const moduleRef = {
      get: jest.fn((token: unknown) =>
        token === FlightBookingsService ? flightBookings : hotelBookings,
      ),
    };
    service = new AccountDeactivationService(
      usersService as never,
      sessionsService as never,
      moduleRef as never,
    );
  });

  it('blocks deactivation with an upcoming confirmed flight', async () => {
    flightBookings.hasUpcomingConfirmed.mockResolvedValue(true);
    await expect(service.deactivateOwnAccount(userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(usersService.setStatus).not.toHaveBeenCalled();
  });

  it('blocks deactivation with an upcoming confirmed hotel stay', async () => {
    hotelBookings.hasUpcomingConfirmed.mockResolvedValue(true);
    await expect(service.deactivateOwnAccount(userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deactivates and revokes sessions when nothing is booked', async () => {
    await service.deactivateOwnAccount(userId);
    expect(usersService.setStatus).toHaveBeenCalledWith(userId, UserStatus.DEACTIVATED);
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith(userId);
  });
});
