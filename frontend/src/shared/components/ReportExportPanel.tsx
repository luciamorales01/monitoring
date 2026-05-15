import type { CSSProperties, ReactNode } from "react";
import type { ReportFormat, ReportRange } from "../reportsApi";

export type ReportExportPanelStyles = {
  card: CSSProperties;
  title: CSSProperties;
  subtitle: CSSProperties;
  controls: CSSProperties;
  select: CSSProperties;
  secondaryButton: CSSProperties;
  primaryButton: CSSProperties;
};

type ReportExportPanelProps = {
  title: string;
  description: ReactNode;
  exportRange: ReportRange;
  exportingFormat: ReportFormat | null;
  onRangeChange: (range: ReportRange) => void;
  onExportReport: (format: ReportFormat) => void;
  styles: ReportExportPanelStyles;
  formats?: ReportFormat[];
  className?: string;
  controlsClassName?: string;
};

const rangeOptions: Array<{ value: ReportRange; label: string }> = [
  { value: "24h", label: "Ultimas 24 horas" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
];

const formatLabels: Record<ReportFormat, string> = {
  csv: "CSV",
  xlsx: "Excel",
  pdf: "PDF",
};

export default function ReportExportPanel({
  title,
  description,
  exportRange,
  exportingFormat,
  onRangeChange,
  onExportReport,
  styles,
  formats = ["csv", "xlsx", "pdf"],
  className,
  controlsClassName,
}: ReportExportPanelProps) {
  return (
    <section style={styles.card} className={className}>
      <div>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.subtitle}>{description}</p>
      </div>

      <div style={styles.controls} className={controlsClassName}>
        <select
          value={exportRange}
          onChange={(event) => onRangeChange(event.target.value as ReportRange)}
          style={styles.select}
        >
          {rangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {formats.map((format) => {
          const isPrimary = format === "pdf";
          const label = formatLabels[format];

          return (
            <button
              key={format}
              type="button"
              style={isPrimary ? styles.primaryButton : styles.secondaryButton}
              className={
                className
                  ? `monitor-detail-button monitor-detail-button-${
                      isPrimary ? "primary" : "secondary"
                    }`
                  : undefined
              }
              onClick={() => onExportReport(format)}
              disabled={exportingFormat !== null}
            >
              {exportingFormat === format ? "Exportando..." : label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
