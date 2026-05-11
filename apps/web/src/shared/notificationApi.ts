import { apiClient } from './apiClient';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
export type NotificationType = 'MONITOR_DOWN' | 'MONITOR_RECOVERED';

export type NotificationEvent = {
  id: number;
  monitorId: number;
  incidentId?: number | null;
  type: NotificationType;
  channel: 'EMAIL';
  status: NotificationStatus;
  recipient?: string | null;
  subject?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  monitor?: {
    id: number;
    name: string;
    target: string;
  };
  incident?: {
    id: number;
    status: string;
    severity?: string | null;
    title: string;
  } | null;
};

export type NotificationUpdateResult = { updated: number };

export function getNotifications(options?: { limit?: number; unreadOnly?: boolean }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  const query = params.toString();
  return apiClient<NotificationEvent[]>(`/notifications${query ? `?${query}` : ''}`);
}

export function markNotificationsAsRead(ids: number[]) {
  return apiClient<NotificationUpdateResult>('/notifications/read', {
    method: 'PATCH',
    body: JSON.stringify({ ids }),
  });
}

export function markAllNotificationsAsRead() {
  return apiClient<NotificationUpdateResult>('/notifications/read-all', {
    method: 'POST',
  });
}
