import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminAuditLogsController } from './admin-audit-logs.controller';

describe('AdminAuditLogsController authorization', () => {
  it('uses JWT and role guards and requires the admin role', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminAuditLogsController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminAuditLogsController)).toEqual([
      Role.ADMIN,
    ]);
  });

  it('allows admins and rejects other roles with the existing RolesGuard', () => {
    const guard = new RolesGuard(new Reflector());
    const context = (role: Role) =>
      ({
        getHandler: () => AdminAuditLogsController.prototype.list,
        getClass: () => AdminAuditLogsController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      }) as any;

    expect(guard.canActivate(context(Role.ADMIN))).toBe(true);
    expect(() => guard.canActivate(context(Role.USER))).toThrow(
      ForbiddenException,
    );
  });
});
