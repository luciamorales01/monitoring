import { toneStyles, uiTheme } from "../../../theme/commonStyles";
import type { MonitorCheck, MonitorStatus } from "../../../shared/monitorApi";
import type { PeriodFilter, Tone } from "./monitorDetailTypes";

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return "Sin checks";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "Ahora mismo";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} días`;
}

export function formatDuration(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

export function getStatusLabel(status: MonitorStatus) {
  if (status === "UP") return "Operativo";
  if (status === "DOWN") return "Caído";
  return "Pendiente";
}

export function getStatusColor(status: MonitorStatus) {
  if (status === "UP") return uiTheme.colors.success;
  if (status === "DOWN") return "#dc2626";
  return uiTheme.colors.slate;
}

export function getStatusSoftBackground(status: MonitorStatus) {
  if (status === "UP") return toneStyles.green.background;
  if (status === "DOWN") return toneStyles.red.background;
  return toneStyles.slate.background;
}

export function getToneColor(tone: Tone) {
  const colors: Record<Tone, string> = {
    green: uiTheme.colors.success,
    blue: uiTheme.colors.primary,
    orange: uiTheme.colors.warning,
    red: "#dc2626",
    slate: uiTheme.colors.text,
  };

  return colors[tone];
}

export function getToneBorder(tone: Tone) {
  const colors: Record<Tone, string> = {
    green: "rgba(22, 163, 74, 0.22)",
    blue: "rgba(37, 99, 235, 0.22)",
    orange: "rgba(245, 158, 11, 0.24)",
    red: "rgba(220, 38, 38, 0.24)",
    slate: "rgba(148, 163, 184, 0.22)",
  };

  return colors[tone];
}

export function getResponseTimes(checks: MonitorCheck[]) {
  return checks
    .map((check) => check.responseTimeMs)
    .filter((value): value is number => value !== null);
}

export function getAverage(values: number[]) {
  if (values.length === 0) return null;

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

export function getPercentile(values: number[], percentile: number) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

export function getPeriodMs(period: PeriodFilter) {
  const hour = 60 * 60 * 1000;

  const periods: Record<PeriodFilter, number> = {
    "1h": hour,
    "24h": 24 * hour,
    "7d": 7 * 24 * hour,
    "30d": 30 * 24 * hour,
    all: Number.POSITIVE_INFINITY,
  };

  return periods[period];
}
