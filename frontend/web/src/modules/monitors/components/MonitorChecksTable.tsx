import type { MonitorCheck } from "../../../shared/monitorApi";
import { StatusDot } from "./MonitorDetailPrimitives";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";
import {
  formatDateTime,
  formatDuration,
  getStatusLabel,
} from "./monitorDetailUtils";

export function MonitorChecksTable({ checks }: { checks: MonitorCheck[] }) {
  return (
    <section style={styles.bottomGrid} className="monitor-detail-bottom-grid">
      <div style={styles.card} className="monitor-detail-surface monitor-detail-card">
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Últimos checks</h2>
            <p style={styles.cardSubtitle}>Registros más recientes del monitor.</p>
          </div>
          <span style={styles.helperText}>Orden descendente</span>
        </div>

        <div style={styles.tableHeader}>
          <span>Hora</span>
          <span>Estado</span>
          <span>Tiempo</span>
          <span>Código</span>
        </div>

        {checks.map((check) => (
          <div
            key={check.id}
            style={styles.tableRow}
            className="monitor-detail-table-row"
          >
            <span>{formatDateTime(check.checkedAt)}</span>
            <span style={styles.statusInline}>
              <StatusDot status={check.status} />
              {getStatusLabel(check.status)}
            </span>
            <span>{formatDuration(check.responseTimeMs)}</span>
            <span>{check.statusCode ?? "-"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
