import { AlertTriangleIcon } from '../../../shared/uiIcons';
import { toneStyles, uiTheme } from '../../../theme/commonStyles';
import { dashboardStyles as styles } from '../dashboardStyles';
import type { DashboardAlertItem } from '../dashboardTypes';

type DashboardAlertsPanelProps = {
  alerts: DashboardAlertItem[];
  onOpenMonitor: (monitorId: number) => void;
};

export default function DashboardAlertsPanel({
  alerts,
  onOpenMonitor,
}: DashboardAlertsPanelProps) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Alertas recientes</h2>
      </div>

      {alerts.length === 0 ? (
        <p style={styles.empty}>No hay alertas activas.</p>
      ) : (
        alerts.map((monitor) => (
          <button
            key={monitor.id}
            type="button"
            style={styles.alertRow}
            onClick={() => onOpenMonitor(monitor.id)}
          >
            <span
              style={{
                ...styles.alertRowIcon,
                background: toneStyles.red.background,
                color: toneStyles.red.color,
              }}
            >
              <AlertTriangleIcon size={16} />
            </span>
            <span style={styles.alertRowCopy}>
              <strong>{monitor.name}</strong>
              <span>{monitor.target}</span>
            </span>
            <span style={styles.alertRowMeta}>Ahora</span>
          </button>
        ))
      )}
    </div>
  );
}
