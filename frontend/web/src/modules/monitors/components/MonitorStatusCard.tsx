import type { MonitorStatus } from "../../../shared/monitorApi";
import { KpiCard } from "./MonitorDetailPrimitives";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";
import type { MonitorSummaryStats } from "./monitorDetailTypes";
import { getStatusLabel } from "./monitorDetailUtils";

export function MonitorStatusCard({
  stats,
  status,
  isPaused,
}: {
  stats: MonitorSummaryStats;
  status: MonitorStatus;
  isPaused: boolean;
}) {
  const isDown = status === "DOWN";

  return (
    <section style={styles.kpiGrid} className="monitor-detail-kpi-grid">
      <KpiCard
        title="Disponibilidad"
        value={stats.availability}
        description="Según checks registrados"
        tone={isDown ? "red" : "green"}
      />
      <KpiCard
        title="Tiempo medio"
        value={stats.averageResponseTime}
        description="Latencia promedio"
        tone="blue"
      />
      <KpiCard
        title="Checks totales"
        value={stats.totalChecks}
        description="Histórico guardado"
        tone="slate"
      />
      <KpiCard
        title="Fallos"
        value={stats.failures}
        description="Checks con caída"
        tone={stats.failures > 0 ? "red" : "green"}
      />
      <KpiCard
        title="Estado actual"
        value={getStatusLabel(status)}
        description={isPaused ? "Monitor pausado" : "Monitor activo"}
        tone={isDown ? "red" : status === "UP" ? "green" : "orange"}
      />
    </section>
  );
}
