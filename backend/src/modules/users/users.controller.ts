import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConfirmActionDto } from '../../common/dto/confirm-action.dto';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { clearAuthCookies } from '../../common/utils/auth-cookies';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my full profile (ACC-11)' })
  getMe(@CurrentUser() user: JwtUser) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Edit my name, phone number and preferred currency (ACC-09)',
  })
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Delete('me')
  @Roles(Role.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate my account (ACC-12)',
    description:
      'Body { "confirm": true }. Blocked while you have upcoming confirmed bookings. Revokes all sessions and clears cookies.',
  })
  @ApiOkResponse({ description: 'Account deactivated' })
  async deactivateMe(
    @CurrentUser() user: JwtUser,
    @Body() _dto: ConfirmActionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.deactivateOwnAccount(user.sub);
    clearAuthCookies(res);
    return { message: 'Your account has been deactivated' };
  }
}
