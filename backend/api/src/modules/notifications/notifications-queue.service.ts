import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type ConnectionOptions } from 'bullmq';
import {
  buildNotificationJobId,
  NOTIFICATIONS_QUEUE,
  SEND_EMAIL_JOB_NAME,
  type SendEmailJobData,
  type SendEmailJobName,
  type SendEmailJobResult,
} from '@monitoring-tfg/shared-types';

@Injectable()
export class NotificationsQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsQueueService.name);
  private readonly queue: Queue<
    SendEmailJobData,
    SendEmailJobResult,
    SendEmailJobName
  >;

  constructor(private readonly configService: ConfigService) {
    this.queue = new Queue(NOTIFICATIONS_QUEUE, {
      connection: this.buildRedisConnection(),
    });
  }

  async enqueueEmail(data: SendEmailJobData) {
    const job = await this.queue.add(SEND_EMAIL_JOB_NAME, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10_000,
      },
      jobId: buildNotificationJobId(data),
      removeOnComplete: true,
      removeOnFail: 100,
    });

    this.logger.log(
      JSON.stringify({
        event: 'notification_email_enqueued',
        jobId: job.id,
        kind: data.kind,
        queue: NOTIFICATIONS_QUEUE,
      }),
    );
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
