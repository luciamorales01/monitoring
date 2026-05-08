import { apiClient } from './apiClient';

export type PublicStatusResponse = {
  organization: { id: number; name: string; slug: string };
  generatedAt: string;
  overallStatus: 'OPERATIONAL' | 'PARTIAL' | 'DEGRADED';
  monitors: Array<{
    id: number;
    name: string;
    target: string;
    currentStatus: 'UP' | 'DOWN' | 'UNKNOWN';
    lastResponseTime?: number | null;
    lastCheckedAt?: string | null;
  }>;
  openIncidents: Array<{
    id: number;
    title: string;
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    startedAt: string;
    monitor?: { id: number; name: string };
  }>;
};

export const getPublicStatus = async (slug: string) =>
  apiClient<PublicStatusResponse>(`/status/public/${encodeURIComponent(slug)}`, { skipAuth: true });
