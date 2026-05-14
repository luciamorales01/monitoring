import type { ReportFormat } from "../../../shared/reportsApi";

export type PeriodFilter = "1h" | "24h" | "7d" | "30d" | "all";

export type Tone = "green" | "blue" | "orange" | "red" | "slate";

export type MonitorSummaryStats = {
  availability: string;
  averageResponseTime: string;
  totalChecks: number;
  failures: number;
  lastCheck: string;
  lastCheckRelative: string;
};

export type MonitorFilteredStats = {
  total: number;
  up: number;
  down: number;
  unknown: number;
  average: number | null;
  p95: number | null;
  max: number | null;
  min: number | null;
  uptime: string;
};

export type MonitorActionState = {
  checking: boolean;
  toggling: boolean;
};

export type MonitorExportState = {
  exportingFormat: ReportFormat | null;
};
