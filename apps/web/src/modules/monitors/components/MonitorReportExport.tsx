import type { Dispatch, SetStateAction } from "react";
import type { ReportFormat, ReportRange } from "../../../shared/reportsApi";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";

export function MonitorReportExport({
  monitorName,
  exportRange,
  exportingFormat,
  onRangeChange,
  onExportReport,
}: {
  monitorName: string;
  exportRange: ReportRange;
  exportingFormat: ReportFormat | null;
  onRangeChange: Dispatch<SetStateAction<ReportRange>>;
  onExportReport: (format: ReportFormat) => void;
}) {
  return (
    <section style={styles.exportCard} className="monitor-detail-export">
      <div>
        <h2 style={styles.exportTitle}>Exportar informe de este monitor</h2>
        <p style={styles.exportSubtitle}>
          Genera un informe filtrado solo para {monitorName}, con SLA, checks e
          incidencias del periodo seleccionado.
        </p>
      </div>

      <div style={styles.exportControls} className="monitor-detail-export-controls">
        <select
          value={exportRange}
          onChange={(event) => onRangeChange(event.target.value as ReportRange)}
          style={styles.select}
        >
          <option value="24h">Últimas 24 horas</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>

        <button
          type="button"
          style={styles.secondaryButton}
          className="monitor-detail-button monitor-detail-button-secondary"
          onClick={() => onExportReport("csv")}
          disabled={exportingFormat !== null}
        >
          {exportingFormat === "csv" ? "Exportando..." : "CSV"}
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          className="monitor-detail-button monitor-detail-button-secondary"
          onClick={() => onExportReport("xlsx")}
          disabled={exportingFormat !== null}
        >
          {exportingFormat === "xlsx" ? "Exportando..." : "Excel"}
        </button>

        <button
          type="button"
          style={styles.primaryButton}
          className="monitor-detail-button monitor-detail-button-primary"
          onClick={() => onExportReport("pdf")}
          disabled={exportingFormat !== null}
        >
          {exportingFormat === "pdf" ? "Exportando..." : "PDF"}
        </button>
      </div>
    </section>
  );
}
