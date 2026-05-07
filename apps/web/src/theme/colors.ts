export const colors = {
  background: '#f8fafc',
  surface: '#ffffff',
  sidebar: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  primary: '#6d28d9',
  primaryDark: '#5b21b6',
  primaryLight: '#8b5cf6',
  primarySoft: '#eef2f7',
  success: '#10b981',
  successSoft: '#ecfdf5',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  warning: '#f59e0b',
  warningSoft: '#fff7ed',
  border: '#e5e7eb',
  borderStrong: '#dbe3ee',
  surfaceSoft: '#f1f5f9',
  iconSoft: '#f8fafc',
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
