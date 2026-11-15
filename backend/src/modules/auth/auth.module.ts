import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Global so every module can use JwtAuthGuard / OptionalJwtAuthGuard / RolesGuard
 * with @UseGuards(...) without importing anything (their dependencies are exported here).
 */
@Global()
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  providers: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
  controllers: [AuthController],
  exports: [
    UsersModule,
    JwtModule,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
