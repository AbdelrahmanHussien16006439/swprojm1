import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ListAccountsQueryDto } from '../users/dto/list-accounts-query.dto';
import { AdminAccountsService } from './admin-accounts.service';
import { CreateModeratorDto } from './dto/create-moderator.dto';
import { AdminResetPasswordDto } from './dto/reset-password.dto';
import { SuspendAccountDto } from './dto/suspend-account.dto';

@ApiTags('admin-accounts')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminAccountsController {
  constructor(private readonly adminAccountsService: AdminAccountsService) {}

  @Post('moderators')
  @ApiOperation({
    summary: 'Create an airline or hotel moderator account (ACC-13)',
    description:
      'Linked to exactly one existing airline/hotel. The moderator must change the temporary password at first login.',
  })
  createModerator(
    @CurrentUser() admin: JwtUser,
    @Body() dto: CreateModeratorDto,
  ) {
    return this.adminAccountsService.createModerator(admin, dto);
  }

  @Get('accounts')
  @ApiOperation({
    summary:
      'List accounts — search by name/email, filter by role/status (ACC-14)',
  })
  listAccounts(@Query() query: ListAccountsQueryDto) {
    return this.adminAccountsService.listAccounts(query);
  }

  @Patch('accounts/:id/suspend')
  @ApiParam({ name: 'id', description: 'User or moderator id' })
  @ApiOperation({
    summary: 'Suspend a user or moderator (ACC-15, ACC-16)',
    description:
      'The account cannot log in and its sessions are revoked. Existing bookings stay valid and content stays visible.',
  })
  suspend(
    @CurrentUser() admin: JwtUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SuspendAccountDto,
  ) {
    return this.adminAccountsService.suspend(admin, id, dto);
  }

  @Patch('accounts/:id/reactivate')
  @ApiParam({ name: 'id', description: 'User or moderator id' })
  @ApiOperation({ summary: 'Reactivate a suspended account (ACC-15, ACC-16)' })
  reactivate(
    @CurrentUser() admin: JwtUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.adminAccountsService.reactivate(admin, id);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'User or moderator id' })
  @ApiOperation({
    summary: 'Set a temporary password for a user or moderator (ACC-07a)',
  })
  resetPassword(
    @CurrentUser() admin: JwtUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.adminAccountsService.resetPassword(admin, id, dto);
  }
}
