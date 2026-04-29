export type SectionIcon =
  | 'folder'
  | 'globe'
  | 'monitor'
  | 'database'
  | 'cloud'
  | 'code'
  | 'drive';

export type MonitorSection = {
  id: string;
  name: string;
  description: string;
  icon: SectionIcon;
  monitorIds: number[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'monitoring-tfg:sections:v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isSectionIcon(value: unknown): value is SectionIcon {
  return (
    value === 'folder' ||
    value === 'globe' ||
    value === 'monitor' ||
    value === 'database' ||
    value === 'cloud' ||
    value === 'code' ||
    value === 'drive'
  );
}

function normalizeSection(value: unknown): MonitorSection | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<MonitorSection>;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.description !== 'string' ||
    !isSectionIcon(candidate.icon) ||
    !Array.isArray(candidate.monitorIds) ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    description: candidate.description.trim(),
    icon: candidate.icon,
    monitorIds: Array.from(
      new Set(
        candidate.monitorIds.filter((monitorId): monitorId is number =>
          Number.isInteger(monitorId),
        ),
      ),
    ),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

export function readSections() {
  if (!canUseStorage()) {
    return [] as MonitorSection[];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) => normalizeSection(item))
      .filter((item): item is MonitorSection => item !== null);
  } catch {
    return [];
  }
}

export function writeSections(sections: MonitorSection[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
}

export function sanitizeSections(
  sections: MonitorSection[],
  validMonitorIds: number[],
) {
  const allowedIds = new Set(validMonitorIds);

  return sections.map((section) => ({
    ...section,
    monitorIds: section.monitorIds.filter((monitorId) => allowedIds.has(monitorId)),
  }));
}
