import type { Incident } from '../../shared/incidentApi';
import type { IncidentFilterStatus, IncidentSeverity } from './IncidentsPage.types';

export function getIncidentViewStatus(incident: Incident): IncidentFilterStatus {
  if (incident.status === 'RESOLVED') return 'RESOLVED';
  if (incident.status === 'ACKNOWLEDGED') return 'ACKNOWLEDGED';

  return getIncidentDurationSeconds(incident) >= 30 * 60 ? 'INVESTIGATING' : 'OPEN';
}

export function getIncidentSeverity(incident: Incident): IncidentSeverity {
  if (incident.severity) return incident.severity;

  const durationSeconds = getIncidentDurationSeconds(incident);

  if (durationSeconds >= 4 * 60 * 60) return 'CRITICAL';
  if (durationSeconds >= 60 * 60) return 'HIGH';
  if (durationSeconds >= 15 * 60) return 'MEDIUM';
  return 'LOW';
}

export function getIncidentDurationSeconds(incident: Incident) {
  if (typeof incident.durationSeconds === 'number' && incident.durationSeconds > 0) {
    return incident.durationSeconds;
  }

  const startedAt = new Date(incident.startedAt).getTime();
  const finishedAt = incident.resolvedAt
    ? new Date(incident.resolvedAt).getTime()
    : Date.now();

  if (Number.isNaN(startedAt) || Number.isNaN(finishedAt)) {
    return 0;
  }

  return Math.max(0, Math.round((finishedAt - startedAt) / 1000));
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds?: number | null) {
  if (!seconds) return '-';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatAverageResolution(resolvedIncidents: Incident[]) {
  if (resolvedIncidents.length === 0) return '—';

  const totalDuration = resolvedIncidents.reduce(
    (sum, incident) => sum + getIncidentDurationSeconds(incident),
    0,
  );

  return formatDuration(Math.round(totalDuration / resolvedIncidents.length));
}

export function getSeverityLabel(severity: IncidentSeverity) {
  const labels: Record<IncidentSeverity, string> = {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    CRITICAL: 'Crítica',
  };

  return labels[severity];
}

export function formatNotificationDate(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return 'ahora';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
