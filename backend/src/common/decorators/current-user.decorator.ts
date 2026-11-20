import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { JwtUser } from '../interfaces/jwt-user.interface';

/**
 * Injects the logged-in user (set by JwtAuthGuard / OptionalJwtAuthGuard).
 * Usage: @CurrentUser() user: JwtUser   or   @CurrentUser('sub') userId: string
 */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
