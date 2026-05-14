import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SafeExceptionFilter } from './common/filters/safe-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigins =
    configService.get<string[]>('app.corsOrigins') ??
    process.env.FRONTEND_URL?.split(',').map((origin) => origin.trim()) ??
    [];
  const globalPrefix = configService.get<string>('app.globalPrefix') ?? 'api';
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const swaggerEnabled =
    nodeEnv !== 'production' ||
    configService.get<string>('SWAGGER_ENABLED') === 'true';

  app.setGlobalPrefix(globalPrefix);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
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
  app.useGlobalFilters(new SafeExceptionFilter());

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Monitoring API')
      .setDescription(
        'API multi-tenant para autenticacion, monitores, incidencias, informes y dashboard.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Introduce un access token JWT valido.',
        },
        'bearer',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Monitoring API Docs',
    });
  }

  const port = configService.get<number>('app.port') ?? 3000;

  await app.listen(port);

  logger.log(`API running on http://localhost:${port}/${globalPrefix}`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs on http://localhost:${port}/${globalPrefix}/docs`);
  }
  logger.log(`CORS enabled for: ${corsOrigins.join(', ') || 'none'}`);
}

bootstrap();
