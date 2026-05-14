import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { NotificationsQueueService } from './notifications-queue.service';

type NotificationPrisma = Pick<
  Prisma.TransactionClient,
  'notificationEvent' | 'user'
>;

type MonitorNotificationPayload = {
  monitorId: number;
  incidentId: number;
  organizationId: number;
  monitorName: string;
  monitorTarget: string;
  title: string;
  severity?: string | null;
  errorMessage?: string | null;
  startedAt?: Date | null;
  resolvedAt?: Date | null;
};

type PasswordResetPayload = {
  email: string;
  name: string;
  organizationId: number;
  resetUrl: string;
  userId: number;
  expiresAt: Date;
};

type MailMessage = {
  to: string[];
  subject: string;
  text: string;
  html: string;
};

const EMAIL_CHANNEL = NotificationChannel.EMAIL;
const EVENT_DOWN = NotificationType.MONITOR_DOWN;
const EVENT_RECOVERED = NotificationType.MONITOR_RECOVERED;
const STATUS_FAILED = NotificationStatus.FAILED;
const STATUS_SKIPPED = NotificationStatus.SKIPPED;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsQueueService: NotificationsQueueService,
  ) {}

  async notifyMonitorDown(
    payload: MonitorNotificationPayload,
    tx?: NotificationPrisma,
  ) {
    await this.enqueueMonitorAlert(EVENT_DOWN, payload, tx);
  }

  async notifyMonitorRecovered(
    payload: MonitorNotificationPayload,
    tx?: NotificationPrisma,
  ) {
    await this.enqueueMonitorAlert(EVENT_RECOVERED, payload, tx);
  }

  async notifyPasswordReset(payload: PasswordResetPayload) {
    await this.notificationsQueueService.enqueueEmail({
      kind: 'password-reset',
      email: this.buildPasswordResetMessage(payload),
      organizationId: payload.organizationId,
      requestedAt: new Date().toISOString(),
      userId: payload.userId,
    });
  }

  private async enqueueMonitorAlert(
    type: typeof EVENT_DOWN | typeof EVENT_RECOVERED,
    payload: MonitorNotificationPayload,
    tx?: NotificationPrisma,
  ) {
    const prisma = tx ?? this.prisma;
    const recipients = await this.getSectionRecipients(
      payload.organizationId,
      payload.monitorId,
      prisma,
    );

    const message = this.buildMonitorMessage(type, payload, recipients);
    const event = await this.createNotificationEvent(
      prisma,
      type,
      payload,
      message,
      recipients,
    );

    if (recipients.length === 0) {
      await this.markEvent(
        prisma,
        event.id,
        STATUS_SKIPPED,
        'Sin destinatarios',
      );
      return;
    }

    try {
      await this.notificationsQueueService.enqueueEmail({
        kind: 'monitor-alert',
        email: message,
        notificationEventId: event.id,
        requestedAt: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      await this.markEvent(prisma, event.id, STATUS_FAILED, errorMessage);
      this.logger.error(
        `Error encolando notificación ${type}: ${errorMessage}`,
      );
    }
  }

  private async getSectionRecipients(
    organizationId: number,
    monitorId: number,
    prisma: NotificationPrisma,
  ) {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        OR: [
          { role: { in: ['OWNER', 'ADMIN'] } },
          {
            sectionMemberships: {
              some: {
                section: {
                  monitors: { some: { monitorId } },
                },
              },
            },
          },
        ],
      },
      select: { email: true },
      orderBy: { id: 'asc' },
    });

    return users.map((user) => user.email).filter(Boolean);
  }

  private buildMonitorMessage(
    type: typeof EVENT_DOWN | typeof EVENT_RECOVERED,
    payload: MonitorNotificationPayload,
    recipients: string[],
  ): MailMessage {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Monitoring';
    const subjectPrefix =
      type === EVENT_DOWN ? 'Monitor caído' : 'Monitor recuperado';
    const subject = `[${appName}] ${subjectPrefix}: ${payload.monitorName}`;
    const statusLabel = type === EVENT_DOWN ? 'caído' : 'recuperado';
    const severity = payload.severity ? `\nSeveridad: ${payload.severity}` : '';
    const error = payload.errorMessage
      ? `\nError: ${payload.errorMessage}`
      : '';
    const timestamp = payload.resolvedAt ?? payload.startedAt ?? new Date();

    const text = [
      `${payload.monitorName} está ${statusLabel}.`,
      `URL: ${payload.monitorTarget}`,
      `Incidencia: ${payload.title}`,
      `Fecha: ${timestamp.toISOString()}`,
      severity.trim(),
      error.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">${this.escapeHtml(subjectPrefix)}</h2>
        <p><strong>${this.escapeHtml(payload.monitorName)}</strong> está <strong>${this.escapeHtml(statusLabel)}</strong>.</p>
        <p><strong>URL:</strong> <a href="${this.escapeHtml(payload.monitorTarget)}">${this.escapeHtml(payload.monitorTarget)}</a></p>
        <p><strong>Incidencia:</strong> ${this.escapeHtml(payload.title)}</p>
        ${payload.severity ? `<p><strong>Severidad:</strong> ${this.escapeHtml(payload.severity)}</p>` : ''}
        ${payload.errorMessage ? `<p><strong>Error:</strong> ${this.escapeHtml(payload.errorMessage)}</p>` : ''}
        <p><strong>Fecha:</strong> ${this.escapeHtml(timestamp.toISOString())}</p>
      </div>
    `;

    return { to: recipients, subject, text, html };
  }

  private buildPasswordResetMessage(payload: PasswordResetPayload): MailMessage {
    const appName = this.configService.get<string>('APP_NAME') ?? 'Monitoring';
    const subject = `[${appName}] Restablece tu contraseña`;
    const expiresAt = payload.expiresAt.toISOString();
    const text = [
      `Hola ${payload.name},`,
      'Hemos recibido una solicitud para restablecer tu contraseña.',
      `Abre este enlace: ${payload.resetUrl}`,
      `El enlace caduca en: ${expiresAt}`,
      'Si no has solicitado este cambio, puedes ignorar este email.',
    ].join('\n');
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">Restablece tu contraseña</h2>
        <p>Hola ${this.escapeHtml(payload.name)},</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        <p><a href="${this.escapeHtml(payload.resetUrl)}">Restablecer contraseña</a></p>
        <p><strong>Caduca:</strong> ${this.escapeHtml(expiresAt)}</p>
        <p>Si no has solicitado este cambio, puedes ignorar este email.</p>
      </div>
    `;

    return { to: [payload.email], subject, text, html };
  }

  private async createNotificationEvent(
    prisma: NotificationPrisma,
    type: NotificationType,
    payload: MonitorNotificationPayload,
    message: MailMessage,
    recipients: string[],
  ) {
    return prisma.notificationEvent.create({
      data: {
        monitorId: payload.monitorId,
        incidentId: payload.incidentId,
        type,
        channel: EMAIL_CHANNEL,
        status: 'PENDING',
        recipient: recipients.join(', '),
        subject: message.subject,
      },
    });
  }

  private async markEvent(
    prisma: NotificationPrisma,
    eventId: number,
    status: NotificationStatus,
    errorMessage?: string,
  ) {
    await prisma.notificationEvent.update({
      where: { id: eventId },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        sentAt: null,
      },
    });
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
