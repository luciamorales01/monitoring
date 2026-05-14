import type { Monitor, MonitorCheck, MonitorStatus } from "../../../shared/monitorApi";
import { InfoRow, StatusBadge } from "./MonitorDetailPrimitives";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";
import { getStatusLabel } from "./monitorDetailUtils";

export function MonitorInfoCard({
  monitor,
  latestCheck,
  status,
}: {
  monitor: Monitor;
  latestCheck: MonitorCheck | null;
  status: MonitorStatus;
}) {
  return (
    <div
      style={styles.infoCard}
      className="monitor-detail-surface monitor-detail-info-card"
    >
      <div style={styles.cardHeaderCompact}>
        <h2 style={styles.cardTitle}>Información</h2>
        <StatusBadge status={status} />
      </div>

      <InfoRow label="URL" value={monitor.target} strong />
      <InfoRow label="Protocolo" value={monitor.type} />
      <InfoRow label="Código esperado" value={String(monitor.expectedStatusCode)} />
      <InfoRow label="Timeout" value={`${monitor.timeoutSeconds}s`} />
      <InfoRow label="Último estado" value={getStatusLabel(status)} />
      <InfoRow
        label="Último código"
        value={latestCheck?.statusCode ? String(latestCheck.statusCode) : "-"}
      />
    </div>
  );
}
