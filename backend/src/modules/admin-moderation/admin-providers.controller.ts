import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProviderType } from '../../common/enums/provider-type.enum';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AdminProvidersService } from './admin-providers.service';

@ApiTags('admin providers')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/providers')
@ApiUnauthorizedResponse({ description: 'Login required' })
@ApiForbiddenResponse({ description: 'Admin role required' })
export class AdminProvidersController {
  constructor(private readonly providersService: AdminProvidersService) {}

  @Patch(':type/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'type', enum: ProviderType })
  @ApiOperation({
    summary: 'Deactivate a provider (ACC-15)',
    description: 'Deactivates the provider, notifies its moderator, and records an audit log.',
  })
  @ApiBadRequestResponse({ description: 'Invalid provider type or id' })
  deactivate(
    @Param('type', new ParseEnumPipe(ProviderType)) type: ProviderType,
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.providersService.deactivate(type, id, admin.sub);
  }

  @Patch(':type/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'type', enum: ProviderType })
  @ApiOperation({
    summary: 'Reactivate a provider (ACC-15)',
    description: 'Reactivates the provider, notifies its moderator, and records an audit log.',
  })
  @ApiBadRequestResponse({ description: 'Invalid provider type or id' })
  reactivate(
    @Param('type', new ParseEnumPipe(ProviderType)) type: ProviderType,
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.providersService.reactivate(type, id, admin.sub);
  }
}
