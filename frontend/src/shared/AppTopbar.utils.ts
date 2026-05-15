import type { NotificationEvent } from './notificationApi';

export const topbarNotificationTypeLabels: Record<
  NotificationEvent['type'],
  string
> = {
  MONITOR_DOWN: 'Monitor caído',
  MONITOR_RECOVERED: 'Monitor recuperado',
};

export function formatTopbarRelativeDate(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return 'ahora';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) return `hace ${diffHours} h`;

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
