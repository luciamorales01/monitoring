import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import nodemailer from 'nodemailer';
import { PrismaService } from '../../database/prisma/prisma.service';

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

type MailMessage = {
  to: string[];
  subject: string;
  text: string;
  html: string;
};

const EMAIL_CHANNEL = NotificationChannel.EMAIL;
const EVENT_DOWN = NotificationType.MONITOR_DOWN;
const EVENT_RECOVERED = NotificationType.MONITOR_RECOVERED;
const STATUS_SENT = NotificationStatus.SENT;
const STATUS_FAILED = NotificationStatus.FAILED;
const STATUS_SKIPPED = NotificationStatus.SKIPPED;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async notifyMonitorDown(
    payload: MonitorNotificationPayload,
    tx?: NotificationPrisma,
  ) {
    await this.sendMonitorAlert(EVENT_DOWN, payload, tx);
  }

  async notifyMonitorRecovered(
    payload: MonitorNotificationPayload,
    tx?: NotificationPrisma,
  ) {
    await this.sendMonitorAlert(EVENT_RECOVERED, payload, tx);
  }

  private async sendMonitorAlert(
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

    const message = this.buildMessage(type, payload, recipients);
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
        event?.id,
        STATUS_SKIPPED,
        'Sin destinatarios',
      );
      return;
    }

    if (!this.isSmtpConfigured()) {
      await this.markEvent(
        prisma,
        event?.id,
        STATUS_SKIPPED,
        'SMTP no configurado',
      );
      this.logger.warn(
        `Notificación ${type} omitida: faltan variables SMTP_HOST, SMTP_USER o SMTP_PASS`,
      );
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });

      await transporter.sendMail({
        from:
          this.configService.get<string>('SMTP_FROM') ??
          this.configService.get<string>('SMTP_USER'),
        to: message.to.join(', '),
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      await this.markEvent(prisma, event?.id, STATUS_SENT);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      await this.markEvent(prisma, event?.id, STATUS_FAILED, message);
      this.logger.error(`Error enviando notificación ${type}: ${message}`);
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
      select: { email: true, name: true },
      orderBy: { id: 'asc' },
    });

    return users.map((user) => user.email).filter(Boolean);
  }

  private buildMessage(
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
    eventId: number | undefined,
    status: NotificationStatus,
    errorMessage?: string,
  ) {
    if (!eventId) return;

    await prisma.notificationEvent.update({
      where: { id: eventId },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        sentAt: status === STATUS_SENT ? new Date() : null,
      },
    });
  }

  private isSmtpConfigured() {
    return Boolean(
      this.configService.get<string>('SMTP_HOST') &&
      this.configService.get<string>('SMTP_USER') &&
      this.configService.get<string>('SMTP_PASS'),
    );
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
