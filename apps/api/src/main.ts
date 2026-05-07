import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigins =
    configService.get<string[]>('app.corsOrigins') ??
    process.env.FRONTEND_URL
      ?.split(',')
      .map((origin) => origin.trim()) ??
    [];

  app.setGlobalPrefix(
    configService.get<string>('app.globalPrefix') ?? 'api',
  );

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get<number>('app.port') ?? 3000;

  await app.listen(port);

  console.log(`API running on http://localhost:${port}/api`);
  console.log('CORS enabled for:', corsOrigins);
}

bootstrap();