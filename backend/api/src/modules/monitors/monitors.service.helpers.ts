import { BadRequestException } from '@nestjs/common';
import { isIP } from 'node:net';
import {
  CheckResultEntity,
  MonitorCheckOutcome,
  MonitorStatus,
  type MonitorStatusValue,
} from './monitors.service.types';

export function normalizeMonitorDnsRecordType(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim().toUpperCase()
    : 'A';
}

export function normalizeMonitorDnsExpectedValue(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export function normalizeMonitorSslWarningDays(value: number | null) {
  return value === null ? 14 : Number(value);
}

export function buildMonitorCheckOutcome(
  input: MonitorCheckOutcome,
): MonitorCheckOutcome {
  return input;
}

export function parseMonitorHttpUrl(target: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(target);
  } catch {
    throw new BadRequestException('URL del monitor no válida');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new BadRequestException('Solo se permiten URLs HTTP o HTTPS');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new BadRequestException(
      'No se permiten credenciales en la URL del monitor',
    );
  }

  return parsedUrl;
}

export function extractHostnameFromTarget(target: string) {
  return target
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .trim()
    .toLowerCase();
}

export function buildHttpStatusErrorMessage(
  statusCode: number,
  expectedStatusCode: number,
) {
  return `Código HTTP ${statusCode}, esperado ${expectedStatusCode}`;
}

export function isRedirectStatus(statusCode: number) {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

export function isBlockedHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '0.0.0.0' ||
    hostname === '::'
  );
}

export function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const parts = address.split('.').map(Number);
    const [first, second] = parts;

    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127) ||
      first === 0
    );
  }

  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();

    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:')
    );
  }

  return true;
}

export function getOverallMonitorStatus(
  outcomes: MonitorCheckOutcome[],
): MonitorStatusValue {
  if (
    outcomes.length === 0 ||
    outcomes.every((outcome) => outcome.status === MonitorStatus.UNKNOWN)
  ) {
    return MonitorStatus.UNKNOWN;
  }

  if (outcomes.some((outcome) => outcome.status === MonitorStatus.DOWN)) {
    return MonitorStatus.DOWN;
  }

  if (outcomes.every((outcome) => outcome.status === MonitorStatus.UP)) {
    return MonitorStatus.UP;
  }

  return MonitorStatus.UNKNOWN;
}

export function getLatestCheckedAt(outcomes: MonitorCheckOutcome[]) {
  return outcomes.reduce(
    (latest, outcome) =>
      outcome.checkedAt.getTime() > latest.getTime()
        ? outcome.checkedAt
        : latest,
    outcomes[0]?.checkedAt ?? new Date(),
  );
}

export function getAverageResponseTime(outcomes: MonitorCheckOutcome[]) {
  const responseTimes = outcomes
    .map((outcome) => outcome.responseTimeMs)
    .filter((value): value is number => Number.isFinite(value));

  if (responseTimes.length === 0) {
    return null;
  }

  return Math.round(
    responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length,
  );
}

export function buildGlobalErrorMessage(outcomes: MonitorCheckOutcome[]) {
  const errors = outcomes
    .filter(
      (outcome) =>
        outcome.status === MonitorStatus.DOWN && Boolean(outcome.errorMessage),
    )
    .map((outcome) => outcome.errorMessage);

  return errors.length > 0 ? errors.join(' | ') : null;
}

export function getAlertThreshold(alertThreshold?: number | null) {
  return Math.max(1, alertThreshold ?? 3);
}

export function getBatchStatus(
  results: Array<Pick<CheckResultEntity, 'status'>>,
): MonitorStatusValue {
  if (results.some((result) => result.status === MonitorStatus.DOWN)) {
    return MonitorStatus.DOWN;
  }

  if (results.every((result) => result.status === MonitorStatus.UP)) {
    return MonitorStatus.UP;
  }

  return MonitorStatus.UNKNOWN;
}

export function getRecentCheckBatches(
  results: CheckResultEntity[],
  batchSize: number,
) {
  const batches: CheckResultEntity[][] = [];

  for (let index = 0; index < results.length; index += batchSize) {
    const batch = results.slice(index, index + batchSize);

    if (batch.length < batchSize) {
      break;
    }

    batches.push(batch);
  }

  return batches;
}

export function getConsecutiveDownBatches(
  results: CheckResultEntity[],
  batchSize: number,
) {
  const batches = getRecentCheckBatches(results, batchSize);
  const consecutiveDownBatches: CheckResultEntity[][] = [];

  for (const batch of batches) {
    if (getBatchStatus(batch) !== MonitorStatus.DOWN) {
      break;
    }

    consecutiveDownBatches.push(batch);
  }

  return consecutiveDownBatches;
}

export function getIncidentStartedAt(
  batches: CheckResultEntity[][],
  fallback: Date,
) {
  const oldestBatch = batches.at(-1);

  if (!oldestBatch || oldestBatch.length === 0) {
    return fallback;
  }

  return oldestBatch.reduce(
    (earliest, result) =>
      result.checkedAt.getTime() < earliest.getTime()
        ? result.checkedAt
        : earliest,
    oldestBatch[0].checkedAt,
  );
}

export function buildIncidentTitle() {
  return 'Monitor caído';
}

export function sanitizeMonitorResponse<TMonitor extends object>(monitor: TMonitor) {
  const monitorWithChecks = monitor as TMonitor & {
    checkResults?: Array<Record<string, unknown> & { location?: string | null }>;
  };

  if (!monitorWithChecks.checkResults) {
    return monitor;
  }

  return {
    ...monitor,
    checkResults: monitorWithChecks.checkResults.map(({ location, ...check }) => {
      void location;
      return check;
    }),
  };
}

export function buildMonitorCheckErrorMessage(
  error: unknown,
  timeoutSeconds: number,
) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return `Timeout tras ${timeoutSeconds} segundos`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Error desconocido';
}

export function isMonitorCheckTimeoutError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && /^Timeout tras \d+ segundos$/.test(error.message))
  );
}
