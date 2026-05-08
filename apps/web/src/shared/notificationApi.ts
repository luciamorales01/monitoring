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

export function getNotifications() {
  return apiClient<NotificationEvent[]>('/notifications');
}
