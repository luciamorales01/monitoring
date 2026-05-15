import { dashboardStyles as styles } from '../dashboardStyles';
import type { DashboardKpiItem, DashboardKpiTone } from '../dashboardTypes';
import { uiTheme } from '../../../theme/commonStyles';

const toneColors: Record<DashboardKpiTone, string> = {
  green: uiTheme.colors.success,
  blue: uiTheme.colors.primary,
  orange: uiTheme.colors.warning,
  purple: uiTheme.colors.primary,
};

type DashboardKpiGridProps = {
  items: DashboardKpiItem[];
};

export default function DashboardKpiGrid({ items }: DashboardKpiGridProps) {
  return (
    <section style={styles.kpiGrid}>
      {items.map((item) => (
        <div key={item.title} style={styles.kpiCard}>
          <div
            style={{
              ...styles.kpiIcon,
              background: `${toneColors[item.tone]}16`,
              color: toneColors[item.tone],
            }}
          >
            {item.icon}
          </div>

          <div>
            <p style={styles.kpiTitle}>{item.title}</p>
            <strong
              style={{ ...styles.kpiValue, color: toneColors[item.tone] }}
            >
              {item.value}
            </strong>
            <p style={styles.kpiNote}>{item.note}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
