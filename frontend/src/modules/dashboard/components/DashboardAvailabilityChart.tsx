import { dashboardStyles as styles } from '../dashboardStyles';
import { uiTheme } from '../../../theme/commonStyles';

export default function DashboardAvailabilityChart() {
  return (
    <div style={styles.cardLarge}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Disponibilidad de las webs</h2>
        <span style={styles.selectFake}>Últimas 24 horas</span>
      </div>

      <div style={styles.chartBox}>
        <div style={styles.yAxis}>
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        <svg
          width="100%"
          height="210"
          viewBox="0 0 720 210"
          preserveAspectRatio="none"
        >
          <rect
            x="0"
            y="0"
            width="720"
            height="210"
            rx="16"
            fill={uiTheme.colors.surface}
          />
          {[25, 70, 115, 160].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="720"
              y2={y}
              stroke={uiTheme.colors.borderStrong}
              strokeDasharray="4 6"
            />
          ))}
          <path
            d="M0 68 C45 62, 70 72, 110 60 C160 45, 230 60, 285 54 C335 48, 390 60, 430 95 C455 125, 485 70, 535 54 C590 40, 640 55, 680 60 C700 62, 690 118, 720 82"
            fill="none"
            stroke={uiTheme.colors.primary}
            strokeWidth="2"
          />
          <path
            d="M0 68 C45 62, 70 72, 110 60 C160 45, 230 60, 285 54 C335 48, 390 60, 430 95 C455 125, 485 70, 535 54 C590 40, 640 55, 680 60 C700 62, 690 118, 720 82 L720 210 L0 210 Z"
            fill={uiTheme.colors.primary}
            opacity="0.06"
          />
        </svg>
      </div>
    </div>
  );
}
