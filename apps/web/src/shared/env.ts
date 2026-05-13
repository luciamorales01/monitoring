type AppEnv = {
  apiUrl: string;
  appName: string;
  requestTimeoutMs: number;
};

function normalizeAppName(value: unknown) {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  if (!rawValue || rawValue === 'Monitoring TFG') {
    return 'Monitoring';
  }
  return rawValue;
}

function normalizeApiUrl(value: unknown) {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  const fallback = 'http://localhost:3000/api';
  const apiUrl = rawValue || fallback;

  try {
    const url = new URL(apiUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    console.warn(
      `[env] VITE_API_URL no es válida. Se usará ${fallback}.`,
    );
    return fallback;
  }
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const appEnv: AppEnv = {
  apiUrl: normalizeApiUrl(import.meta.env.VITE_API_URL),
  appName: normalizeAppName(import.meta.env.VITE_APP_NAME),
  requestTimeoutMs: toPositiveInteger(
    import.meta.env.VITE_REQUEST_TIMEOUT_MS,
    15000,
  ),
};
