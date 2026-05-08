import { apiClient } from './apiClient';
import type { MonitorStatus } from './monitorApi';

export type ReportRange = '24h' | '7d' | '30d';

export type ReportRow = {
  monitor: {
    id: number;
    name: string;
    target: string;
    currentStatus: MonitorStatus;
    isActive: boolean;
  };
  uptimePercent: number;
  averageResponseTimeMs: number;
  incidents: number;
  openIncidents: number;
  checks: number;
  lastDowntime: string | null;
};

export type ReportsSummary = {
  range: ReportRange;
  from: string;
  to: string;
  totals: {
    averageUptimePercent: number;
    averageResponseTimeMs: number;
    incidents: number;
    checks: number;
    monitors: number;
  };
  rows: ReportRow[];
};

export const getReportsSummary = async (range: ReportRange) => {
  return apiClient<ReportsSummary>(`/reports/summary?range=${encodeURIComponent(range)}`);
};
