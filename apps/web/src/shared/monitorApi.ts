import { apiClient } from './apiClient';

export type MonitorType = 'HTTPS' | 'HTTP' | 'SSL' | 'TCP' | 'DNS';
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
  usesSectionSchedule?: boolean;
  locations: string[];
  alertEmail: boolean;
  alertPush: boolean;
  alertThreshold: number;
  tcpPort?: number | null;
  keyword?: string | null;
  sslWarningDays?: number | null;
  dnsRecordType?: string | null;
  dnsExpectedValue?: string | null;
  sections?: {
    section: {
      id: number;
      name: string;
      expectedStatusCode: number;
      frequencySeconds: number;
      timeoutSeconds: number;
      locations: string[];
      isActive: boolean;
    };
  }[];
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

export type PaginatedMonitors = {
  items: Monitor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type MonitorSortOption = 'status' | 'name' | 'latest-check' | 'created-at';
export type MonitorViewStatusFilter = 'ALL' | 'UP' | 'DOWN' | 'PAUSED' | 'UNKNOWN';

export type MonitorListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: MonitorSortOption;
  status?: MonitorViewStatusFilter;
  type?: 'ALL' | MonitorType;
  location?: string;
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
  tcpPort?: number | null;
  keyword?: string | null;
  sslWarningDays?: number | null;
  dnsRecordType?: string | null;
  dnsExpectedValue?: string | null;
};

export type UpdateMonitorInput = CreateMonitorInput;

const MONITOR_LIST_FETCH_LIMIT = 100;

function buildMonitorListPath(query: MonitorListQuery = {}) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === '' || rawValue === 'ALL') {
      continue;
    }

    params.set(key, String(rawValue));
  }

  const queryString = params.toString();
  return `/monitors${queryString ? `?${queryString}` : ''}`;
}

export const getPaginatedMonitors = async (
  query: MonitorListQuery = {},
  signal?: AbortSignal,
) => {
  return apiClient<PaginatedMonitors>(buildMonitorListPath(query), { signal });
};

export const getMonitors = async () => {
  const firstPage = await getPaginatedMonitors({
    limit: MONITOR_LIST_FETCH_LIMIT,
    page: 1,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      getPaginatedMonitors({
        limit: MONITOR_LIST_FETCH_LIMIT,
        page: index + 2,
      }),
    ),
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((page) => page.items),
  ];
};

export const createMonitor = async (data: CreateMonitorInput) => {
  return apiClient<Monitor>('/monitors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateMonitor = async (id: number, data: UpdateMonitorInput) => {
  return apiClient<Monitor>(`/monitors/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const useSectionSchedule = async (id: number) => {
  return apiClient<Monitor>(`/monitors/${encodeURIComponent(String(id))}/use-section-schedule`, {
    method: 'PATCH',
  });
};

export const deleteMonitor = async (id: number) => {
  return apiClient<Monitor>(`/monitors/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
};

export const runMonitorCheck = async (id: number) => {
  return apiClient(`/monitors/${encodeURIComponent(String(id))}/run-check`, {
    method: 'POST',
  });
};

export const toggleMonitorActive = async (id: number) => {
  return apiClient<Monitor>(`/monitors/${encodeURIComponent(String(id))}/toggle-active`, {
    method: 'PATCH',
  });
};

export const getMonitor = async (id: number) => {
  return apiClient<Monitor>(`/monitors/${encodeURIComponent(String(id))}`);
};

export const getMonitorChecks = async (
  id: number,
  order: 'asc' | 'desc' = 'desc',
) => {
  return apiClient<MonitorCheck[]>(`/monitors/${encodeURIComponent(String(id))}/checks?order=${encodeURIComponent(order)}`);
};
