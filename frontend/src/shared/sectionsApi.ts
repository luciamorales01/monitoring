import { apiClient } from './apiClient';
import type { Monitor } from './monitorApi';
import type { MonitorSection, SectionIcon } from './sectionsStore';
import type { User } from './userApi';

export type ApiSection = MonitorSection & {
  monitors?: Monitor[];
  members?: Pick<User, 'id' | 'name' | 'email' | 'role' | 'status'>[];
};

export type SectionPayload = {
  name: string;
  description?: string;
  icon?: SectionIcon;
  monitorIds?: number[];
  expectedStatusCode?: number;
  frequencySeconds?: number;
  timeoutSeconds?: number;
  isActive?: boolean;
};

export function getSections() {
  return apiClient<ApiSection[]>('/sections');
}

export function getSection(id: string | number) {
  return apiClient<ApiSection>(`/sections/${id}`);
}

export function createSection(payload: SectionPayload) {
  return apiClient<ApiSection>('/sections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSection(id: string | number, payload: SectionPayload) {
  return apiClient<ApiSection>(`/sections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateSectionMembers(id: string | number, userIds: number[]) {
  return apiClient<ApiSection>(`/sections/${id}/members`, {
    method: 'PATCH',
    body: JSON.stringify({ userIds }),
  });
}

export function deleteSection(id: string | number) {
  return apiClient<{ ok: true }>(`/sections/${id}`, {
    method: 'DELETE',
  });
}

export function runSectionChecks(id: string | number) {
  return apiClient<{ checked: number; results: unknown[] }>(`/sections/${id}/run-checks`, {
    method: 'POST',
  });
}
