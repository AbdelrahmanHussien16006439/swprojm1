import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { ProviderType } from '../../common/enums/provider-type.enum';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { AuditAction, AuditTargetType } from '../audit-logs/audit-actions';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ListAccountsQueryDto } from '../users/dto/list-accounts-query.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { SessionsService } from '../users/sessions.service';
import { UsersService } from '../users/users.service';
import { CreateModeratorDto } from './dto/create-moderator.dto';
import { AdminResetPasswordDto } from './dto/reset-password.dto';
import { SuspendAccountDto } from './dto/suspend-account.dto';

@Injectable()
export class AdminAccountsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly auditLogsService: AuditLogsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /** ACC-13: moderator linked to exactly one existing airline or hotel. */
  async createModerator(admin: JwtUser, dto: CreateModeratorDto) {
    const providerType =
      dto.role === Role.AIRLINE_MODERATOR
        ? ProviderType.AIRLINE
        : ProviderType.HOTEL;
    await this.assertProviderExists(providerType, dto.providerId);

    const moderator = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.temporaryPassword,
      role: dto.role,
      providerType,
      providerId: dto.providerId,
      mustChangePassword: true,
    });

    await this.auditLogsService.log(
      admin.sub,
      AuditAction.MODERATOR_CREATED,
      AuditTargetType.USER,
      moderator._id.toString(),
      { role: dto.role, providerType, providerId: dto.providerId },
    );
    return this.usersService.toAccountSummary(moderator);
  }

  /** ACC-14 */
  listAccounts(query: ListAccountsQueryDto) {
    return this.usersService.listAccounts(query);
  }

  /** ACC-15, ACC-16: can't log in, sessions revoked; bookings and content stay. */
  async suspend(admin: JwtUser, userId: string, dto: SuspendAccountDto) {
    const target = await this.getManageableAccount(userId);
    if (target.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('Account is already suspended');
    }

    await this.usersService.setStatus(userId, UserStatus.SUSPENDED);
    await this.sessionsService.revokeAllForUser(userId);
    await this.auditLogsService.log(
      admin.sub,
      AuditAction.ACCOUNT_SUSPENDED,
      AuditTargetType.USER,
      userId,
      { reason: dto.reason, role: target.role },
    );
    // ⏳ ACC-15 / GEN-01: in-app notification once Member 6's NotificationsService is merged:
    // await this.notificationsService.notify(userId, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');

    return this.usersService.toAccountSummary(
      await this.usersService.getByIdOrFail(userId),
    );
  }

  /** ACC-15, ACC-16 */
  async reactivate(admin: JwtUser, userId: string) {
    const target = await this.getManageableAccount(userId);
    if (target.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException(
        'Only suspended accounts can be reactivated',
      );
    }

    await this.usersService.setStatus(userId, UserStatus.ACTIVE);
    await this.auditLogsService.log(
      admin.sub,
      AuditAction.ACCOUNT_REACTIVATED,
      AuditTargetType.USER,
      userId,
      { role: target.role },
    );

    return this.usersService.toAccountSummary(
      await this.usersService.getByIdOrFail(userId),
    );
  }

  /** ACC-07a: temporary password + must change it at next login. */
  async resetPassword(
    admin: JwtUser,
    userId: string,
    dto: AdminResetPasswordDto,
  ) {
    const target = await this.getManageableAccount(userId);

    await this.usersService.setPassword(userId, dto.temporaryPassword, true);
    await this.sessionsService.revokeAllForUser(userId);
    // Never log the password itself
    await this.auditLogsService.log(
      admin.sub,
      AuditAction.PASSWORD_RESET,
      AuditTargetType.USER,
      userId,
      { role: target.role },
    );
    return {
      message:
        'Temporary password set. The user must choose a new password at next login.',
    };
  }

  /** Admin actions apply only to users and moderators that still exist. */
  private async getManageableAccount(userId: string): Promise<UserDocument> {
    const target = await this.usersService.getByIdOrFail(userId);
    if (target.role === Role.ADMIN) {
      throw new ForbiddenException(
        'This action is not allowed on administrator accounts',
      );
    }
    if (target.status === UserStatus.DEACTIVATED) {
      throw new BadRequestException('This account has been deactivated');
    }
    return target;
  }

  /**
   * ⏳ ACC-13 should use AirlinesService.findById (M3) / HotelsService.findById (M5).
   * Until those modules are merged this checks their collections directly.
   * TODO: replace with the service calls once they are merged into develop.
   */
  private async assertProviderExists(type: ProviderType, providerId: string) {
    const collection = type === ProviderType.AIRLINE ? 'airlines' : 'hotels';
    const provider = await this.connection
      .collection(collection)
      .findOne({ _id: new Types.ObjectId(providerId) });
    if (!provider) {
      throw new NotFoundException(
        `${type === ProviderType.AIRLINE ? 'Airline' : 'Hotel'} not found`,
      );
    }
  }
}
