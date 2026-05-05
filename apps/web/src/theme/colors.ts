export const colors = {
  background: '#f5f7ff',
  surface: '#ffffff',
  sidebar: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  primary: '#6d28d9',
  primaryDark: '#5b21b6',
  primaryLight: '#8b5cf6',
  primarySoft: '#ede9fe',
  success: '#10b981',
  successSoft: '#ecfdf5',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  warning: '#f59e0b',
  warningSoft: '#fff7ed',
  border: '#e5e7eb',
  borderStrong: '#ddd6fe',
  surfaceSoft: '#f5f3ff',
  iconSoft: '#faf5ff',
  slate: '#94a3b8',
  white: '#ffffff',
} as const;

export const statusColors = {
  UP: {
    fill: colors.success,
    soft: colors.successSoft,
  },
  DOWN: {
    fill: colors.danger,
    soft: colors.dangerSoft,
  },
  UNKNOWN: {
    fill: colors.slate,
    soft: colors.surfaceSoft,
  },
} as const;
