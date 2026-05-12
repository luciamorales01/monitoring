import type { MonitorCheck } from "../../../shared/monitorApi";
import {
  EmptyChart,
  LegendItem,
  Metric,
} from "./MonitorDetailPrimitives";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";
import type { MonitorFilteredStats } from "./monitorDetailTypes";
import {
  formatDateTime,
  formatDuration,
  getStatusColor,
  getStatusLabel,
} from "./monitorDetailUtils";

export function MonitorTimeline({
  checks,
  stats,
}: {
  checks: MonitorCheck[];
  stats: MonitorFilteredStats;
}) {
  return (
    <div
      style={styles.cardLarge}
      className="monitor-detail-surface monitor-detail-card-large"
    >
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.cardTitle}>Disponibilidad</h2>
          <p style={styles.cardSubtitle}>
            Últimos estados registrados sin mezclar latencia.
          </p>
        </div>
        <span style={styles.helperText}>{stats.total} registros</span>
      </div>

      <StatusHistoryChart checks={checks} />

      <div style={styles.legendRow}>
        <LegendItem status="UP" label="Operativo" />
        <LegendItem status="DOWN" label="Caído" />
        <LegendItem status="UNKNOWN" label="Pendiente" />
      </div>

      <div style={styles.summaryGrid}>
        <Metric label="Operativos" value={String(stats.up)} />
        <Metric label="Caídas" value={String(stats.down)} />
        <Metric label="Pendientes" value={String(stats.unknown)} />
        <Metric label="Uptime" value={stats.uptime} />
      </div>
    </div>
  );
}

function StatusHistoryChart({ checks }: { checks: MonitorCheck[] }) {
  const visibleChecks = checks.slice(-50);

  if (visibleChecks.length === 0) {
    return <EmptyChart label="Sin datos de estado para este filtro" />;
  }

  return (
    <div style={styles.statusChartWrap}>
      <div style={styles.statusTimelineTrack}>
        {visibleChecks.map((check) => {
          const isDown = check.status === "DOWN";

          return (
            <div
              key={check.id}
              title={`${formatDateTime(check.checkedAt)} · ${getStatusLabel(
                check.status,
              )} · código ${
                check.statusCode ?? "-"
              } · ${formatDuration(check.responseTimeMs)}`}
              style={{
                ...styles.statusTimelineSegment,
                height: isDown ? 84 : 46,
                background: getStatusColor(check.status),
                opacity: check.status === "UNKNOWN" ? 0.5 : 1,
              }}
            />
          );
        })}
      </div>

      <div style={styles.statusEventRow}>
        {visibleChecks.map((check) => (
          <div key={check.id} style={styles.statusEventSlot}>
            {check.status === "DOWN" ? (
              <span
                title={check.errorMessage || "Check fallido"}
                style={styles.statusEventMarker}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
