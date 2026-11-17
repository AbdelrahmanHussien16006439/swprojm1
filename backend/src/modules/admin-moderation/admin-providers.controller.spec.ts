import {
  BadRequestException,
  ForbiddenException,
  ParseEnumPipe,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ProviderType } from '../../common/enums/provider-type.enum';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminProvidersController } from './admin-providers.controller';

describe('AdminProvidersController authorization and route validation', () => {
  it('uses the existing JWT and role guards and requires an admin', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminProvidersController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminProvidersController)).toEqual([
      Role.ADMIN,
    ]);

    const rolesGuard = new RolesGuard(new Reflector());
    const context = (role: Role) =>
      ({
        getHandler: () => AdminProvidersController.prototype.deactivate,
        getClass: () => AdminProvidersController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      }) as any;
    expect(rolesGuard.canActivate(context(Role.ADMIN))).toBe(true);
    expect(() => rolesGuard.canActivate(context(Role.USER))).toThrow(
      ForbiddenException,
    );
  });

  it('accepts only the supported provider types', async () => {
    expect(ProviderType.AIRLINE).toBe('airline');
    expect(ProviderType.HOTEL).toBe('hotel');
    await expect(
      new ParseEnumPipe(ProviderType).transform('airline'),
    ).resolves.toBe('airline');
    await expect(
      new ParseEnumPipe(ProviderType).transform('flight'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
