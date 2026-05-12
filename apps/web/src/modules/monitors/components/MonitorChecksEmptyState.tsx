import { ClockIcon } from "../../../shared/uiIcons";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";

export function MonitorChecksEmptyState() {
  return (
    <section style={styles.card}>
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>
          <ClockIcon size={24} />
        </div>
        <strong>Aún no hay checks registrados</strong>
        <p>
          Ejecuta una comprobación manual o espera al scheduler para ver datos
          reales del monitor.
        </p>
      </div>
    </section>
  );
}
