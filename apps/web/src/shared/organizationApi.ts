import { apiClient } from './apiClient';

export type OrganizationPlan = 'FREE' | 'PRO' | 'BUSINESS';

export type OrganizationSummary = {
  canCreateMonitor: boolean;
  createdAt: string;
  id: number;
  monitorCount: number;
  monitorLimit: number;
  name: string;
  plan: OrganizationPlan;
  slug: string;
  updatedAt: string;
};

export const getOrganizations = async () => {
  return apiClient<OrganizationSummary[]>('/organizations');
};
