import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { loadConfig } from './common/config';
import { AllExceptionsFilter } from './common/http-exception.filter';

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
  );

  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableCors({
    origin: config.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });

  Logger.log(
    `UniverAcademy API listening on http://localhost:${config.PORT}`,
    'Bootstrap',
  );
}

void bootstrap();
