const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(backendRoot, '.env');

const serviceEnvKeys = {
  'api': [
    'NODE_ENV',
    'API_PORT',
    'API_PREFIX',
    'CORS_ORIGINS',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'DATABASE_URL',
    'DIRECT_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_URL',
    'FRONTEND_URL',
    'SWAGGER_ENABLED',
  ],
  'workers/monitoring-worker': [
    'NODE_ENV',
    'DATABASE_URL',
    'DIRECT_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_URL',
    'MONITOR_CHECK_WORKER_CONCURRENCY',
    'MONITOR_CHECK_LOCK_TTL_MS',
  ],
  'workers/notifications-worker': [
    'NODE_ENV',
    'DATABASE_URL',
    'DIRECT_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_URL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'NOTIFICATIONS_FROM',
    'NOTIFICATIONS_WORKER_CONCURRENCY',
  ],
};

function parseEnv(content) {
  return content.split(/\r?\n/).reduce((values, line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return values;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      return values;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);

    if (key) {
      values.set(key, value);
    }

    return values;
  }, new Map());
}

function buildServiceEnv(servicePath, keys, sourceValues) {
  const missing = keys.filter((key) => !sourceValues.has(key));
  const lines = [
    '# Generated from backend/.env by npm run env:sync',
    '# Keep service-specific overrides in this file when needed.',
    '',
  ];

  for (const key of keys) {
    if (sourceValues.has(key)) {
      lines.push(`${key}=${sourceValues.get(key)}`);
    }
  }

  if (missing.length > 0) {
    lines.push('', '# Not present in backend/.env:');
    for (const key of missing) {
      lines.push(`# ${key}=`);
    }
  }

  return {
    content: `${lines.join('\n')}\n`,
    targetPath: path.join(backendRoot, servicePath, '.env'),
  };
}

function main() {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source env file not found: ${sourcePath}`);
  }

  const sourceValues = parseEnv(readFileSync(sourcePath, 'utf8'));

  for (const [servicePath, keys] of Object.entries(serviceEnvKeys)) {
    const { content, targetPath } = buildServiceEnv(
      servicePath,
      keys,
      sourceValues,
    );

    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content);
    console.log(`Synced ${path.relative(backendRoot, targetPath)}`);
  }
}

main();
