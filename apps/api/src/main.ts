import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigins =
    configService.get<string[]>('app.corsOrigins') ??
    process.env.FRONTEND_URL?.split(',').map((origin) => origin.trim()) ??
    [];
  const globalPrefix = configService.get<string>('app.globalPrefix') ?? 'api';

  app.setGlobalPrefix(globalPrefix);

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

  const port = configService.get<number>('app.port') ?? 3000;

  await app.listen(port);

  console.log(`API running on http://localhost:${port}/${globalPrefix}`);
  console.log(`Swagger docs on http://localhost:${port}/${globalPrefix}/docs`);
  console.log('CORS enabled for:', corsOrigins);
}

bootstrap();
