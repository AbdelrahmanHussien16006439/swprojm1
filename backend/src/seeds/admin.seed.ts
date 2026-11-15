/**
 * ACC-18: administrator accounts are seeded only (no admin self-registration).
 * Run from backend/:  npm run seed:admin
 * Uses ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD from .env. Safe to re-run.
 */
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { validateEnv } from '../common/config/env.validation';
import { Role } from '../common/enums/role.enum';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersService } from '../modules/users/users.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    AuthModule, // also provides UsersModule
  ],
})
class SeedModule {}

async function seedAdmin() {
  const logger = new Logger('AdminSeed');
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const config = app.get(ConfigService);
    const usersService = app.get(UsersService);

    const name = config.get<string>('ADMIN_NAME', 'Platform Admin');
    const email = config.getOrThrow<string>('ADMIN_EMAIL');
    const password = config.getOrThrow<string>('ADMIN_PASSWORD');

    // Same password rule as ACC-01
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      throw new Error(
        'ADMIN_PASSWORD must be at least 8 characters with at least one letter and one digit',
      );
    }

    const existing = await usersService.findByEmail(email);
    if (existing) {
      logger.log(
        `Account ${email} already exists (role: ${existing.role}) — nothing to do`,
      );
      return;
    }

    await usersService.create({ name, email, password, role: Role.ADMIN });
    logger.log(`Admin account created: ${email}`);
  } finally {
    await app.close();
  }
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
