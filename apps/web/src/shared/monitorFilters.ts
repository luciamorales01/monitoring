import type { Monitor, MonitorType } from './monitorApi';
import { getUniqueOptions, matchesSearchTerm, normalizeSearchTerm } from './filterUtils';

export type MonitorViewStatus = 'UP' | 'DOWN' | 'PAUSED' | 'UNKNOWN';
export type MonitorStatusFilter = 'ALL' | MonitorViewStatus;
export type MonitorTypeFilter = 'ALL' | MonitorType;
export type MonitorSortOption = 'status' | 'name' | 'latest-check';

export type MonitorListFilters = {
  location: string;
  search: string;
  status: MonitorStatusFilter;
  type: MonitorTypeFilter;
};

const monitorStatusPriority: Record<MonitorViewStatus, number> = {
  DOWN: 0,
  PAUSED: 1,
  UNKNOWN: 2,
  UP: 3,
};

export function getMonitorViewStatus(monitor: Monitor): MonitorViewStatus {
  if (!monitor.isActive) {
    return 'PAUSED';
  }

  return monitor.currentStatus ?? 'UNKNOWN';
}

export function getMonitorLocations(monitor: Monitor) {
  return monitor.locations.length > 0 ? monitor.locations : ['default'];
}

export function getMonitorLocationOptions(monitors: Monitor[]) {
  return getUniqueOptions(
    monitors.flatMap((monitor) => getMonitorLocations(monitor)),
  );
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
    const matchesLocation =
      filters.location === 'ALL' ||
      getMonitorLocations(monitor).includes(filters.location);

    return (
      matchesSearchTerm(searchTerm, monitor.name, monitor.target) &&
      matchesStatus &&
      matchesType &&
      matchesLocation
    );
  });
}

export function sortMonitors(
  monitors: Monitor[],
  sortBy: MonitorSortOption = 'status',
) {
  return [...monitors].sort((firstMonitor, secondMonitor) => {
    if (sortBy === 'name') {
      return firstMonitor.name.localeCompare(secondMonitor.name);
    }

    if (sortBy === 'latest-check') {
      const firstCheckedAt = firstMonitor.lastCheckedAt
        ? new Date(firstMonitor.lastCheckedAt).getTime()
        : 0;
      const secondCheckedAt = secondMonitor.lastCheckedAt
        ? new Date(secondMonitor.lastCheckedAt).getTime()
        : 0;

      if (firstCheckedAt !== secondCheckedAt) {
        return secondCheckedAt - firstCheckedAt;
      }
    }

    const firstPriority = monitorStatusPriority[getMonitorViewStatus(firstMonitor)];
    const secondPriority = monitorStatusPriority[getMonitorViewStatus(secondMonitor)];

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    return firstMonitor.name.localeCompare(secondMonitor.name);
  });
}
