import type { CSSProperties } from 'react';
import {
  CloudIcon,
  CodeIcon,
  DatabaseIcon,
  FolderIcon,
  GlobeIcon,
  HardDriveIcon,
  MonitorIcon,
} from '../../shared/uiIcons';
import type { SectionIcon } from '../../shared/sectionsStore';

export const sectionIconOptions: Array<{
  key: SectionIcon;
  label: string;
  color: string;
  background: string;
}> = [
  {
    key: 'folder',
    label: 'General',
    color: '#2563eb',
    background: '#eff6ff',
  },
  {
    key: 'globe',
    label: 'Web',
    color: '#0284c7',
    background: '#ecfeff',
  },
  {
    key: 'monitor',
    label: 'Aplicaciones',
    color: '#14b8a6',
    background: '#ecfeff',
  },
  {
    key: 'database',
    label: 'Datos',
    color: '#9333ea',
    background: '#faf5ff',
  },
  {
    key: 'cloud',
    label: 'Infra',
    color: '#f59e0b',
    background: '#fff7ed',
  },
  {
    key: 'code',
    label: 'Backend',
    color: '#22c55e',
    background: '#ecfdf5',
  },
  {
    key: 'drive',
    label: 'Sistemas',
    color: '#ef4444',
    background: '#fef2f2',
  },
];

export function SectionIconGlyph({
  icon,
  size,
}: {
  icon: SectionIcon;
  size: number;
}) {
  if (icon === 'globe') {
    return <GlobeIcon size={size} />;
  }

  if (icon === 'monitor') {
    return <MonitorIcon size={size} />;
  }

  if (icon === 'database') {
    return <DatabaseIcon size={size} />;
  }

  if (icon === 'cloud') {
    return <CloudIcon size={size} />;
  }

  if (icon === 'code') {
    return <CodeIcon size={size} />;
  }

  if (icon === 'drive') {
    return <HardDriveIcon size={size} />;
  }

  return <FolderIcon size={size} />;
}

export function getSectionIconColors(icon: SectionIcon) {
  return (
    sectionIconOptions.find((entry) => entry.key === icon) ??
    sectionIconOptions[0]
  );
}

export function getSectionIconWrapStyle(
  icon: SectionIcon,
  baseStyle: CSSProperties,
): CSSProperties {
  const option = getSectionIconColors(icon);

  return {
    ...baseStyle,
    background: option.background,
    color: option.color,
  };
}
