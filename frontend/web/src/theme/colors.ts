export const colors = {
  background: 'var(--bg-main)',
  surface: 'var(--surface)',
  sidebar: 'var(--sidebar)',
  text: 'var(--text-main)',
  muted: 'var(--text-muted)',
  primary: 'var(--primary)',
  primaryDark: 'var(--primary-dark)',
  primaryLight: 'var(--primary-light)',
  primarySoft: 'var(--primary-soft)',
  success: 'var(--success)',
  successSoft: 'var(--success-soft)',
  danger: 'var(--danger)',
  dangerSoft: 'var(--danger-soft)',
  warning: 'var(--warning)',
  warningSoft: 'var(--warning-soft)',
  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',
  surfaceSoft: 'var(--surface-soft)',
  iconSoft: 'var(--icon-soft)',
  slate: 'var(--slate)',
  white: 'var(--white)',
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
