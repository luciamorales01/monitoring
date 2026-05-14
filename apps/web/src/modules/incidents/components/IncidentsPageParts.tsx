import { AlertTriangleIcon, BellIcon, CheckCircleIcon, ClockIcon } from '../../../shared/uiIcons';
import { uiTheme } from '../../../theme/commonStyles';
import { styles } from '../IncidentsPage.styles';
import type { IncidentFilterStatus } from '../IncidentsPage.types';

export function KpiCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string | number;
  tone: 'red' | 'orange' | 'blue' | 'purple' | 'green';
}) {
  const colors = {
    red: uiTheme.colors.danger,
    orange: uiTheme.colors.warning,
    blue: uiTheme.colors.primary,
    purple: uiTheme.colors.primary,
    green: uiTheme.colors.primary,
  };

  return (
    <div style={styles.kpiCard}>
      <div style={{ ...styles.kpiIcon, background: `${colors[tone]}16`, color: colors[tone] }}>
        {tone === 'red' || tone === 'orange' ? <AlertTriangleIcon size={18} /> : tone === 'green' ? <CheckCircleIcon size={18} /> : tone === 'blue' ? <BellIcon size={18} /> : <ClockIcon size={18} />}
      </div>
      <div>
        <p style={styles.kpiTitle}>{title}</p>
        <strong style={{ ...styles.kpiValue, color: colors[tone] }}>{value}</strong>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: IncidentFilterStatus }) {
  const stylesByStatus: Record<IncidentFilterStatus, { background: string; color: string; label: string }> = {
    ALL: { background: uiTheme.colors.background, color: uiTheme.colors.muted, label: 'Todas' },
    OPEN: { background: uiTheme.colors.dangerSoft, color: uiTheme.colors.danger, label: 'Abierta' },
    ACKNOWLEDGED: { background: uiTheme.colors.warningSoft, color: '#d97706', label: 'Reconocida' },
    INVESTIGATING: { background: uiTheme.colors.warningSoft, color: '#d97706', label: 'En investigación' },
    RESOLVED: { background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, label: 'Resuelta' },
  };

  return (
    <span
      style={{
        ...styles.badge,
        background: stylesByStatus[status].background,
        color: stylesByStatus[status].color,
      }}
    >
      <span style={styles.badgeDot} />
      {stylesByStatus[status].label}
    </span>
  );
}

export function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={styles.legendRow}>
      <span style={{ ...styles.dot, background: color }} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

