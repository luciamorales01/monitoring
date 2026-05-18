import {
  IncidentSeverity,
  IncidentStatus,
  MonitorStatus,
  MonitorType,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/monitor-access-scope';

export type ReportRange = '24h' | '7d' | '30d';
export type ReportFormat = 'csv' | 'pdf' | 'xlsx';

export type ExportReportParams = {
  user: AuthenticatedUser;
  range: ReportRange;
  format: ReportFormat;
  monitorId?: number;
  sectionId?: number;
};

export type ReportMonitorInput = {
  id: number;
  name: string;
  target: string;
  type: MonitorType;
  currentStatus: MonitorStatus;
  isActive: boolean;
  lastResponseTime: number | null;
  checkResults: ReportCheckInput[];
  incidents: ReportIncidentInput[];
};

export type ReportCheckInput = {
  status: MonitorStatus;
  responseTimeMs: number | null;
  checkedAt: Date;
};

export type ReportIncidentInput = {
  id: number;
  monitorId: number;
  status: IncidentStatus;
  severity?: IncidentSeverity;
  title?: string;
  startedAt: Date;
  resolvedAt: Date | null;
  durationSeconds?: number | null;
};

export type ReportRow = {
  monitor: {
    id: number;
    name: string;
    target: string;
    type?: string;
    currentStatus: string;
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

export type ReportTotals = {
  averageUptimePercent: number;
  averageResponseTimeMs: number;
  incidents: number;
  checks: number;
  monitors: number;
  estimatedDowntimeSeconds: number;
};

export type ReportSummary = {
  range: ReportRange;
  from: string;
  to: string;
  selectedMonitorId: number | null;
  selectedSectionId: number | null;
  totals: ReportTotals;
  rows: ReportRow[];
};

export type ReportIncidentRow = {
  id: number;
  monitorId: number;
  monitorName: string;
  status: string;
  severity: string | null;
  title: string;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number | null;
};

export type ReportDataset = {
  summary: ReportSummary;
  incidents: ReportIncidentRow[];
  scopeName: string | null;
};

export type ReportFile = {
  filename: string;
  contentType: string;
  buffer: Buffer;
};

export type ReportExportContext = {
  dataset: ReportDataset;
  filenameSuffix: string;
};
