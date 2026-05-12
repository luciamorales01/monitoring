import type { Dispatch, SetStateAction } from "react";
import { SegmentedControl } from "./MonitorDetailPrimitives";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";
import type { PeriodFilter } from "./monitorDetailTypes";

const periodOptions: Array<{ label: string; value: PeriodFilter }> = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7 días", value: "7d" },
  { label: "30 días", value: "30d" },
  { label: "Todo", value: "all" },
];

export function MonitorChartsToolbar({
  periodFilter,
  onPeriodFilterChange,
}: {
  periodFilter: PeriodFilter;
  onPeriodFilterChange: Dispatch<SetStateAction<PeriodFilter>>;
}) {
  return (
    <section style={styles.chartToolbarCard} className="monitor-detail-toolbar">
      <div>
        <strong style={styles.toolbarTitle}>Vista de gráficas</strong>
        <p style={styles.cardSubtitle}>Filtra el histórico por periodo.</p>
      </div>

      <div
        style={styles.toolbarControls}
        className="monitor-detail-toolbar-controls"
      >
        <SegmentedControl
          value={periodFilter}
          onChange={onPeriodFilterChange}
          options={periodOptions}
        />
      </div>
    </section>
  );
}
