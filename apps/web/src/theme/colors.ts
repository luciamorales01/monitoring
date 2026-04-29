export const colors = {
  background: '#f8fafc',
  surface: '#ffffff',
  sidebar: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  primary: '#2563eb',
  primarySoft: '#eff6ff',
  success: '#10b981',
  successSoft: '#ecfdf5',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  warning: '#f59e0b',
  warningSoft: '#fff7ed',
  border: '#e5e7eb',
  borderStrong: '#dbe3ef',
  surfaceSoft: '#f1f5f9',
  iconSoft: '#f8fbff',
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
