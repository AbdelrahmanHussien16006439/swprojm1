import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SessionsService } from '../../modules/users/sessions.service';
import { UsersService } from '../../modules/users/users.service';
import { ACCESS_TOKEN_COOKIE } from '../constants/auth-cookies.constants';
import { ALLOW_PASSWORD_CHANGE_REQUIRED_KEY } from '../decorators/allow-password-change-required.decorator';
import { UserStatus } from '../enums/user-status.enum';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { JwtUser } from '../interfaces/jwt-user.interface';

/**
 * Requires a logged-in user (ACC-04, ACC-06, ACC-19).
 * Rejects: missing/invalid token, revoked or idle-expired session,
 * suspended/deactivated users, and users who must change their password
 * (except on endpoints marked @AllowPasswordChangeRequired()).
 * On success sets request.user (JwtUser) and refreshes the session's lastActivityAt.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.authenticate(request, context);
    return true;
  }

  protected async authenticate(
    request: AuthenticatedRequest,
    context: ExecutionContext,
  ): Promise<JwtUser> {
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('You must be logged in');
    }

    let payload: JwtUser;
    try {
      payload = await this.jwtService.verifyAsync<JwtUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const session = await this.sessionsService.findValidById(payload.sid);
    if (!session || session.userId.toString() !== payload.sub) {
      throw new UnauthorizedException(
        'Your session has expired, please log in again',
      );
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException('Account not found');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Your account is suspended');
    }

    const allowPasswordChangeRequired =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
        [context.getHandler(), context.getClass()],
      );
    if (user.mustChangePassword && !allowPasswordChangeRequired) {
      throw new ForbiddenException(
        'You must change your password before continuing',
      );
    }

    await this.sessionsService.touch(payload.sid);

    // Role and provider are read from the DB so admin changes apply immediately
    return {
      sub: user._id.toString(),
      sid: payload.sid,
      email: user.email,
      role: user.role,
      providerId: user.providerId?.toString(),
    };
  }
}
