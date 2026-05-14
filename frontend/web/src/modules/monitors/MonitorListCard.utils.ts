import type { MonitorViewStatus } from "../../shared/monitorFilters";

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function getUptimeLabel(status: MonitorViewStatus) {
  if (status === "PAUSED") return "Pausada";
  if (status === "UNKNOWN") return "—";
  return "Último estado";
}

export function formatResponseTime(value?: number | null) {
  return typeof value === "number" ? `${value} ms` : "—";
}

export function formatRelativeDate(value?: string | null) {
  if (!value) return "—";

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) return "—";

  const diffMinutes = Math.round((Date.now() - timestamp) / 60000);

  if (diffMinutes <= 1) return "Hace 1 min";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) return `Hace ${diffHours} h`;

  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getVisiblePageNumbers(page: number, totalPages: number) {
  const maxVisiblePages = 5;
  const halfWindow = Math.floor(maxVisiblePages / 2);
  const startPage = Math.max(
    1,
    Math.min(page - halfWindow, totalPages - maxVisiblePages + 1),
  );
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
}
