import { apiClient } from './apiClient';

export type MonitorType = 'HTTPS' | 'HTTP';
export type MonitorStatus = 'UP' | 'DOWN' | 'UNKNOWN';

export type Monitor = {
  id: number;
  name: string;
  type: MonitorType;
  target: string;
  expectedStatusCode: number;
  frequencySeconds: number;
  timeoutSeconds: number;
  currentStatus: MonitorStatus;
  lastResponseTime?: number | null;
  lastCheckedAt?: string | null;
  nextCheckAt?: string;
  isActive: boolean;
  locations: string[];
  alertEmail: boolean;
  alertPush: boolean;
  alertThreshold: number;
};

export type MonitorCheck = {
  id: number;
  monitorId: number;
  status: MonitorStatus;
  responseTimeMs: number | null;
  statusCode: number | null;
  errorMessage: string | null;
  location?: string | null;
  checkedAt: string;
};

export type CreateMonitorInput = {
  name: string;
  type: MonitorType;
  target: string;
  expectedStatusCode: number;
  frequencySeconds: number;
  timeoutSeconds: number;
  locations: string[];
  alertEmail: boolean;
  alertPush: boolean;
  alertThreshold: number;
};

export type UpdateMonitorInput = CreateMonitorInput;

export const getMonitors = async () => {
  return apiClient<Monitor[]>('/monitors');
};

export const createMonitor = async (data: CreateMonitorInput) => {
  return apiClient<Monitor>('/monitors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateMonitor = async (id: number, data: UpdateMonitorInput) => {
  return apiClient<Monitor>(`/monitors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteMonitor = async (id: number) => {
  return apiClient<Monitor>(`/monitors/${id}`, {
    method: 'DELETE',
  });
};

export const runMonitorCheck = async (id: number) => {
  return apiClient(`/monitors/${id}/run-check`, {
    method: 'POST',
  });
};

export const toggleMonitorActive = async (id: number) => {
  return apiClient<Monitor>(`/monitors/${id}/toggle-active`, {
    method: 'PATCH',
  });
};

export const getMonitor = async (id: number) => {
  return apiClient<Monitor>(`/monitors/${id}`);
};

export const getMonitorChecks = async (
  id: number,
  order: 'asc' | 'desc' = 'desc',
) => {
  return apiClient<MonitorCheck[]>(`/monitors/${id}/checks?order=${order}`);
};
