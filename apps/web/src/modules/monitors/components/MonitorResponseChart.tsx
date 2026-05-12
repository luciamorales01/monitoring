import type { MonitorCheck } from "../../../shared/monitorApi";
import { uiTheme } from "../../../theme/commonStyles";
import { EmptyChart, Metric } from "./MonitorDetailPrimitives";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";
import type { MonitorFilteredStats } from "./monitorDetailTypes";
import {
  formatDateTime,
  formatDuration,
  getAverage,
  getStatusLabel,
} from "./monitorDetailUtils";

export function MonitorResponseChart({
  checks,
  latestCheck,
  timeoutMs,
  stats,
}: {
  checks: MonitorCheck[];
  latestCheck: MonitorCheck | null;
  timeoutMs: number;
  stats: MonitorFilteredStats;
}) {
  return (
    <div
      style={styles.cardLarge}
      className="monitor-detail-surface monitor-detail-card-large"
    >
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.cardTitle}>Tiempo de respuesta</h2>
          <p style={styles.cardSubtitle}>Latencia de checks con respuesta válida.</p>
        </div>
        <span style={styles.helperText}>ms</span>
      </div>

      <ResponseTimeChart checks={checks} timeoutMs={timeoutMs} />

      <div style={styles.summaryGrid}>
        <Metric
          label="Último"
          value={formatDuration(latestCheck?.responseTimeMs ?? null)}
        />
        <Metric label="Media" value={formatDuration(stats.average)} />
        <Metric label="P95" value={formatDuration(stats.p95)} />
        <Metric label="Máximo" value={formatDuration(stats.max)} />
      </div>
    </div>
  );
}

function ResponseTimeChart({
  checks,
  timeoutMs,
}: {
  checks: MonitorCheck[];
  timeoutMs: number;
}) {
  const width = 720;
  const height = 230;
  const padding = {
    top: 24,
    right: 16,
    bottom: 34,
    left: 42,
  };

  const visibleChecks = checks.slice(-50);
  const validChecks = visibleChecks.filter(
    (check): check is MonitorCheck & { responseTimeMs: number } =>
      typeof check.responseTimeMs === "number",
  );

  if (validChecks.length === 0) {
    return <EmptyChart label="Sin tiempos de respuesta para este filtro" />;
  }

  const values = validChecks.map((check) => check.responseTimeMs);
  const maxValue = Math.max(...values, timeoutMs, 1);
  const minValue = Math.min(...values, 0);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (index: number) =>
    visibleChecks.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (index / (visibleChecks.length - 1)) * chartWidth;

  const getY = (value: number) => {
    const ratio = (value - minValue) / Math.max(maxValue - minValue, 1);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  const points = visibleChecks
    .map((check, index) => {
      if (check.responseTimeMs === null) return null;

      return {
        x: getX(index),
        y: getY(check.responseTimeMs),
        check,
      };
    })
    .filter(
      (
        point,
      ): point is {
        x: number;
        y: number;
        check: MonitorCheck;
      } => point !== null,
    );

  const path = points.map((point) => `${point.x} ${point.y}`).join(" L ");
  const areaPath = [
    `${points[0].x} ${padding.top + chartHeight}`,
    ...points.map((point) => `${point.x} ${point.y}`),
    `${points[points.length - 1].x} ${padding.top + chartHeight}`,
  ].join(" L ");

  const timeoutY = getY(timeoutMs);
  const average = getAverage(values);
  const averageY = average !== null ? getY(average) : null;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Gráfica de tiempo de respuesta"
    >
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="16"
        fill={uiTheme.colors.surface}
      />

      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + ratio * chartHeight;

        return (
          <line
            key={ratio}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke={uiTheme.colors.borderStrong}
            strokeDasharray="4 6"
          />
        );
      })}

      {timeoutY >= padding.top && timeoutY <= padding.top + chartHeight ? (
        <>
          <line
            x1={padding.left}
            y1={timeoutY}
            x2={width - padding.right}
            y2={timeoutY}
            stroke="#dc2626"
            strokeDasharray="6 6"
            opacity="0.75"
          />
          <text
            x={width - padding.right - 72}
            y={timeoutY - 7}
            fontSize="11"
            fill="#991b1b"
            fontWeight="700"
          >
            Timeout
          </text>
        </>
      ) : null}

      {averageY !== null ? (
        <line
          x1={padding.left}
          y1={averageY}
          x2={width - padding.right}
          y2={averageY}
          stroke={uiTheme.colors.slate}
          strokeDasharray="3 7"
          strokeWidth="0.5"
          opacity="0.35"
        />
      ) : null}

      <path d={`M ${areaPath} Z`} fill={uiTheme.colors.primary} opacity="0.08" />

      <path
        d={`M ${path}`}
        fill="none"
        stroke={uiTheme.colors.primary}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((point) => {
        const isIncident =
          point.check.status === "DOWN" ||
          (point.check.responseTimeMs ?? 0) >= timeoutMs;

        return (
          <circle
            key={point.check.id}
            cx={point.x}
            cy={point.y}
            r={isIncident ? "5" : "3.5"}
            fill={
              point.check.status === "DOWN"
                ? uiTheme.colors.danger
                : isIncident
                  ? uiTheme.colors.warning
                  : uiTheme.colors.primary
            }
            stroke={uiTheme.colors.surface}
            strokeWidth="2"
          >
            <title>
              {`${formatDateTime(point.check.checkedAt)} · ${getStatusLabel(
                point.check.status,
              )} · ${formatDuration(point.check.responseTimeMs)}`}
            </title>
          </circle>
        );
      })}

      <text x="8" y={padding.top + 4} fontSize="11" fill={uiTheme.colors.muted}>
        {formatDuration(maxValue)}
      </text>
      <text
        x="8"
        y={padding.top + chartHeight}
        fontSize="11"
        fill={uiTheme.colors.muted}
      >
        0 ms
      </text>
    </svg>
  );
}
