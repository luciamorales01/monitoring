import { apiClient } from './apiClient';

export type PublicStatusResponse = {
  organization: { id: number; name: string; slug: string };
  generatedAt: string;
  window: {
    days: number;
    startedAt: string;
    endedAt: string;
  };
  overallStatus: 'OPERATIONAL' | 'PARTIAL' | 'DEGRADED';
  summary: {
    totalMonitors: number;
    operationalMonitors: number;
    degradedMonitors: number;
    unknownMonitors: number;
    activeIncidents: number;
    incidentsLast30d: number;
    checksLast30d: number;
    uptimeLast30d: number | null;
    avgResponseTimeMs: number | null;
    downtimeMinutesLast30d: number;
  };
  monitors: Array<{
    id: number;
    name: string;
    target: string;
    currentStatus: 'UP' | 'DOWN' | 'UNKNOWN';
    lastResponseTime?: number | null;
    lastCheckedAt?: string | null;
    sla: {
      uptimePercentage: number | null;
      checks: number;
      avgResponseTimeMs: number | null;
    };
    history: Array<{
      date: string;
      uptimePercentage: number | null;
      checks: number;
    }>;
  }>;
  openIncidents: PublicIncident[];
  recentIncidents: PublicIncident[];
};

export type PublicIncident = {
  id: number;
  title: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  startedAt: string;
  resolvedAt?: string | null;
  durationSeconds?: number | null;
  monitor?: { id: number; name: string };
};

export const getPublicStatus = async (slug: string) =>
  apiClient<PublicStatusResponse>(`/status/public/${encodeURIComponent(slug)}`, { skipAuth: true });
