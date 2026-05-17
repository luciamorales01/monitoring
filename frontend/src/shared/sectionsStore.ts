export type SectionIcon =
  | 'folder'
  | 'globe'
  | 'monitor'
  | 'database'
  | 'cloud'
  | 'code'
  | 'drive';

export const sectionIcons = [
  'folder',
  'globe',
  'monitor',
  'database',
  'cloud',
  'code',
  'drive',
] as const satisfies readonly SectionIcon[];

const sectionIconSet = new Set<string>(sectionIcons);

export function isSectionIcon(value: unknown): value is SectionIcon {
  return typeof value === 'string' && sectionIconSet.has(value);
}

export function normalizeSectionIcon(value: unknown): SectionIcon {
  return isSectionIcon(value) ? value : 'folder';
}

export type MonitorSection = {
  id: string;
  name: string;
  description: string;
  icon: SectionIcon;
  expectedStatusCode: number;
  frequencySeconds: number;
  timeoutSeconds: number;
  isActive: boolean;
  monitorIds: number[];
  memberIds: number[];
  createdAt: string;
  updatedAt: string;
};
