import { apiClient } from './apiClient';
import type { MonitorSection } from './sectionsStore';

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
  usesSectionSchedule?: boolean;
  alertEmail: boolean;
  alertThreshold: number;
  sections: MonitorSection[];
};

type RawMonitorSection = MonitorSection | { section: MonitorSection };
export type RawMonitor = Omit<Monitor, 'sections'> & {
  sections?: RawMonitorSection[];
};

export type MonitorCheck = {
  id: number;
  monitorId: number;
  status: MonitorStatus;
  responseTimeMs: number | null;
  statusCode: number | null;
  errorMessage: string | null;
  checkedAt: string;
};

export type PaginatedMonitors = {
  items: Monitor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type RawPaginatedMonitors = Omit<PaginatedMonitors, 'items'> & {
  items: RawMonitor[];
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
};

export type CreateMonitorInput = {
  name: string;
  type: MonitorType;
  target: string;
  expectedStatusCode: number;
  frequencySeconds: number;
  timeoutSeconds: number;
  alertEmail: boolean;
  alertThreshold: number;
};

export type UpdateMonitorInput = CreateMonitorInput;

const MONITOR_LIST_FETCH_LIMIT = 100;

function normalizeMonitorSections(
  sections: RawMonitorSection[] | undefined,
): MonitorSection[] {
  if (!sections) {
    return [];
  }

  const seenSectionIds = new Set<string>();
  const nextSections: MonitorSection[] = [];

  for (const entry of sections) {
    const section = 'section' in entry ? entry.section : entry;
    const sectionId = String(section.id);

    if (seenSectionIds.has(sectionId)) {
      continue;
    }

    seenSectionIds.add(sectionId);
    nextSections.push(section);
  }

  return nextSections;
}

export function normalizeMonitor(monitor: RawMonitor): Monitor {
  return {
    ...monitor,
    sections: normalizeMonitorSections(monitor.sections),
  };
}

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
  const page = await apiClient<RawPaginatedMonitors>(buildMonitorListPath(query), { signal });
  return {
    ...page,
    items: page.items.map(normalizeMonitor),
  };
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
  const monitor = await apiClient<RawMonitor>('/monitors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return normalizeMonitor(monitor);
};

export const updateMonitor = async (id: number, data: UpdateMonitorInput) => {
  const monitor = await apiClient<RawMonitor>(`/monitors/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return normalizeMonitor(monitor);
};

export const useSectionSchedule = async (id: number) => {
  const monitor = await apiClient<RawMonitor>(`/monitors/${encodeURIComponent(String(id))}/use-section-schedule`, {
    method: 'PATCH',
  });
  return normalizeMonitor(monitor);
};

export const deleteMonitor = async (id: number) => {
  const monitor = await apiClient<RawMonitor>(`/monitors/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
  return normalizeMonitor(monitor);
};

export const runMonitorCheck = async (id: number) => {
  return apiClient(`/monitors/${encodeURIComponent(String(id))}/run-check`, {
    method: 'POST',
  });
};

export const toggleMonitorActive = async (id: number) => {
  const monitor = await apiClient<RawMonitor>(`/monitors/${encodeURIComponent(String(id))}/toggle-active`, {
    method: 'PATCH',
  });
  return normalizeMonitor(monitor);
};

export const getMonitor = async (id: number) => {
  const monitor = await apiClient<RawMonitor>(`/monitors/${encodeURIComponent(String(id))}`);
  return normalizeMonitor(monitor);
};

export const getMonitorChecks = async (
  id: number,
  order: 'asc' | 'desc' = 'desc',
) => {
  return apiClient<MonitorCheck[]>(`/monitors/${encodeURIComponent(String(id))}/checks?order=${encodeURIComponent(order)}`);
};
