import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * For public endpoints that behave differently when logged in
 * (e.g. authors/admins can see hidden content). Never rejects:
 * request.user is set if the user is validly logged in, otherwise undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      request.user = await this.authenticate(request, context);
    } catch {
      request.user = undefined;
    }
    return true;
  }
}
