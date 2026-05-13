import { createHash } from 'node:crypto';

export const NOTIFICATIONS_QUEUE = 'notifications';
export const SEND_EMAIL_JOB_NAME = 'send-email';

export type SendEmailJobName = typeof SEND_EMAIL_JOB_NAME;

export type EmailPayload = {
  to: string[];
  subject: string;
  text: string;
  html: string;
};

export type MonitorEmailJobData = {
  kind: 'monitor-alert';
  notificationEventId: number;
  email: EmailPayload;
  requestedAt: string;
};

export type PasswordResetEmailJobData = {
  kind: 'password-reset';
  email: EmailPayload;
  requestedAt: string;
  userId: number;
  organizationId: number;
};

export type SendEmailJobData =
  | MonitorEmailJobData
  | PasswordResetEmailJobData;

export type SendEmailJobResult = {
  status: 'sent' | 'skipped';
  reason?: 'smtp-not-configured';
};

function buildStableHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

export function buildNotificationJobId(data: SendEmailJobData) {
  if (data.kind === 'monitor-alert') {
    return `notification-event-${data.notificationEventId}`;
  }

  return `password-reset-${buildStableHash(
    `${data.userId}|${data.organizationId}|${data.requestedAt}|${data.email.to.join(',')}`,
  )}`;
}
