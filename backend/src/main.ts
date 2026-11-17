import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { ACCESS_TOKEN_COOKIE } from './common/constants/auth-cookies.constants';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // rawBody is needed to verify Stripe webhook signatures (PAY-01, Member 4)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  // GEN-02, GEN-13: every body/query is validated by its DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // GEN-08: uploaded images are served at /uploads/<file>
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Travel Planning and Booking Platform API')
    .setDescription(
      'Milestone 1 backend. Log in with POST /api/auth/login — the browser keeps the httpOnly cookies and sends them on later requests.',
    )
    .setVersion('1.0')
    // Scheme name must match @ApiCookieAuth('access_token') used in the controllers
    .addCookieAuth(
      ACCESS_TOKEN_COOKIE,
      { type: 'apiKey', in: 'cookie' },
      ACCESS_TOKEN_COOKIE,
    )
    .build();
  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
  console.log(`Swagger UI on http://localhost:${port}/api/docs`);
}
void bootstrap();
