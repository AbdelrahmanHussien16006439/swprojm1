import { BadRequestException, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { UserStatus } from '../../common/enums/user-status.enum';
import { FlightBookingsService } from '../flight-bookings/flight-bookings.service';
import { HotelBookingsService } from '../hotel-bookings/hotel-bookings.service';
import { SessionsService } from './sessions.service';
import { UsersService } from './users.service';

/**
 * ACC-12: a user deletes (deactivates) their own account.
 * Kept out of UsersService on purpose: the booking services import UsersService, so
 * importing them there would create a file cycle. Their modules also import UsersModule,
 * so the services are looked up at call time through ModuleRef instead of injected.
 */
@Injectable()
export class AccountDeactivationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async deactivateOwnAccount(userId: string): Promise<void> {
    if (await this.hasUpcomingConfirmedBookings(userId)) {
      throw new BadRequestException(
        'You cannot deactivate your account while you have upcoming confirmed bookings',
      );
    }
    await this.usersService.setStatus(userId, UserStatus.DEACTIVATED);
    await this.sessionsService.revokeAllForUser(userId);
  }

  /** Any confirmed flight (Member 4) or hotel (Member 6) booking blocks deactivation. */
  private async hasUpcomingConfirmedBookings(userId: string): Promise<boolean> {
    const flightBookings = this.moduleRef.get(FlightBookingsService, { strict: false });
    const hotelBookings = this.moduleRef.get(HotelBookingsService, { strict: false });
    const [flights, hotels] = await Promise.all([
      flightBookings.hasUpcomingConfirmed(userId),
      hotelBookings.hasUpcomingConfirmed(userId),
    ]);
    return flights || hotels;
  }
}
