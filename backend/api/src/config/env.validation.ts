type RawEnv = Record<string, string | undefined>;

const REQUIRED_ENV_KEYS = ['DATABASE_URL', 'JWT_SECRET'] as const;

export function validateEnv(config: RawEnv) {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !config[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missingKeys.join(', ')}`,
    );
  }

  if ((config.JWT_SECRET?.length ?? 0) < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }

  if (config.API_PORT && Number.isNaN(Number(config.API_PORT))) {
    throw new Error('API_PORT debe ser numérico');
  }

  if (config.SMTP_PORT && Number.isNaN(Number(config.SMTP_PORT))) {
    throw new Error('SMTP_PORT debe ser numérico');
  }

  if (config.SMTP_SECURE && !['true', 'false'].includes(config.SMTP_SECURE)) {
    throw new Error('SMTP_SECURE debe ser true o false');
  }

  if (
    config.NODE_ENV === 'production' &&
    (!config.CORS_ORIGINS || config.CORS_ORIGINS.trim().length === 0)
  ) {
    throw new Error('CORS_ORIGINS es obligatorio en produccion');
  }

  const corsOrigins = config.CORS_ORIGINS?.split(',').map((origin) =>
    origin.trim(),
  );

  if (corsOrigins?.some((origin) => origin === '*')) {
    throw new Error('CORS_ORIGINS no puede usar * con credenciales habilitadas');
  }

  if (config.SWAGGER_ENABLED && !['true', 'false'].includes(config.SWAGGER_ENABLED)) {
    throw new Error('SWAGGER_ENABLED debe ser true o false');
  }

  return config;
}
