export const colors = {
  background: '#f6f8fb',
  surface: '#ffffff',
  sidebar: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#60a5fa',
  primarySoft: '#eff6ff',
  success: '#10b981',
  successSoft: '#ecfdf5',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  warning: '#f59e0b',
  warningSoft: '#fff7ed',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
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
