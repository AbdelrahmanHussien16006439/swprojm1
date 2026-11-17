import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AdminModerationController } from './admin-moderation.controller';

describe('AdminModerationController access and id validation', () => {
  it('requires the real JWT and role guards and restricts routes to admins', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminModerationController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminModerationController)).toEqual([
      Role.ADMIN,
    ]);
  });

  it('rejects invalid Mongo ids with HTTP 400', () => {
    expect(() => new ParseObjectIdPipe().transform('bad-id')).toThrow(
      '"bad-id" is not a valid id',
    );
  });

  it('allows admins and rejects non-admin roles using the existing RolesGuard', () => {
    const guard = new RolesGuard(new Reflector());
    const context = (role: Role) =>
      ({
        getHandler: () => AdminModerationController.prototype.listReports,
        getClass: () => AdminModerationController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      }) as any;

    expect(guard.canActivate(context(Role.ADMIN))).toBe(true);
    expect(() => guard.canActivate(context(Role.USER))).toThrow(
      ForbiddenException,
    );
  });
});
