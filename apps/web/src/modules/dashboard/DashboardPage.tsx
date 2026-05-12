import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  controlBase,
  kpiCardBase,
  pageMain,
  secondaryButtonBase,
  surfaceCard,
  toneStyles,
  uiTheme,
} from "../../theme/commonStyles";
import AppTopbar from "../../shared/AppTopbar";
import type { Monitor } from "../../shared/monitorApi";
import {
  useAllMonitorsQuery,
  useDashboardSummaryQuery,
} from "../../shared/monitorQueries";
import { getMonitorViewStatus } from "../../shared/monitorFilters";
import { useCurrentUserPermissions } from "../../shared/permissions";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  MonitorIcon,
  PlusIcon,
} from "../../shared/uiIcons";
import MonitorListCard from "../monitors/MonitorListCard";

const EMPTY_MONITORS: Monitor[] = [];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { canWrite: canWriteActions } = useCurrentUserPermissions();
  const monitorsQuery = useAllMonitorsQuery({ adaptiveRefetchInterval: true });
  const summaryQuery = useDashboardSummaryQuery();
  const monitors = monitorsQuery.data ?? EMPTY_MONITORS;
  const summary = summaryQuery.data ?? null;
  const loading = monitorsQuery.isPending || summaryQuery.isPending;
  const listError = monitorsQuery.isError
    ? "No se pudieron cargar los monitores del dashboard."
    : null;

  const refreshMonitors = async () => {
    const [monitorsResult] = await Promise.all([
      monitorsQuery.refetch(),
      summaryQuery.refetch(),
    ]);

    return monitorsResult.data ?? [];
  };

  const stats = useMemo(() => {
    const total = summary?.totalMonitors ?? 0;
    const online = summary?.onlineMonitors ?? 0;
    const alerts = summary?.openIncidents ?? 0;
    const uptimePercent = summary?.uptimePercent ?? 0;
    const responseMs = summary?.averageResponseTimeMs ?? 0;

    return {
      total,
      online,
      alerts,
      uptime: `${uptimePercent.toFixed(2)}%`,
      response: `${responseMs} ms`,
    };
  }, [summary]);

  const downMonitors = useMemo(
    () => monitors.filter((monitor) => getMonitorViewStatus(monitor) === "DOWN").slice(0, 3),
    [monitors],
  );

  return (
    <main style={styles.main}>
      <AppTopbar
        title="Dashboard"
        subtitle="Resumen general de todas las webs monitorizadas"
        onRefresh={refreshMonitors}
        cta={
          canWriteActions
            ? {
                icon: <PlusIcon size={16} />,
                label: "Nuevo monitor",
                to: "/monitors/create",
              }
            : undefined
        }
      />

      <section style={styles.kpiGrid}>
        <KpiCard
          icon={<MonitorIcon size={18} />}
          title="Webs monitorizadas"
          value={stats.total}
          note="Total actual"
          tone="blue"
        />
        <KpiCard
          icon={<CheckCircleIcon size={18} />}
          title="Webs online"
          value={stats.online}
          note={`${stats.total ? ((stats.online / stats.total) * 100).toFixed(1) : 0}% del total`}
          tone="green"
        />
        <KpiCard
          icon={<AlertTriangleIcon size={18} />}
          title="Alertas activas"
          value={stats.alerts}
          note="Incidencias abiertas"
          tone="orange"
        />
        <KpiCard
          icon={<ClockIcon size={18} />}
          title="Uptime promedio"
          value={stats.uptime}
          note="Promedio global"
          tone="blue"
        />
        <KpiCard
          icon={<ActivityIcon size={18} />}
          title="Tiempo de respuesta"
          value={stats.response}
          note="Promedio global"
          tone="blue"
        />
      </section>

      <section style={styles.contentGrid}>
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

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Alertas recientes</h2>
            <span style={styles.linkFake}>Ver todas</span>
          </div>

          {downMonitors.length === 0 ? (
            <p style={styles.empty}>No hay alertas activas.</p>
          ) : (
            downMonitors.map((monitor) => (
              <AlertRow
                key={monitor.id}
                title={monitor.name}
                text={monitor.target}
                tone="red"
                meta="Ahora"
                onClick={() => navigate(`/monitors/${monitor.id}`)}
              />
            ))
          )}
        </div>
      </section>

      <section style={styles.listSection}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Todas las webs monitorizadas</h2>
        </div>
        <MonitorListCard
          monitors={monitors}
          loading={loading}
          error={listError}
          loadingLabel="Cargando monitores del dashboard"
          emptyStateMessage="No hay monitores disponibles en el dashboard."
          emptyFilteredMessage="No hay monitores del dashboard que coincidan con los filtros."
          onRefresh={refreshMonitors}
        />
      </section>
    </main>
  );
}

