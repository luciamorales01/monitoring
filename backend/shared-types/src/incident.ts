export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface Incident {
  id: number;
  monitorId: number;
  title: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string | null;
}