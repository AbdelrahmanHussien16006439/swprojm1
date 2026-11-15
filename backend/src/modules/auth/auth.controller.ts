import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../../common/constants/auth-cookies.constants';
import { AllowPasswordChangeRequired } from '../../common/decorators/allow-password-change-required.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import {
  clearAuthCookies,
  setAuthCookies,
} from '../../common/utils/auth-cookies';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_MAX_AGE_MS,
} from './auth.constants';
import { AuthService, AuthTokens } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account (ACC-01)' })
  @ApiCreatedResponse({ description: 'Account created (role is always user)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in (ACC-04, ACC-05)',
    description:
      'Sets the access_token and refresh_token httpOnly cookies. Locks the account for 15 minutes after 5 failed attempts.',
  })
  @ApiOkResponse({ description: 'Logged in; returns the user' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(
      dto,
      req.headers['user-agent'],
    );
    this.setCookies(res, tokens);
    return { user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Rotate the refresh token and get a new access token (ACC-06, ACC-19)',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const tokens = await this.authService.refresh(
        req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined,
      );
      this.setCookies(res, tokens);
      return { message: 'Session refreshed' };
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Log out: revoke the session and clear both cookies (ACC-06)',
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(
      req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined,
      req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined,
    );
    clearAuthCookies(res);
    return { message: 'Logged out' };
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @AllowPasswordChangeRequired()
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Change my password (ACC-08)',
    description: 'Also clears mustChangePassword after an admin reset.',
  })
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @AllowPasswordChangeRequired()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get the current user (ACC-04, ACC-19)' })
  me(@CurrentUser() user: JwtUser) {
    return this.authService.me(user.sub);
  }

  private setCookies(res: Response, tokens: AuthTokens) {
    setAuthCookies(res, tokens, {
      accessMs: ACCESS_TOKEN_TTL_SECONDS * 1000,
      refreshMs: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }
}