function KpiCard({
  icon,
  title,
  value,
  note,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string | number;
  note: string;
  tone: "green" | "blue" | "orange" | "purple";
}) {
  const colors = {
    green: uiTheme.colors.success,
    blue: uiTheme.colors.primary,
    orange: uiTheme.colors.warning,
    purple: uiTheme.colors.primary,
  };

  return (
    <div style={styles.kpiCard}>
      <div
        style={{
          ...styles.kpiIcon,
          background: `${colors[tone]}16`,
          color: colors[tone],
        }}
      >
        {icon}
      </div>

      <div>
        <p style={styles.kpiTitle}>{title}</p>
        <strong style={{ ...styles.kpiValue, color: colors[tone] }}>{value}</strong>
        <p style={styles.kpiNote}>{note}</p>
      </div>
    </div>
  );
}

function AlertRow({
  meta,
  onClick,
  text,
  title,
  tone,
}: {
  meta: string;
  onClick: () => void;
  text: string;
  title: string;
  tone: "red" | "blue";
}) {
  return (
    <button
      type="button"
      style={styles.alertRow}
      onClick={onClick}
    >
      <span
        style={{
          ...styles.alertRowIcon,
          background: tone === "red" ? toneStyles.red.background : uiTheme.colors.primarySoft,
          color: tone === "red" ? toneStyles.red.color : uiTheme.colors.primary,
        }}
      >
        <AlertTriangleIcon size={16} />
      </span>
      <span style={styles.alertRowCopy}>
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      <span style={styles.alertRowMeta}>{meta}</span>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    ...pageMain,
    display: "grid",
    gap: 24,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
  },
  kpiCard: {
    ...kpiCardBase,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: uiTheme.radii.md,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  kpiTitle: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  kpiValue: {
    display: "block",
    marginTop: 4,
    fontSize: 24,
    lineHeight: 1.1,
  },
  kpiNote: {
    margin: "6px 0 0",
    color: toneStyles.slate.color,
    fontSize: 12,
  },
  contentGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
    alignItems: "stretch",
  },
  cardLarge: {
    ...surfaceCard,
    display: "grid",
    gap: 18,
    padding: 22,
  },
  card: {
    ...surfaceCard,
    display: "grid",
    gap: 18,
    padding: 22,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
  },
  selectFake: {
    ...secondaryButtonBase,
    minHeight: 36,
    padding: "0 12px",
    display: "inline-flex",
    alignItems: "center",
  },
  linkFake: {
    color: uiTheme.colors.primary,
    fontSize: 13,
    fontWeight: 600,
  },
  chartBox: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gap: 12,
    alignItems: "stretch",
  },
  yAxis: {
    display: "grid",
    alignContent: "space-between",
    color: uiTheme.colors.muted,
    fontSize: 12,
    padding: "8px 0",
  },
  empty: {
    margin: 0,
    color: uiTheme.colors.muted,
  },
  alertRow: {
    ...controlBase,
    width: "100%",
    padding: "12px 14px",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
    background: uiTheme.colors.surfaceSoft,
  },
  alertRowIcon: {
    width: 36,
    height: 36,
    borderRadius: uiTheme.radii.md,
    display: "grid",
    placeItems: "center",
  },
  alertRowCopy: {
    display: "grid",
    gap: 4,
    minWidth: 0,
    color: uiTheme.colors.text,
  },
  alertRowMeta: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 600,
  },
  listSection: {
    display: "grid",
    gap: 12,
    minWidth: 0,
  },
};
