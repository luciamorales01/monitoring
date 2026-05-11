import type { Monitor, MonitorType } from './monitorApi';
import { matchesSearchTerm, normalizeSearchTerm } from './filterUtils';

export type MonitorViewStatus = 'UP' | 'DOWN' | 'PAUSED' | 'UNKNOWN';
export type MonitorStatusFilter = 'ALL' | MonitorViewStatus;
export type MonitorTypeFilter = 'ALL' | MonitorType;
export type MonitorSortOption = 'status' | 'name' | 'latest-check';

export type MonitorListFilters = {
  search: string;
  status: MonitorStatusFilter;
  type: MonitorTypeFilter;
};

type MonitorSortStatus =
  | MonitorViewStatus
  | 'ERROR'
  | 'INCIDENT'
  | 'PENDING'
  | string;

type MonitorSortableFields = {
  id?: number | string | null;
  name?: string | null;
  currentStatus?: MonitorSortStatus | null;
  status?: MonitorSortStatus | null;
  isActive?: boolean | null;
  lastCheckAt?: string | null;
  lastCheckedAt?: string | null;
  checkedAt?: string | null;
  updatedAt?: string | null;
};

type MonitorSortAccessors<TItem> = {
  getId?: (item: TItem) => number | string | null | undefined;
  getLastCheckAt?: (item: TItem) => string | null | undefined;
  getName?: (item: TItem) => string | null | undefined;
  getStatus?: (item: TItem) => MonitorSortStatus | null | undefined;
  isPaused?: (item: TItem) => boolean;
};

const monitorStatusPriority: Record<MonitorViewStatus | 'ERROR' | 'INCIDENT' | 'PENDING', number> = {
  DOWN: 0,
  ERROR: 0,
  INCIDENT: 0,
  UP: 1,
  PENDING: 2,
  UNKNOWN: 2,
  PAUSED: 3,
};

function getSortableFields<TItem>(item: TItem): MonitorSortableFields {
  if (typeof item !== 'object' || item === null) {
    return {};
  }

  return item as MonitorSortableFields;
}

function normalizeMonitorStatus(status: MonitorSortStatus | null | undefined): MonitorViewStatus | 'ERROR' | 'INCIDENT' | 'PENDING' {
  const normalizedStatus = String(status ?? 'UNKNOWN').toUpperCase();

  if (
    normalizedStatus === 'DOWN' ||
    normalizedStatus === 'ERROR' ||
    normalizedStatus === 'INCIDENT' ||
    normalizedStatus === 'UP' ||
    normalizedStatus === 'PENDING' ||
    normalizedStatus === 'UNKNOWN' ||
    normalizedStatus === 'PAUSED'
  ) {
    return normalizedStatus;
  }

  return 'UNKNOWN';
}

function getMonitorSortStatus<TItem>(
  item: TItem,
  accessors: MonitorSortAccessors<TItem>,
) {
  const fields = getSortableFields(item);

  if (accessors.isPaused?.(item) ?? fields.isActive === false) {
    return 'PAUSED';
  }

  return normalizeMonitorStatus(
    accessors.getStatus?.(item) ?? fields.currentStatus ?? fields.status,
  );
}

function getMonitorSortTimestamp<TItem>(
  item: TItem,
  accessors: MonitorSortAccessors<TItem>,
) {
  const fields = getSortableFields(item);
  const dateValue =
    accessors.getLastCheckAt?.(item) ??
    fields.lastCheckAt ??
    fields.lastCheckedAt ??
    fields.checkedAt ??
    fields.updatedAt;

  if (!dateValue) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(dateValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function getMonitorSortName<TItem>(
  item: TItem,
  accessors: MonitorSortAccessors<TItem>,
) {
  const fields = getSortableFields(item);
  return accessors.getName?.(item) ?? fields.name ?? '';
}

function getMonitorSortId<TItem>(
  item: TItem,
  accessors: MonitorSortAccessors<TItem>,
) {
  const fields = getSortableFields(item);
  return String(accessors.getId?.(item) ?? fields.id ?? '');
}

export function getMonitorViewStatus(monitor: Monitor): MonitorViewStatus {
  if (!monitor.isActive) {
    return 'PAUSED';
  }

  return monitor.currentStatus ?? 'UNKNOWN';
}

export function filterMonitors(
  monitors: Monitor[],
  filters: MonitorListFilters,
) {
  const searchTerm = normalizeSearchTerm(filters.search);

  return monitors.filter((monitor) => {
    const viewStatus = getMonitorViewStatus(monitor);

    const matchesStatus =
      filters.status === 'ALL' || viewStatus === filters.status;
    const matchesType = filters.type === 'ALL' || monitor.type === filters.type;

    return (
      matchesSearchTerm(searchTerm, monitor.name, monitor.target) &&
      matchesStatus &&
      matchesType
    );
  });
}

export function sortMonitors(
  monitors: Monitor[],
  sortBy: MonitorSortOption = 'status',
) {
  if (sortBy === 'name' || sortBy === 'latest-check') {
    return sortMonitorsByStatusAndLastCheck(monitors);
  }

  return sortMonitorsByStatusAndLastCheck(monitors);
}

export function sortMonitorsByStatusAndLastCheck<TItem>(
  items: TItem[],
  accessors: MonitorSortAccessors<TItem> = {},
) {
  return [...items].sort((firstItem, secondItem) => {
    const firstPriority = monitorStatusPriority[getMonitorSortStatus(firstItem, accessors)];
    const secondPriority = monitorStatusPriority[getMonitorSortStatus(secondItem, accessors)];

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    const firstTimestamp = getMonitorSortTimestamp(firstItem, accessors);
    const secondTimestamp = getMonitorSortTimestamp(secondItem, accessors);

    if (firstTimestamp !== secondTimestamp) {
      return secondTimestamp - firstTimestamp;
    }

    const nameComparison = getMonitorSortName(firstItem, accessors).localeCompare(
      getMonitorSortName(secondItem, accessors),
    );

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return getMonitorSortId(firstItem, accessors).localeCompare(
      getMonitorSortId(secondItem, accessors),
    );
  });
}
