import type { CSSProperties } from 'react';
import { surfaceCard, uiTheme } from '../theme/commonStyles';

type LoadingStateProps = {
  label?: string;
  rows?: number;
  variant?: 'page' | 'inline' | 'button' | 'cards' | 'table';
};

export default function LoadingState({
  label = 'Cargando...',
  rows = 5,
  variant = 'inline',
}: LoadingStateProps) {
  if (variant === 'button') {
    return <span aria-label={label} style={styles.buttonSpinner} />;
  }

  if (variant === 'cards') {
    return (
      <div aria-busy="true" aria-label={label} style={styles.cardGrid}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} style={styles.cardSkeleton}>
            <span style={styles.skeletonIcon} />
            <span style={styles.skeletonLineWide} />
            <span style={styles.skeletonLine} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div aria-busy="true" aria-label={label} style={styles.tableSkeleton}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} style={styles.tableRowSkeleton}>
            <span style={styles.skeletonDot} />
            <span style={styles.skeletonLineWide} />
            <span style={styles.skeletonLine} />
            <span style={styles.skeletonLineShort} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      aria-busy="true"
      style={variant === 'page' ? styles.page : styles.inline}
    >
      <span style={styles.spinner} />
      <span>{label}</span>
    </div>
  );
}

const shimmer = {
  background:
    'linear-gradient(90deg, #eef2f7 0%, #f8fafc 45%, #eef2f7 100%)',
  backgroundSize: '220% 100%',
} satisfies CSSProperties;

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: 260,
    display: 'grid',
    placeItems: 'center',
    gap: 12,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  inline: {
    minHeight: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 999,
    border: `3px solid ${uiTheme.colors.border}`,
    borderTopColor: uiTheme.colors.primary,
    animation: 'loading-state-spin 800ms linear infinite',
  },
  buttonSpinner: {
    width: 16,
    height: 16,
    borderRadius: 999,
    border: '2px solid rgba(255,255,255,0.45)',
    borderTopColor: '#fff',
    animation: 'loading-state-spin 800ms linear infinite',
    display: 'inline-block',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
    padding: 20,
  },
  cardSkeleton: {
    ...surfaceCard,
    padding: 18,
    display: 'grid',
    gap: 12,
    minHeight: 108,
  },
  tableSkeleton: {
    display: 'grid',
    padding: '8px 20px 20px',
  },
  tableRowSkeleton: {
    display: 'grid',
    gridTemplateColumns: '34px 1fr minmax(120px, 0.3fr) minmax(90px, 0.2fr)',
    gap: 14,
    alignItems: 'center',
    minHeight: 54,
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  skeletonIcon: {
    ...shimmer,
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  skeletonDot: {
    ...shimmer,
    width: 30,
    height: 30,
    borderRadius: 999,
  },
  skeletonLineWide: {
    ...shimmer,
    height: 12,
    borderRadius: 999,
  },
  skeletonLine: {
    ...shimmer,
    width: '68%',
    height: 10,
    borderRadius: 999,
  },
  skeletonLineShort: {
    ...shimmer,
    width: '48%',
    height: 10,
    borderRadius: 999,
  },
};
