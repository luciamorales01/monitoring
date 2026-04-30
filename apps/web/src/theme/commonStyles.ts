import type { CSSProperties } from 'react';
import { colors, statusColors } from './colors';
import { radii } from './radii';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export const uiTheme = {
  colors,
  statusColors,
  radii,
  shadows,
  spacing,
  typography,
} as const;

export const pageMain: CSSProperties = {
  flex: 1,
  padding: `${spacing['6xl']}px ${spacing['7xl']}px`,
  background: colors.background,
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  WebkitFontSmoothing: 'antialiased',
  lineHeight: 1.4,
  letterSpacing: '-0.01em',
};

export const topbarBase: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: spacing['4xl'],
  marginBottom: spacing['5xl'],
};

export const topActionsBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
};

export const pageTitle: CSSProperties = {
  margin: 0,
  fontSize: typography.title.fontSize,
  fontWeight: 600, // 🔥 antes 800
  letterSpacing: '-0.02em',
};

export const pageSubtitle: CSSProperties = {
  margin: `${spacing.sm}px 0 0`,
  color: colors.muted,
  fontSize: typography.subtitle.fontSize,
  lineHeight: 1.4,
};

export const surfaceCard: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  boxShadow: shadows.card,
};

export const kpiCardBase: CSSProperties = {
  ...surfaceCard,
  padding: spacing['4xl'],
};

export const controlBase: CSSProperties = {
  border: `1px solid ${colors.borderStrong}`,
  background: colors.surface,
  color: colors.text,
  borderRadius: radii.sm,
  fontWeight: 500, // 🔥 más ligero
};

export const inputBase: CSSProperties = {
  ...controlBase,
  padding: `0 ${spacing.lg}px`,
  fontSize: typography.bodySm.fontSize,
  minWidth: 0,
  height: 40,
};

export const filterGroupBase: CSSProperties = {
  display: 'grid',
  gap: spacing.xxs,
  color: colors.muted,
  fontSize: typography.helper.fontSize,
};

export const iconButtonBase: CSSProperties = {
  ...controlBase,
  width: 38,
  height: 38,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
};

export const primaryButtonBase: CSSProperties = {
  border: `1px solid ${colors.primary}`,
  background: colors.primary,
  color: colors.white,
  borderRadius: radii.sm,
  boxShadow: shadows.button,
  fontWeight: 600, // 🔥 antes 800
};

export const secondaryButtonBase: CSSProperties = {
  ...controlBase,
  color: colors.text,
  fontWeight: 600,
};

export const avatarBase: CSSProperties = {
  width: 38,
  height: 38,
  background: colors.primary,
  color: colors.white,
  borderRadius: radii.pill,
  display: 'grid',
  placeItems: 'center',
  fontWeight: 600,
};

export const badgeBase: CSSProperties = {
  padding: '4px 8px',
  borderRadius: radii.pill,
  fontSize: typography.helper.fontSize,
  fontWeight: 600, // 🔥 antes 800
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

export const tableCardBase: CSSProperties = {
  ...surfaceCard,
  overflow: 'hidden',
};

export const tableHeaderCellBase: CSSProperties = {
  textAlign: 'left',
  color: colors.muted,
  fontSize: typography.caption.fontSize,
  fontWeight: 600, // 🔥 antes 800
};

export const tableRowBase: CSSProperties = {
  borderBottom: `1px solid ${colors.surfaceSoft}`,
  background: colors.surface,
};

export const tableHoverRowBase: CSSProperties = {
  background: '#F1F5F9', // 🔥 mejor hover
};

export const tableCellBase: CSSProperties = {
  color: colors.text,
  fontWeight: 500,
};

export const paginationBase: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  color: colors.muted,
  fontSize: typography.caption.fontSize,
};

export const pageActiveButtonBase: CSSProperties = {
  border: `1px solid ${colors.primary}`,
  borderRadius: 7,
  padding: '7px 11px',
  color: colors.primary,
  background: colors.primarySoft,
  cursor: 'pointer',
  minWidth: 36,
  fontWeight: 600,
};

export const pageArrowBase: CSSProperties = {
  ...controlBase,
  width: 34,
  height: 34,
  display: 'grid',
  placeItems: 'center',
  color: colors.muted,
  cursor: 'pointer',
  padding: 0,
};

export const selectFakeBase: CSSProperties = {
  ...controlBase,
  padding: '9px 11px',
  fontSize: typography.caption.fontSize,
};

export const toneStyles = {
  blue: { color: colors.primary, background: colors.primarySoft },
  green: { color: colors.success, background: colors.successSoft },
  orange: { color: colors.warning, background: colors.warningSoft },
  red: { color: colors.danger, background: colors.dangerSoft },
  slate: { color: colors.muted, background: colors.surfaceSoft },
} as const;
