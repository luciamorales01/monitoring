import { apiClient } from './apiClient';

export type DashboardSummary = {
  totalMonitors: number;
  activeMonitors: number;
  onlineMonitors: number;
  downMonitors: number;
  pausedMonitors: number;
  openIncidents: number;
  uptimePercent: number;
  averageResponseTimeMs: number;
  generatedAt: string;
};

export const getDashboardSummary = async () => {
  return apiClient<DashboardSummary>('/dashboard/summary');
};
