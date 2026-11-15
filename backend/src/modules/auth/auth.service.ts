import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { SessionsService } from '../users/sessions.service';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import {
  INVALID_CREDENTIALS_MESSAGE,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from './auth.constants';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
  ) {}

  /** ACC-01 */
  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      termsAcceptedAt: new Date(),
    });
    return this.usersService.toProfile(user);
  }

  /** ACC-04, ACC-05 */
  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    // Deactivated accounts are treated as if they don't exist
    if (!user || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw this.lockedException(user.lockUntil);
    }

    const passwordOk = await this.usersService.verifyPassword(
      user,
      dto.password,
    );
    if (!passwordOk) {
      const attempts = await this.usersService.incrementFailedLogins(
        user._id.toString(),
      );
      if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.usersService.lock(user._id.toString(), lockUntil);
        throw this.lockedException(lockUntil);
      }
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Your account is suspended');
    }

    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      await this.usersService.resetLoginAttempts(user._id.toString());
    }

    const tokens = await this.startSession(user, userAgent);
    return { user: this.usersService.toAuthUser(user), tokens };
  }

  /** ACC-06, ACC-19: rotate the refresh token and issue a new access token. */
  async refresh(refreshToken: string | undefined): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }
    const session =
      await this.sessionsService.findValidByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedException(
        'Your session has expired, please log in again',
      );
    }

    const user = await this.usersService.findById(session.userId.toString());
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessionsService.revoke(session._id.toString());
      throw new UnauthorizedException(
        'Your session has expired, please log in again',
      );
    }

    // Refreshing is not user activity, so lastActivityAt is NOT updated here (ACC-06)
    const newRefreshToken = await this.sessionsService.rotate(
      session._id.toString(),
    );
    return {
      accessToken: await this.signAccessToken(user, session._id.toString()),
      refreshToken: newRefreshToken,
    };
  }

  /** ACC-06: revoke the server-side session (works even if the access token expired). */
  async logout(refreshToken?: string, accessToken?: string): Promise<void> {
    if (refreshToken) {
      await this.sessionsService.revokeByRefreshToken(refreshToken);
    }
    if (accessToken) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtUser>(
          accessToken,
          { ignoreExpiration: true },
        );
        await this.sessionsService.revoke(payload.sid);
      } catch {
        // invalid token: nothing to revoke
      }
    }
  }

  /** ACC-08 */
  async changePassword(currentUser: JwtUser, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(currentUser.sub);
    if (!user) throw new UnauthorizedException('Account not found');

    if (!(await this.usersService.verifyPassword(user, dto.currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    await this.usersService.setPassword(
      currentUser.sub,
      dto.newPassword,
      false,
    );
    // Log out other devices; the current session stays logged in
    await this.sessionsService.revokeAllForUser(
      currentUser.sub,
      currentUser.sid,
    );
    return { message: 'Password changed successfully' };
  }

  /** ACC-04, ACC-19: the frontend gets the current user only from here. */
  async me(userId: string) {
    const user = await this.usersService.getByIdOrFail(userId);
    return this.usersService.toAuthUser(user);
  }

  private async startSession(
    user: UserDocument,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const { session, refreshToken } = await this.sessionsService.create(
      user._id.toString(),
      userAgent,
    );
    const accessToken = await this.signAccessToken(
      user,
      session._id.toString(),
    );
    return { accessToken, refreshToken };
  }

  private signAccessToken(user: UserDocument, sessionId: string) {
    const payload: JwtUser = {
      sub: user._id.toString(),
      sid: sessionId,
      email: user.email,
      role: user.role,
      providerId: user.providerId?.toString(),
    };
    return this.jwtService.signAsync(payload);
  }

  private lockedException(lockUntil: Date) {
    const minutes = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
    return new ForbiddenException(
      `Too many failed login attempts. Your account is locked, try again in ${minutes} minute(s)`,
    );
  }
}
