import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Increase payload limit to 50MB to prevent 413 Payload Too Large
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  const port = configService.get<number>('PORT') || 5000;
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
  const allowedOriginsEnv = configService.get<string>('ALLOWED_ORIGINS');

  // Set Global API Route Prefix (e.g. /api/v1)
  app.setGlobalPrefix(apiPrefix);

  // Enable Global Validation Pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Dynamic CORS configuration for multi-domain support
  let corsOrigins: boolean | string[] = true;
  if (allowedOriginsEnv && allowedOriginsEnv.trim() !== '') {
    corsOrigins = allowedOriginsEnv.split(',').map((origin) => origin.trim());
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  await app.listen(port, '0.0.0.0');
  console.log(`[Backend] Server running on port ${port} with prefix /${apiPrefix}`);
}
bootstrap();
