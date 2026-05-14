import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type ConnectionOptions } from 'bullmq';
import {
  buildMonitorCheckJobId,
  MONITOR_CHECK_JOB_NAME,
  MONITOR_CHECKS_QUEUE,
  type MonitorCheckJobData,
  type MonitorCheckJobName,
  type MonitorCheckJobResult,
} from './monitor-checks.queue-contract';

type EnqueueSummary = {
  enqueued: number;
  failed: number;
  total: number;
};

@Injectable()
export class MonitorChecksQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MonitorChecksQueueService.name);
  private readonly queue: Queue<
    MonitorCheckJobData,
    MonitorCheckJobResult,
    MonitorCheckJobName
  >;

  constructor(private readonly configService: ConfigService) {
    this.queue = new Queue(MONITOR_CHECKS_QUEUE, {
      connection: this.buildRedisConnection(),
    });
  }

  async enqueueDueChecks(monitorIds: number[]): Promise<EnqueueSummary> {
    const requestedAt = new Date().toISOString();
    const results = await Promise.allSettled(
      monitorIds.map((monitorId) =>
        this.queue.add(
          MONITOR_CHECK_JOB_NAME,
          {
            monitorId,
            requestedAt,
            source: 'scheduler',
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5_000,
            },
            jobId: buildMonitorCheckJobId(monitorId),
            removeOnComplete: true,
            removeOnFail: 100,
          },
        ),
      ),
    );

    const failed = results.filter(
      (result) => result.status === 'rejected',
    ).length;
    const enqueued = results.length - failed;

    if (failed > 0) {
      this.logger.error(
        JSON.stringify({
          event: 'monitor_checks_enqueue_failed',
          failed,
          queue: MONITOR_CHECKS_QUEUE,
          total: monitorIds.length,
        }),
      );
    }

    return {
      enqueued,
      failed,
      total: monitorIds.length,
    };
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  private buildRedisConnection(): ConnectionOptions {
    const redisUrl = this.configService.get<string>('queue.redisUrl');

    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);

      return {
        db: parsedUrl.pathname
          ? Number(parsedUrl.pathname.slice(1))
          : undefined,
        host: parsedUrl.hostname,
        password: parsedUrl.password
          ? decodeURIComponent(parsedUrl.password)
          : undefined,
        port: parsedUrl.port ? Number(parsedUrl.port) : 6379,
        tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
        username: parsedUrl.username
          ? decodeURIComponent(parsedUrl.username)
          : undefined,
      };
    }

    return {
      host:
        this.configService.get<string>('queue.redisHost') ??
        process.env.REDIS_HOST ??
        '127.0.0.1',
      port: Number(
        this.configService.get<number>('queue.redisPort') ??
          process.env.REDIS_PORT ??
          6379,
      ),
    };
  }
}
