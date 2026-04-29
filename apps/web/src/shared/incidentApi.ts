import { apiClient } from './apiClient';

export type IncidentStatus = 'OPEN' | 'RESOLVED';

export type Incident = {
  id: number;
  title: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string | null;
  durationSeconds?: number | null;
  monitor?: {
    id: number;
    name: string;
    target: string;
  };
};

export const getIncidents = async () => {
  return apiClient<Incident[]>('/incidents');
};

export const getActiveIncidents = async () => {
  return apiClient<Incident[]>('/incidents/active');
};

export const getIncident = async (id: number) => {
  return apiClient<Incident>(`/incidents/${id}`);
};
