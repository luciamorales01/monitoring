import { PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import {
  NOTIFICATIONS_QUEUE,
  type EmailPayload,
  type SendEmailJobData,
  type SendEmailJobName,
  type SendEmailJobResult,
} from '../../../api/src/modules/notifications/notifications.queue-contract';
import { createRedisConnection } from './redis-connection';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function logStructured(level: 'log' | 'warn' | 'error', payload: object) {
  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

function getEnvPathCandidates() {
  const cwd = process.cwd();
  const workerEnvFromCwd =
    basename(cwd) === 'notifications-worker'
      ? resolve(cwd, '.env')
      : resolve(cwd, 'apps', 'workers', 'notifications-worker', '.env');

  return [
    workerEnvFromCwd,
    resolve(__dirname, '..', '.env'),
    resolve(__dirname, '..', '..', '..', '..', '..', '.env'),
    resolve(cwd, '.env'),
    resolve(cwd, '..', '..', '..', '.env'),
  ];
}

function loadNotificationWorkerEnv() {
  const workerEnvPath = getEnvPathCandidates().find((candidate) =>
    existsSync(candidate),
  );

  if (workerEnvPath) {
    dotenv.config({ override: true, path: workerEnvPath });
    logStructured('log', {
      envPath: workerEnvPath,
      event: 'notifications_worker_env_loaded',
    });
  } else {
    logStructured('warn', {
      event: 'notifications_worker_env_not_found',
    });
  }
}

function logSmtpConfigurationStatus() {
  const yes = 'sí';
  const no = 'no';
  const isConfigured = (value: string | undefined) =>
    value !== undefined && value.trim().length > 0;

  logStructured('log', {
    event: 'notifications_worker_smtp_config',
    'NOTIFICATIONS_FROM configurado': isConfigured(
      process.env.NOTIFICATIONS_FROM,
    )
      ? yes
      : no,
    'SMTP_HOST configurado': isConfigured(process.env.SMTP_HOST) ? yes : no,
    'SMTP_PASS configurado': isConfigured(process.env.SMTP_PASS) ? yes : no,
    'SMTP_USER configurado': isConfigured(process.env.SMTP_USER) ? yes : no,
  });
}

loadNotificationWorkerEnv();

const prisma = new PrismaClient();

function getWorkerConcurrency() {
  const configured = Number(process.env.NOTIFICATIONS_WORKER_CONCURRENCY ?? 5);
  return Number.isFinite(configured) && configured > 0 ? configured : 5;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    secure,
    user,
    pass,
    from: process.env.NOTIFICATIONS_FROM?.trim() || user,
  };
}

async function updateNotificationEvent(
  eventId: number,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  errorMessage?: string,
) {
  await prisma.notificationEvent.update({
    where: { id: eventId },
    data: {
      errorMessage: errorMessage ?? null,
      sentAt: status === 'SENT' ? new Date() : null,
      status,
    },
  });
}

async function sendEmail(email: EmailPayload): Promise<SendEmailJobResult> {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    logStructured('warn', {
      email,
      event: 'email_logged_smtp_not_configured',
      queue: NOTIFICATIONS_QUEUE,
    });

    return {
      reason: 'smtp-not-configured',
      status: 'skipped',
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  await transporter.sendMail({
    from: smtpConfig.from,
    to: email.to.join(', '),
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return { status: 'sent' };
}

async function processJob(
  job: Job<SendEmailJobData, SendEmailJobResult, SendEmailJobName>,
): Promise<SendEmailJobResult> {
  const startedAt = Date.now();

  logStructured('log', {
    attempt: job.attemptsMade + 1,
    event: 'notification_email_started',
    jobId: job.id,
    kind: job.data.kind,
    queue: NOTIFICATIONS_QUEUE,
  });

  try {
    const result = await sendEmail(job.data.email);

    if (job.data.kind === 'monitor-alert') {
      await updateNotificationEvent(
        job.data.notificationEventId,
        result.status === 'sent' ? 'SENT' : 'SKIPPED',
        result.reason,
      );
    }

    logStructured('log', {
      durationMs: Date.now() - startedAt,
      event: 'notification_email_completed',
      jobId: job.id,
      kind: job.data.kind,
      queue: NOTIFICATIONS_QUEUE,
      status: result.status,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';

    if (job.data.kind === 'monitor-alert') {
      const notificationEventId = job.data.notificationEventId;

      await updateNotificationEvent(
        notificationEventId,
        'FAILED',
        message,
      ).catch((updateError: unknown) => {
        logStructured('error', {
          event: 'notification_event_update_failed',
          jobId: job.id,
          message:
            updateError instanceof Error
              ? updateError.message
              : 'Error desconocido',
          notificationEventId,
          queue: NOTIFICATIONS_QUEUE,
        });
      });
    }

    throw error;
  }
}

async function bootstrap() {
  logSmtpConfigurationStatus();

  const redis = createRedisConnection();
  const worker = new Worker<
    SendEmailJobData,
    SendEmailJobResult,
    SendEmailJobName
  >(NOTIFICATIONS_QUEUE, processJob, {
    concurrency: getWorkerConcurrency(),
    connection: redis,
  });

  worker.on('failed', (job, error) => {
    logStructured('error', {
      attemptsMade: job?.attemptsMade,
      event: 'notification_email_failed',
      jobId: job?.id,
      kind: job?.data.kind,
      message: error.message,
      queue: NOTIFICATIONS_QUEUE,
      stack: error.stack,
    });
  });

  worker.on('error', (error) => {
    logStructured('error', {
      event: 'notifications_worker_error',
      message: error.message,
      queue: NOTIFICATIONS_QUEUE,
      stack: error.stack,
    });
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    logStructured('log', {
      event: 'notifications_worker_shutdown_started',
      queue: NOTIFICATIONS_QUEUE,
      signal,
    });

    await worker.close();
    await redis.quit();
    await prisma.$disconnect();

    logStructured('log', {
      event: 'notifications_worker_shutdown_completed',
      queue: NOTIFICATIONS_QUEUE,
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
    event: 'notifications_worker_started',
    queue: NOTIFICATIONS_QUEUE,
  });
}

void bootstrap().catch((error: unknown) => {
  logStructured('error', {
    event: 'notifications_worker_bootstrap_failed',
    message: error instanceof Error ? error.message : 'Error desconocido',
    stack: error instanceof Error ? error.stack : undefined,
  });

  process.exit(1);
});
