import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  MONITOR_CHECKS_QUEUE,
  type MonitorCheckJobData,
  type MonitorCheckJobName,
  type MonitorCheckJobResult,
} from '../../../api/src/modules/monitors/monitor-checks.queue-contract';
import { MonitorsService } from '../../../api/src/modules/monitors/monitors.service';
import { createRedisConnection } from './redis-connection';
import { MonitoringWorkerAppModule } from './worker-app.module';

const logger = new Logger('MonitoringWorker');

function getWorkerConcurrency() {
  const configured = Number(process.env.MONITOR_CHECK_WORKER_CONCURRENCY ?? 5);
  return Number.isFinite(configured) && configured > 0 ? configured : 5;
}

function getMonitorLockTtlMs() {
  const configured = Number(process.env.MONITOR_CHECK_LOCK_TTL_MS ?? 300_000);
  return Number.isFinite(configured) && configured > 0 ? configured : 300_000;
}

async function acquireMonitorLock(
  redis: IORedis,
  monitorId: number,
  token: string,
) {
  const result = await redis.set(
    `locks:monitor-check:${monitorId}`,
    token,
    'PX',
    getMonitorLockTtlMs(),
    'NX',
  );

  return result === 'OK';
}

async function releaseMonitorLock(
  redis: IORedis,
  monitorId: number,
  token: string,
) {
  await redis.eval(
    "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
    1,
    `locks:monitor-check:${monitorId}`,
    token,
  );
}

function logStructured(level: 'log' | 'warn' | 'error', payload: object) {
  logger[level](JSON.stringify(payload));
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    MonitoringWorkerAppModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );
  const monitorsService = app.get(MonitorsService);
  const redis = createRedisConnection();

  const worker = new Worker<
    MonitorCheckJobData,
    MonitorCheckJobResult,
    MonitorCheckJobName
  >(
    MONITOR_CHECKS_QUEUE,
    async (
      job: Job<MonitorCheckJobData, MonitorCheckJobResult, MonitorCheckJobName>,
    ) => {
      const { monitorId } = job.data;
      const lockToken = `${process.pid}:${job.id ?? 'unknown'}:${Date.now()}`;
      const lockAcquired = await acquireMonitorLock(
        redis,
        monitorId,
        lockToken,
      );

      if (!lockAcquired) {
        logStructured('warn', {
          event: 'monitor_check_skipped_duplicate_lock',
          jobId: job.id,
          monitorId,
          queue: MONITOR_CHECKS_QUEUE,
        });

        return {
          monitorId,
          reason: 'duplicate-lock',
          status: 'skipped',
        };
      }

      const startedAt = Date.now();

      try {
        logStructured('log', {
          attempt: job.attemptsMade + 1,
          event: 'monitor_check_started',
          jobId: job.id,
          monitorId,
          queue: MONITOR_CHECKS_QUEUE,
        });

        await monitorsService.runAutomatedCheck(monitorId);

        logStructured('log', {
          durationMs: Date.now() - startedAt,
          event: 'monitor_check_completed',
          jobId: job.id,
          monitorId,
          queue: MONITOR_CHECKS_QUEUE,
        });

        return {
          monitorId,
          status: 'processed',
        };
      } finally {
        await releaseMonitorLock(redis, monitorId, lockToken);
      }
    },
    {
      concurrency: getWorkerConcurrency(),
      connection: redis,
      lockDuration: getMonitorLockTtlMs(),
    },
  );

  worker.on('failed', (job, error) => {
    logStructured('error', {
      attemptsMade: job?.attemptsMade,
      event: 'monitor_check_failed',
      jobId: job?.id,
      message: error.message,
      monitorId: job?.data.monitorId,
      queue: MONITOR_CHECKS_QUEUE,
      stack: error.stack,
    });
  });

  worker.on('error', (error) => {
    logStructured('error', {
      event: 'monitor_worker_error',
      message: error.message,
      queue: MONITOR_CHECKS_QUEUE,
      stack: error.stack,
    });
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    logStructured('log', {
      event: 'monitor_worker_shutdown_started',
      queue: MONITOR_CHECKS_QUEUE,
      signal,
    });

    await worker.close();
    await redis.quit();
    await app.close();

    logStructured('log', {
      event: 'monitor_worker_shutdown_completed',
      queue: MONITOR_CHECKS_QUEUE,
      signal,
    });
  };

  process.once('SIGINT', (signal) => {
    void shutdown(signal).then(() => process.exit(0));
  });
  process.once('SIGTERM', (signal) => {
    void shutdown(signal).then(() => process.exit(0));
  });

  logStructured('log', {
    concurrency: getWorkerConcurrency(),
    event: 'monitor_worker_started',
    queue: MONITOR_CHECKS_QUEUE,
  });
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;

  logStructured('error', {
    event: 'monitor_worker_bootstrap_failed',
    message,
    stack,
  });

  process.exit(1);
});
