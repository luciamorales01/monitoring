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
import { uiTheme } from '../../theme/commonStyles';

export const sectionIconOptions: Array<{
  key: SectionIcon;
  label: string;
  color: string;
  background: string;
}> = [
  {
    key: 'folder',
    label: 'General',
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
  },
  {
    key: 'globe',
    label: 'Web',
    color: uiTheme.colors.primaryDark,
    background: '#f5f3ff',
  },
  {
    key: 'monitor',
    label: 'Aplicaciones',
    color: uiTheme.colors.primaryLight,
    background: '#f3e8ff',
  },
  {
    key: 'database',
    label: 'Datos',
    color: '#7c3aed',
    background: '#faf5ff',
  },
  {
    key: 'cloud',
    label: 'Infra',
    color: '#8b5cf6',
    background: '#f5f3ff',
  },
  {
    key: 'code',
    label: 'Backend',
    color: '#6d28d9',
    background: '#ede9fe',
  },
  {
    key: 'drive',
    label: 'Sistemas',
    color: '#5b21b6',
    background: '#f3e8ff',
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
