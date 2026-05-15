import { apiClient } from './apiClient';

export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Incident = {
  id: number;
  title: string;
  status: IncidentStatus;
  severity?: IncidentSeverity;
  startedAt: string;
  acknowledgedAt?: string | null;
  acknowledgedById?: number | null;
  resolvedAt?: string | null;
  resolvedById?: number | null;
  durationSeconds?: number | null;
  resolutionNote?: string | null;
  rootCause?: string | null;
  lastStatusChangeAt?: string | null;
  monitor?: {
    id: number;
    name: string;
    target: string;
  };
};

export const getIncidents = async () => apiClient<Incident[]>('/incidents');
export const getActiveIncidents = async () => apiClient<Incident[]>('/incidents/active');
export const getIncident = async (id: number) => apiClient<Incident>(`/incidents/${encodeURIComponent(String(id))}`);

export const acknowledgeIncident = async (id: number) =>
  apiClient<Incident>(`/incidents/${encodeURIComponent(String(id))}/acknowledge`, { method: 'PATCH' });

export const resolveIncident = async (id: number, payload: { resolutionNote?: string; rootCause?: string } = {}) =>
  apiClient<Incident>(`/incidents/${encodeURIComponent(String(id))}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const updateIncidentSeverity = async (id: number, severity: IncidentSeverity) =>
  apiClient<Incident>(`/incidents/${encodeURIComponent(String(id))}/severity`, {
    method: 'PATCH',
    body: JSON.stringify({ severity }),
  });
