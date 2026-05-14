import { registerAs } from '@nestjs/config';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function parseCorsOrigins(value?: string) {
  if (!value) {
    return DEFAULT_CORS_ORIGINS;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseSwaggerEnabled(value?: string) {
  return value === 'true';
}

export default registerAs('app', () => ({
  port: Number(process.env.API_PORT ?? 3000),
  globalPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  swaggerEnabled: parseSwaggerEnabled(process.env.SWAGGER_ENABLED),
}));
