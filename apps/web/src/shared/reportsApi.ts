import { appEnv } from './env';
import { apiClient } from './apiClient';
import type { MonitorStatus, MonitorType } from './monitorApi';
import { tokenStorage } from './tokenStorage';

export type ReportRange = '24h' | '7d' | '30d';
export type ReportFormat = 'csv' | 'pdf' | 'xlsx';

export type ReportRow = {
  monitor: {
    id: number;
    name: string;
    target: string;
    type?: MonitorType | string;
    currentStatus: MonitorStatus;
    isActive: boolean;
  };
  uptimePercent: number;
  slaPercent?: number;
  averageResponseTimeMs: number;
  incidents: number;
  openIncidents: number;
  checks: number;
  downChecks?: number;
  estimatedDowntimeSeconds?: number;
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
    estimatedDowntimeSeconds?: number;
  };
  rows: ReportRow[];
};

function buildReportsQuery(range: ReportRange, monitorId?: number | string | null) {
  const params = new URLSearchParams({ range });
  if (monitorId && monitorId !== 'all') {
    params.set('monitorId', String(monitorId));
  }
  return params.toString();
}

export const getReportsSummary = async (
  range: ReportRange,
  monitorId?: number | string | null,
) => {
  return apiClient<ReportsSummary>(`/reports/summary?${buildReportsQuery(range, monitorId)}`);
};

export async function downloadReportExport(
  range: ReportRange,
  format: ReportFormat,
  monitorId?: number | string | null,
) {
  const token = tokenStorage.get();
  const params = new URLSearchParams({ range, format });
  if (monitorId && monitorId !== 'all') {
    params.set('monitorId', String(monitorId));
  }

  const response = await fetch(`${appEnv.apiUrl}/reports/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error('No se pudo exportar el informe.');
  }

  const contentDisposition = response.headers.get('content-disposition');
  const filename =
    contentDisposition?.match(/filename="?([^";]+)"?/)?.[1] ??
    `informe-monitoring-${range}.${format}`;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

