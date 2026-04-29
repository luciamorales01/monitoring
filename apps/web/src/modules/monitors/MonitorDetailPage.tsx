import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import {
  pageMain,
  pageTitle,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  toneStyles,
  uiTheme,
} from "../../theme/commonStyles";
import {
  getMonitor,
  getMonitorChecks,
  runMonitorCheck,
  toggleMonitorActive,
  type Monitor,
  type MonitorCheck,
  type MonitorStatus,
} from "../../shared/monitorApi";
import {
  getMonitorStatusToast,
  type MonitorStatusToast,
} from "../../shared/monitorStatusToast";
import {
  ActivityIcon,
  ClockIcon,
  GlobeIcon,
  PauseIcon,
  PlayIcon,
} from "../../shared/uiIcons";

export default function MonitorDetailPage() {
  const { id } = useParams();
  const monitorId = Number(id);

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<MonitorCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState<MonitorStatusToast>(null);

  const loadData = async () => {
    const [monitorData, checksData] = await Promise.all([
      getMonitor(monitorId),
      getMonitorChecks(monitorId),
    ]);
    setMonitor(monitorData);
    setChecks(checksData);
    return { monitor: monitorData, checks: checksData };
  };

  useEffect(() => {
    if (!Number.isFinite(monitorId) || monitorId <= 0) {
      setLoading(false);
      return;
    }

    loadData()
      .catch(() => {
        setMonitor(null);
        setChecks([]);
      })
      .finally(() => setLoading(false));
  }, [monitorId]);

  const handleRunCheck = async () => {
    try {
      setChecking(true);
      await runMonitorCheck(monitorId);
      const { monitor: updatedMonitor } = await loadData();
      setToast(getMonitorStatusToast(updatedMonitor.currentStatus));
    } catch {
      setToast({ text: "Error al comprobar", type: "error" });
    } finally {
      setChecking(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleToggleActive = async () => {
    try {
      setToggling(true);
      await toggleMonitorActive(monitorId);
      await loadData();
    } catch {
      setToast({ text: "Error al actualizar", type: "error" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setToggling(false);
    }
  };

  const status = monitor?.currentStatus ?? "UNKNOWN";
  const checksAsc = useMemo(() => [...checks].reverse(), [checks]);
  const latestCheck = checks[0] ?? null;
  const latestChecks = checks.slice(0, 10);
  const configuredLocations = useMemo(() => {
    const locations = monitor?.locations ?? [];
    return locations.length > 0 ? locations : ["default"];
  }, [monitor]);
  const checksByLocation = useMemo(() => {
    return checks.reduce<Record<string, MonitorCheck[]>>((acc, check) => {
      const location = check.location ?? "default";

      if (!acc[location]) {
        acc[location] = [];
      }

      acc[location].push(check);
      return acc;
    }, {});
  }, [checks]);
  const locationSummaries = useMemo(() => {
    const locations = Array.from(
      new Set([...configuredLocations, ...Object.keys(checksByLocation)]),
    );

    return locations.map((location) => {
      const locationChecks = checksByLocation[location] ?? [];
      const latestLocationCheck = locationChecks[0] ?? null;

      return {
        downChecks: locationChecks.filter((check) => check.status === "DOWN")
          .length,
        hasData: locationChecks.length > 0,
        latestCheck: latestLocationCheck,
        location,
        totalChecks: locationChecks.length,
        upChecks: locationChecks.filter((check) => check.status === "UP")
          .length,
      };
    });
  }, [checksByLocation, configuredLocations]);

  const stats = useMemo(() => {
    const total = checks.length;
    const upChecks = checks.filter((check) => check.status === "UP").length;
    const downChecks = checks.filter((check) => check.status === "DOWN").length;
    const responseTimes = checks
      .map((check) => check.responseTimeMs)
      .filter((value): value is number => value !== null);
    const averageResponseTime =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((sum, value) => sum + value, 0) /
              responseTimes.length,
          )
        : null;

    return {
      availability:
        total > 0 ? `${((upChecks / total) * 100).toFixed(1)}%` : "-",
      averageResponseTime:
        averageResponseTime !== null
          ? formatDuration(averageResponseTime)
          : "-",
      totalChecks: total,
      failures: downChecks,
      lastCheck: latestCheck ? formatDateTime(latestCheck.checkedAt) : "-",
    };
  }, [checks, latestCheck]);

  if (loading) {
    return <main style={styles.main}>Cargando monitor...</main>;
  }

  if (!monitor) {
    return <main style={styles.main}>Monitor no encontrado</main>;
  }

  return (
    <main style={styles.main}>
      <div style={styles.breadcrumb}>
        <Link to="/dashboard" style={styles.breadcrumbLink}>
          Webs monitorizadas
        </Link>
        <span>&gt;</span>
        <strong>{monitor.name}</strong>
      </div>

      <section style={styles.heroCard}>
        <div style={styles.heroLeft}>
          <div style={styles.monitorIcon}>
            <GlobeIcon size={26} />
          </div>

          <div>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>{monitor.name}</h1>
              <StatusBadge status={status} />
            </div>

            <a
              href={monitor.target}
              target="_blank"
              rel="noreferrer"
              style={styles.url}
            >
              {monitor.target}
            </a>

            <p style={styles.meta}>
              ID: MON-{String(monitor.id).padStart(4, "0")}
            </p>
          </div>
        </div>

        <div style={styles.heroInfo}>
          <p>Tipo: {monitor.type}</p>
          <p>Frecuencia: {monitor.frequencySeconds}s</p>
          <p>Timeout: {monitor.timeoutSeconds}s</p>
          <p>Ultimo check: {stats.lastCheck}</p>
        </div>

        <div style={styles.heroActions}>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={handleRunCheck}
            disabled={checking}
          >
            <ActivityIcon size={15} />
            {checking ? "Comprobando..." : "Comprobar ahora"}
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleToggleActive}
            disabled={toggling}
          >
            {monitor.isActive ? (
              <PauseIcon size={15} />
            ) : (
              <PlayIcon size={15} />
            )}
            {toggling
              ? "Actualizando..."
              : monitor.isActive
                ? "Pausar monitor"
                : "Reanudar monitor"}
          </button>
        </div>
      </section>

      <section style={styles.kpiGrid}>
        <KpiCard
          title="Disponibilidad"
          value={stats.availability}
          tone="green"
        />
        <KpiCard
          title="Tiempo medio"
          value={stats.averageResponseTime}
          tone="purple"
        />
        <KpiCard title="Checks totales" value={stats.totalChecks} tone="blue" />
        <KpiCard title="Fallos" value={stats.failures} tone="orange" />
        <KpiCard
          title="Estado actual"
          value={getStatusLabel(status)}
          tone={status === "DOWN" ? "orange" : "green"}
        />
      </section>

      {checks.length === 0 ? (
        <>
          <section style={styles.card}>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <ClockIcon size={24} />
              </div>
              <strong>Aun no hay checks registrados</strong>
              <p>
                Ejecuta una comprobacion manual o espera al scheduler para ver
                historico real.
              </p>
            </div>
          </section>

          <section style={styles.card}>
            <LocationChecksCard locationSummaries={locationSummaries} />
          </section>
        </>
      ) : (
        <>
          <section style={styles.grid}>
            <div style={styles.cardLarge}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Estado de checks</h2>
                <span style={styles.helperText}>Ultimos 50 registros</span>
              </div>

              <StatusHistoryChart checks={checksAsc} />

              <div style={styles.summaryGrid}>
                <Metric
                  label="Operativos"
                  value={String(
                    checks.filter((check) => check.status === "UP").length,
                  )}
                />
                <Metric
                  label="Caidas"
                  value={String(
                    checks.filter((check) => check.status === "DOWN").length,
                  )}
                />
                <Metric
                  label="Primer check"
                  value={formatShortDate(checksAsc[0]?.checkedAt)}
                />
                <Metric
                  label="Ultimo check"
                  value={formatShortDate(latestCheck?.checkedAt)}
                />
              </div>
            </div>

            <div style={styles.cardLarge}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Tiempo de respuesta</h2>
                <span style={styles.helperText}>responseTimeMs</span>
              </div>

              <ResponseTimeChart checks={checksAsc} />

              <div style={styles.summaryGrid}>
                <Metric
                  label="Ultimo"
                  value={formatDuration(latestCheck?.responseTimeMs ?? null)}
                />
                <Metric label="Media" value={stats.averageResponseTime} />
                <Metric
                  label="Maximo"
                  value={formatDuration(getMaxResponseTime(checks))}
                />
                <Metric
                  label="Minimo"
                  value={formatDuration(getMinResponseTime(checks))}
                />
              </div>
            </div>

            <div style={styles.infoCard}>
              <h2 style={styles.cardTitle}>Informacion</h2>

              <InfoRow label="URL" value={monitor.target} />
              <InfoRow label="Protocolo" value={monitor.type} />
              <InfoRow
                label="Codigo esperado"
                value={String(monitor.expectedStatusCode)}
              />
              <InfoRow label="Timeout" value={`${monitor.timeoutSeconds}s`} />
              <InfoRow
                label="Ubicaciones"
                value={
                  configuredLocations.length > 0
                    ? configuredLocations.join(", ")
                    : "default"
                }
              />
              <InfoRow label="Ultimo estado" value={getStatusLabel(status)} />
              <InfoRow
                label="Ultimo codigo"
                value={
                  latestCheck?.statusCode ? String(latestCheck.statusCode) : "-"
                }
              />
            </div>
          </section>

          <section style={styles.card}>
            <LocationChecksCard locationSummaries={locationSummaries} />
          </section>

          <section style={styles.bottomGrid}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Ultimos checks</h2>
                <span style={styles.helperText}>Orden descendente</span>
              </div>

              <div style={styles.tableHeader}>
                <span>Hora</span>
                <span>Ubicacion</span>
                <span>Estado</span>
                <span>Tiempo</span>
                <span>Codigo</span>
              </div>

              {latestChecks.map((check) => (
                <div key={check.id} style={styles.tableRow}>
                  <span>{formatDateTime(check.checkedAt)}</span>
                  <span>{check.location ?? "default"}</span>
                  <span style={styles.statusInline}>
                    <StatusDot status={check.status} />
                    {getStatusLabel(check.status)}
                  </span>
                  <span>{formatDuration(check.responseTimeMs)}</span>
                  <span>{check.statusCode ?? "-"}</span>
                </div>
              ))}
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Timeline</h2>
                <span style={styles.helperText}>Ultimos eventos</span>
              </div>

              <div style={styles.timeline}>
                {latestChecks.map((check) => (
                  <div key={check.id} style={styles.timelineItem}>
                    <div style={styles.timelineMarkerWrap}>
                      <StatusDot status={check.status} />
                    </div>
                    <div>
                      <strong style={styles.timelineTitle}>
                        {check.location ?? "default"} ·{" "}
                        {getStatusLabel(check.status)} ·{" "}
                        {formatDuration(check.responseTimeMs)}
                      </strong>
                      <p style={styles.timelineMeta}>
                        {formatDateTime(check.checkedAt)}
                      </p>
                      {check.errorMessage ? (
                        <p style={styles.timelineError}>{check.errorMessage}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            padding: "12px 16px",
            borderRadius: 8,
            color: "#fff",
            fontWeight: 600,
            background: toast.type === "ok" ? "#16a34a" : "#dc2626",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 999,
          }}
        >
          {toast.text}
        </div>
      )}
    </main>
  );
}

function KpiCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string | number;
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
      <p style={styles.kpiTitle}>{title}</p>
      <strong style={{ ...styles.kpiValue, color: colors[tone] }}>
        {value}
      </strong>
    </div>
  );
}

function StatusBadge({ status }: { status: MonitorStatus }) {
  const isUp = status === "UP";
  const isDown = status === "DOWN";

  return (
    <span
      style={{
        ...styles.badge,
        background: isUp
          ? toneStyles.green.background
          : isDown
            ? toneStyles.red.background
            : toneStyles.slate.background,
        color: isUp
          ? toneStyles.green.color
          : isDown
            ? toneStyles.red.color
            : toneStyles.slate.color,
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function StatusDot({ status }: { status: MonitorStatus }) {
  return (
    <span
      style={{
        ...styles.statusDot,
        background:
          status === "UP"
            ? uiTheme.colors.success
            : status === "DOWN"
              ? "#dc2626"
              : uiTheme.colors.slate,
      }}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LocationChecksCard({
  locationSummaries,
}: {
  locationSummaries: Array<{
    downChecks: number;
    hasData: boolean;
    latestCheck: MonitorCheck | null;
    location: string;
    totalChecks: number;
    upChecks: number;
  }>;
}) {
  const hasCheckData = locationSummaries.some((summary) => summary.hasData);

  return (
    <>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Comprobaciones desde ubicaciones</h2>
        <span style={styles.helperText}>
          {hasCheckData ? "Datos reales por ubicacion" : "Sin datos todavia"}
        </span>
      </div>

      {!hasCheckData ? (
        <div style={styles.locationEmpty}>
          <strong>Sin resultados por ubicacion</strong>
          <p>
            Este monitor aun no tiene checks ejecutados desde ninguna ubicacion.
          </p>
        </div>
      ) : (
        <div style={styles.locationList}>
          {locationSummaries.map((summary) => (
            <div key={summary.location} style={styles.locationRow}>
              <div>
                <strong style={styles.locationName}>{summary.location}</strong>
                <p style={styles.locationMeta}>
                  {summary.latestCheck
                    ? `Ultimo check ${formatDateTime(summary.latestCheck.checkedAt)}`
                    : "Sin checks"}
                </p>
              </div>

              <div style={styles.locationStats}>
                <span style={styles.locationStat}>{summary.upChecks} ok</span>
                <span style={styles.locationStat}>
                  {summary.downChecks} down
                </span>
                <span style={styles.locationStat}>
                  {summary.totalChecks} total
                </span>
              </div>

              <span style={styles.statusInline}>
                <StatusDot status={summary.latestCheck?.status ?? "UNKNOWN"} />
                {getStatusLabel(summary.latestCheck?.status ?? "UNKNOWN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StatusHistoryChart({ checks }: { checks: MonitorCheck[] }) {
  const width = 720;
  const height = 210;

  if (checks.length === 0) {
    return <EmptyChart label="Sin datos de estado" />;
  }

  const points = checks.map((check, index) => {
    const x =
      checks.length === 1 ? width / 2 : (index / (checks.length - 1)) * width;
    const y = check.status === "UP" ? 40 : 160;
    return `${x} ${y}`;
  });

  const areaPoints = [`0 210`, ...points, `${width} 210`].join(" L");

  return (
    <svg
      width="100%"
      height="210"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={width} height={height} rx="16" fill="#fbfdff" />
      <line
        x1="0"
        y1="40"
        x2={width}
        y2="40"
        stroke="#dbe3ef"
        strokeDasharray="4 6"
      />
      <line
        x1="0"
        y1="100"
        x2={width}
        y2="100"
        stroke="#dbe3ef"
        strokeDasharray="4 6"
      />
      <line
        x1="0"
        y1="160"
        x2={width}
        y2="160"
        stroke="#dbe3ef"
        strokeDasharray="4 6"
      />
      <path
        d={`M ${points.join(" L ")}`}
        fill="none"
        stroke={uiTheme.colors.success}
        strokeWidth="2"
      />
      <path
        d={`M ${areaPoints} Z`}
        fill={uiTheme.colors.success}
        opacity="0.06"
      />
    </svg>
  );
}

function ResponseTimeChart({ checks }: { checks: MonitorCheck[] }) {
  const width = 720;
  const height = 210;
  const values = checks
    .map((check) => check.responseTimeMs)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return <EmptyChart label="Sin tiempos de respuesta" />;
  }

  const maxValue = Math.max(...values, 1);
  const points = checks.map((check, index) => {
    const x =
      checks.length === 1 ? width / 2 : (index / (checks.length - 1)) * width;
    const value = check.responseTimeMs ?? maxValue;
    const y = 25 + ((maxValue - value) / maxValue) * 145;
    return `${x} ${Math.min(185, Math.max(25, y))}`;
  });

  const areaPoints = [`0 210`, ...points, `${width} 210`].join(" L");

  return (
    <svg
      width="100%"
      height="210"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={width} height={height} rx="16" fill="#fbfdff" />
      <line
        x1="0"
        y1="40"
        x2={width}
        y2="40"
        stroke="#dbe3ef"
        strokeDasharray="4 6"
      />
      <line
        x1="0"
        y1="90"
        x2={width}
        y2="90"
        stroke="#dbe3ef"
        strokeDasharray="4 6"
      />
      <line
        x1="0"
        y1="140"
        x2={width}
        y2="140"
        stroke="#dbe3ef"
        strokeDasharray="4 6"
      />
      <path
        d={`M ${points.join(" L ")}`}
        fill="none"
        stroke={uiTheme.colors.primary}
        strokeWidth="2"
      />
      <path
        d={`M ${areaPoints} Z`}
        fill={uiTheme.colors.primary}
        opacity="0.06"
      />
    </svg>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div style={styles.chartEmpty}>{label}</div>;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (value === null) {
    return "-";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${value} ms`;
}

function getStatusLabel(status: MonitorStatus) {
  if (status === "UP") {
    return "Operativo";
  }

  if (status === "DOWN") {
    return "Caido";
  }

  return "Pendiente";
}

function getMaxResponseTime(checks: MonitorCheck[]) {
  const values = checks
    .map((check) => check.responseTimeMs)
    .filter((value): value is number => value !== null);

  return values.length > 0 ? Math.max(...values) : null;
}

function getMinResponseTime(checks: MonitorCheck[]) {
  const values = checks
    .map((check) => check.responseTimeMs)
    .filter((value): value is number => value !== null);

  return values.length > 0 ? Math.min(...values) : null;
}

const styles: Record<string, CSSProperties> = {
  main: pageMain,
  breadcrumb: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
    marginBottom: 22,
  },
  breadcrumbLink: { color: uiTheme.colors.primary, textDecoration: "none" },
  heroCard: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    padding: 24,
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr auto",
    gap: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  heroLeft: { display: "flex", gap: 20, alignItems: "center" },
  monitorIcon: {
    width: 58,
    height: 58,
    borderRadius: uiTheme.radii.lg,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    display: "grid",
    placeItems: "center",
  },
  titleRow: { display: "flex", alignItems: "center", gap: 12 },
  title: pageTitle,
  url: {
    display: "block",
    marginTop: 8,
    color: uiTheme.colors.primary,
    textDecoration: "none",
    fontSize: 13,
  },
  meta: { margin: "12px 0 0", color: uiTheme.colors.muted, fontSize: 12 },
  heroInfo: { color: uiTheme.colors.text, fontSize: 13, lineHeight: 1.8 },
  heroActions: { display: "flex", gap: 10 },
  primaryButton: {
    ...primaryButtonBase,
    borderRadius: uiTheme.radii.sm,
    padding: "0 14px",
    fontWeight: 800,
    cursor: "pointer",
    minHeight: 40,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    borderRadius: uiTheme.radii.sm,
    padding: "0 14px",
    fontWeight: 800,
    cursor: "pointer",
    minHeight: 40,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 14,
  },
  kpiCard: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    padding: 18,
    minHeight: 94,
    display: "grid",
    alignContent: "center",
    gap: 8,
  },
  kpiTitle: {
    margin: 0,
    color: uiTheme.colors.text,
    fontWeight: 800,
    fontSize: 12,
  },
  kpiValue: { display: "block", fontSize: 24, lineHeight: 1.1 },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 310px",
    gap: 14,
    marginBottom: 14,
  },
  bottomGrid: { display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 },
  cardLarge: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    padding: 20,
  },
  card: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    padding: 20,
  },
  infoCard: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    padding: 20,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 800 },
  helperText: { color: uiTheme.colors.muted, fontSize: 12 },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    paddingTop: 14,
  },
  metric: {
    display: "grid",
    gap: 6,
    color: uiTheme.colors.muted,
    fontSize: 11,
  },
  infoRow: {
    display: "grid",
    gridTemplateColumns: "110px 1fr",
    gap: 10,
    padding: "11px 0",
    fontSize: 12,
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  emptyState: {
    minHeight: 220,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: uiTheme.radii.lg,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    display: "grid",
    placeItems: "center",
  },
  badge: {
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
  },
  chartEmpty: {
    height: 210,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.slate,
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    background: uiTheme.colors.background,
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.5fr 0.9fr 1fr 0.8fr 0.7fr",
    gap: 12,
    paddingBottom: 10,
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 700,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 0.9fr 1fr 0.8fr 0.7fr",
    gap: 12,
    alignItems: "center",
    padding: "12px 0",
    fontSize: 12,
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  statusInline: { display: "inline-flex", alignItems: "center", gap: 8 },
  statusDot: {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: 999,
    flexShrink: 0,
  },
  timeline: { display: "grid", gap: 14 },
  timelineItem: {
    display: "grid",
    gridTemplateColumns: "20px 1fr",
    gap: 12,
    alignItems: "start",
    paddingBottom: 12,
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  timelineMarkerWrap: { paddingTop: 4 },
  timelineTitle: { fontSize: 13 },
  timelineMeta: {
    margin: "4px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  timelineError: { margin: "6px 0 0", color: "#b91c1c", fontSize: 12 },
  locationEmpty: {
    minHeight: 140,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  locationList: { display: "grid", gap: 12 },
  locationRow: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "12px 0",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  locationName: { fontSize: 14 },
  locationMeta: {
    margin: "4px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  locationStats: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  locationStat: {
    padding: "4px 8px",
    borderRadius: 999,
    background: uiTheme.colors.background,
  },
};
