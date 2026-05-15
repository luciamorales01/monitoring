import type { Dispatch, SetStateAction } from "react";
import ReportExportPanel from "../../../shared/components/ReportExportPanel";
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
    <ReportExportPanel
      title="Exportar informe de este monitor"
      description={
        <>
          Genera un informe filtrado solo para {monitorName}, con SLA, checks e
          incidencias del periodo seleccionado.
        </>
      }
      exportRange={exportRange}
      exportingFormat={exportingFormat}
      onRangeChange={onRangeChange}
      onExportReport={onExportReport}
      styles={{
        card: styles.exportCard,
        title: styles.exportTitle,
        subtitle: styles.exportSubtitle,
        controls: styles.exportControls,
        select: styles.select,
        secondaryButton: styles.secondaryButton,
        primaryButton: styles.primaryButton,
      }}
      className="monitor-detail-export"
      controlsClassName="monitor-detail-export-controls"
    />
  );
}
