import { apiClient } from './apiClient';
import {
  normalizeMonitor,
  type Monitor,
  type RawMonitor,
} from './monitorApi';
import {
  normalizeSectionIcon,
  type MonitorSection,
  type SectionIcon,
} from './sectionsStore';
import type { User } from './userApi';

export type ApiSection = MonitorSection & {
  monitors?: Monitor[];
  members?: Pick<User, 'id' | 'name' | 'email' | 'role' | 'status'>[];
};

type SectionMember = Pick<User, 'id' | 'name' | 'email' | 'role' | 'status'>;

type RawApiSection = Omit<MonitorSection, 'icon'> & {
  icon?: unknown;
  monitors?: RawMonitor[];
  members?: SectionMember[];
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

function normalizeApiSection(section: RawApiSection): ApiSection {
  return {
    ...section,
    icon: normalizeSectionIcon(section.icon),
    monitors: section.monitors?.map(normalizeMonitor),
  };
}

function normalizeSectionPayload(payload: SectionPayload): SectionPayload {
  return {
    ...payload,
    icon: normalizeSectionIcon(payload.icon),
  };
}

export async function getSections() {
  const sections = await apiClient<RawApiSection[]>('/sections');
  return sections.map(normalizeApiSection);
}

export async function getSection(id: string | number) {
  const section = await apiClient<RawApiSection>(`/sections/${id}`);
  return normalizeApiSection(section);
}

export async function createSection(payload: SectionPayload) {
  const section = await apiClient<RawApiSection>('/sections', {
    method: 'POST',
    body: JSON.stringify(normalizeSectionPayload(payload)),
  });
  return normalizeApiSection(section);
}

export async function updateSection(id: string | number, payload: SectionPayload) {
  const section = await apiClient<RawApiSection>(`/sections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(normalizeSectionPayload(payload)),
  });
  return normalizeApiSection(section);
}

export async function updateSectionMembers(id: string | number, userIds: number[]) {
  const section = await apiClient<RawApiSection>(`/sections/${id}/members`, {
    method: 'PATCH',
    body: JSON.stringify({ userIds }),
  });
  return normalizeApiSection(section);
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
