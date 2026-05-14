import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  kpiCardBase,
  pageMain,
  toneStyles,
  uiTheme,
} from "../../theme/commonStyles";
import AppTopbar from "../../shared/AppTopbar";
import type { Monitor } from "../../shared/monitorApi";
import { useAllMonitorsQuery } from "../../shared/monitorQueries";
import { getMonitorViewStatus } from "../../shared/monitorFilters";
import { useCurrentUserPermissions } from "../../shared/permissions";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  MonitorIcon,
  PlusIcon,
  SettingsIcon,
} from "../../shared/uiIcons";
import MonitorListCard from "./MonitorListCard";

const EMPTY_MONITORS: Monitor[] = [];

export default function MonitorsPage() {
  const { canManageUsers } = useCurrentUserPermissions();
  const monitorsQuery = useAllMonitorsQuery({ adaptiveRefetchInterval: true });
  const monitors = monitorsQuery.data ?? EMPTY_MONITORS;
  const loading = monitorsQuery.isPending;
  const error = monitorsQuery.isError
    ? "No se pudieron cargar las webs monitorizadas."
    : null;

  const stats = useMemo(() => {
    const total = monitors.length;
    const online = monitors.filter(
      (monitor) => getMonitorViewStatus(monitor) === "UP",
    ).length;
    const down = monitors.filter(
      (monitor) => getMonitorViewStatus(monitor) === "DOWN",
    ).length;
    const paused = monitors.filter(
      (monitor) => getMonitorViewStatus(monitor) === "PAUSED",
    ).length;
    const responseTimes = monitors
      .map((monitor) => monitor.lastResponseTime)
      .filter((value): value is number => typeof value === "number");
    const averageResponseTime =
      responseTimes.length > 0
        ? `${Math.round(
            responseTimes.reduce((sum, value) => sum + value, 0) /
              responseTimes.length,
          )} ms`
        : "—";

    return {
      total,
      online,
      down,
      paused,
      response: averageResponseTime,
    };
  }, [monitors]);

  return (
    <main style={styles.main}>
      <AppTopbar
        title="Webs monitorizadas"
        subtitle="Gestiona y consulta el estado de todas las webs que tienes monitorizadas."
        onRefresh={() => monitorsQuery.refetch()}
        cta={
          canManageUsers
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
          title="Total webs"
          value={stats.total}
          note="Total actual"
          tone="blue"
        />
        <KpiCard
          icon={<CheckCircleIcon size={18} />}
          title="Webs online"
          value={stats.online}
          note={formatRatio(stats.online, stats.total)}
          tone="green"
        />
        <KpiCard
          icon={<AlertTriangleIcon size={18} />}
          title="Con problemas"
          value={stats.down}
          note={formatRatio(stats.down, stats.total)}
          tone="orange"
        />
        <KpiCard
          icon={<SettingsIcon size={18} />}
          title="Webs pausadas"
          value={stats.paused}
          note={formatRatio(stats.paused, stats.total)}
          tone="blue"
        />
        <KpiCard
          icon={<ClockIcon size={18} />}
          title="Tiempo de respuesta prom."
          value={stats.response}
          note="Promedio global"
          tone="blue"
        />
      </section>

      <MonitorListCard
        monitors={monitors}
        loading={loading}
        error={error}
        loadingLabel="Cargando webs monitorizadas"
        emptyStateMessage="No hay webs monitorizadas todavía."
        emptyFilteredMessage="No hay webs que coincidan con los filtros."
        onRefresh={() => monitorsQuery.refetch()}
      />
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

function formatRatio(value: number, total: number) {
  return `${total ? ((value / total) * 100).toFixed(1) : 0}% del total`;
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
};
