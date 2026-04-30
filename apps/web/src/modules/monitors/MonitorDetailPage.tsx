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
import AppTopbar from "../../shared/AppTopbar";
import LoadingState from "../../shared/LoadingState";
import {
  ActivityIcon,
  ClockIcon,
  GlobeIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
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
      lastCheckRelative: latestCheck
        ? formatRelativeTime(latestCheck.checkedAt)
        : "Sin checks",
    };
  }, [checks, latestCheck]);

  if (loading) {
    return (
      <main style={styles.main}>
        <LoadingState variant="page" label="Cargando monitor" />
      </main>
    );
  }

  if (!monitor) {
    return <main style={styles.main}>Monitor no encontrado</main>;
  }

  const isDown = status === "DOWN";
  const isPaused = !monitor.isActive;

  return (
    <main style={styles.main}>
      <AppTopbar
        title="Detalle de monitor"
        subtitle={monitor.name}
        onRefresh={loadData}
        cta={{
          icon: <PlusIcon size={16} />,
          label: "Nuevo monitor",
          to: "/monitors/create",
        }}
      />

      <div style={styles.breadcrumb}>
        <Link to="/dashboard" style={styles.breadcrumbLink}>
          Webs monitorizadas
        </Link>
        <span>/</span>
        <strong>{monitor.name}</strong>
      </div>

      {isDown && (
        <section style={styles.alertBanner}>
          <div>
            <strong>Monitor caído</strong>
            <p>
              La última comprobación ha fallado. Revisa el endpoint, el código
              esperado o la conectividad desde las ubicaciones configuradas.
            </p>
          </div>
          <span style={styles.alertMeta}>
            Último check: {stats.lastCheckRelative}
          </span>
        </section>
      )}

      <section style={styles.heroCard}>
        <div style={styles.heroLeft}>
          <div
            style={{
              ...styles.monitorIcon,
              background: getStatusSoftBackground(status),
              color: getStatusColor(status),
            }}
          >
            <GlobeIcon size={26} />
          </div>

          <div style={styles.heroText}>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>{monitor.name}</h1>
              <StatusBadge status={status} />
              {isPaused && <span style={styles.pausedBadge}>Pausado</span>}
            </div>

            <a
              href={monitor.target}
              target="_blank"
              rel="noreferrer"
              style={styles.url}
            >
              {monitor.target}
            </a>

            <div style={styles.metaRow}>
              <span>ID: MON-{String(monitor.id).padStart(4, "0")}</span>
              <span>Tipo: {monitor.type}</span>
              <span>Frecuencia: {monitor.frequencySeconds}s</span>
              <span>Timeout: {monitor.timeoutSeconds}s</span>
            </div>
          </div>
        </div>

        <div style={styles.heroRight}>
          <div style={styles.lastCheckBox}>
            <span>Último check</span>
            <strong>{stats.lastCheckRelative}</strong>
            <small>{stats.lastCheck}</small>
          </div>

          <div style={styles.heroActions}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={handleRunCheck}
              disabled={checking}
            >
              {!checking && <ActivityIcon size={15} />}
              {checking ? (
                <LoadingState variant="button" label="Comprobando monitor" />
              ) : (
                "Comprobar ahora"
              )}
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={handleToggleActive}
              disabled={toggling}
            >
              {!toggling && (
                monitor.isActive ? (
                  <PauseIcon size={15} />
                ) : (
                  <PlayIcon size={15} />
                )
              )}
              {toggling ? (
                <LoadingState variant="button" label="Actualizando monitor" />
              ) : monitor.isActive ? (
                "Pausar"
              ) : (
                "Reanudar"
              )}
            </button>
          </div>
        </div>
      </section>

      <section style={styles.kpiGrid}>
        <KpiCard
          title="Disponibilidad"
          value={stats.availability}
          description="Según checks registrados"
          tone={isDown ? "red" : "green"}
        />

        <KpiCard
          title="Tiempo medio"
          value={stats.averageResponseTime}
          description="Latencia promedio"
          tone="blue"
        />

        <KpiCard
          title="Checks totales"
          value={stats.totalChecks}
          description="Histórico guardado"
          tone="slate"
        />

        <KpiCard
          title="Fallos"
          value={stats.failures}
          description="Checks con caída"
          tone={stats.failures > 0 ? "red" : "green"}
        />

        <KpiCard
          title="Estado actual"
          value={getStatusLabel(status)}
          description={isPaused ? "Monitor pausado" : "Monitor activo"}
          tone={isDown ? "red" : status === "UP" ? "green" : "orange"}
        />
      </section>

      {checks.length === 0 ? (
        <>
          <section style={styles.card}>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <ClockIcon size={24} />
              </div>
              <strong>Aún no hay checks registrados</strong>
              <p>
                Ejecuta una comprobación manual o espera al scheduler para ver
                datos reales del monitor.
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
                <div>
                  <h2 style={styles.cardTitle}>Estado de checks</h2>
                  <p style={styles.cardSubtitle}>
                    Últimos estados registrados por el monitor
                  </p>
                </div>
                <span style={styles.helperText}>Últimos 50 registros</span>
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
                  label="Caídas"
                  value={String(
                    checks.filter((check) => check.status === "DOWN").length,
                  )}
                />
                <Metric
                  label="Primer check"
                  value={formatShortDate(checksAsc[0]?.checkedAt)}
                />
                <Metric
                  label="Último check"
                  value={formatShortDate(latestCheck?.checkedAt)}
                />
              </div>
            </div>

            <div style={styles.cardLarge}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Tiempo de respuesta</h2>
                  <p style={styles.cardSubtitle}>
                    Evolución de latencia en milisegundos
                  </p>
                </div>
                <span style={styles.helperText}>responseTimeMs</span>
              </div>

              <ResponseTimeChart checks={checksAsc} />

              <div style={styles.summaryGrid}>
                <Metric
                  label="Último"
                  value={formatDuration(latestCheck?.responseTimeMs ?? null)}
                />
                <Metric label="Media" value={stats.averageResponseTime} />
                <Metric
                  label="Máximo"
                  value={formatDuration(getMaxResponseTime(checks))}
                />
                <Metric
                  label="Mínimo"
                  value={formatDuration(getMinResponseTime(checks))}
                />
              </div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.cardHeaderCompact}>
                <h2 style={styles.cardTitle}>Información</h2>
                <StatusBadge status={status} />
              </div>

              <InfoRow label="URL" value={monitor.target} strong />
              <InfoRow label="Protocolo" value={monitor.type} />
              <InfoRow
                label="Código esperado"
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
              <InfoRow label="Último estado" value={getStatusLabel(status)} />
              <InfoRow
                label="Último código"
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
                <div>
                  <h2 style={styles.cardTitle}>Últimos checks</h2>
                  <p style={styles.cardSubtitle}>
                    Registros más recientes del monitor
                  </p>
                </div>
                <span style={styles.helperText}>Orden descendente</span>
              </div>

              <div style={styles.tableHeader}>
                <span>Hora</span>
                <span>Ubicación</span>
                <span>Estado</span>
                <span>Tiempo</span>
                <span>Código</span>
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
                <div>
                  <h2 style={styles.cardTitle}>Timeline</h2>
                  <p style={styles.cardSubtitle}>
                    Últimos eventos técnicos registrados
                  </p>
                </div>
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
                        <p style={styles.timelineError}>
                          {check.errorMessage}
                        </p>
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
            ...styles.toast,
            background: toast.type === "ok" ? "#16a34a" : "#dc2626",
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
  description,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  tone: "green" | "blue" | "orange" | "red" | "slate";
}) {
  return (
    <div
      style={{
        ...styles.kpiCard,
        borderColor: getToneBorder(tone),
      }}
    >
      <p style={styles.kpiTitle}>{title}</p>
      <strong style={{ ...styles.kpiValue, color: getToneColor(tone) }}>
        {value}
      </strong>
      <span style={styles.kpiDescription}>{description}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: MonitorStatus }) {
  return (
    <span
      style={{
        ...styles.badge,
        background: getStatusSoftBackground(status),
        color: getStatusColor(status),
      }}
    >
      <StatusDot status={status} />
      {getStatusLabel(status)}
    </span>
  );
}

function StatusDot({ status }: { status: MonitorStatus }) {
  return (
    <span
      style={{
        ...styles.statusDot,
        background: getStatusColor(status),
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

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={styles.infoRow}>
      <span>{label}</span>
      <strong
        style={{
          fontWeight: strong ? 700 : 600,
          wordBreak: "break-word",
        }}
      >
        {value}
      </strong>
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
        <div>
          <h2 style={styles.cardTitle}>Comprobaciones por ubicación</h2>
          <p style={styles.cardSubtitle}>
            Estado distribuido según cada localización configurada
          </p>
        </div>

        <span style={styles.helperText}>
          {hasCheckData ? "Datos reales por ubicación" : "Sin datos todavía"}
        </span>
      </div>

      {!hasCheckData ? (
        <div style={styles.locationEmpty}>
          <strong>Sin resultados por ubicación</strong>
          <p>
            Este monitor todavía no tiene checks ejecutados desde ninguna
            ubicación.
          </p>
        </div>
      ) : (
        <div style={styles.locationList}>
          {locationSummaries.map((summary) => {
            const latestStatus = summary.latestCheck?.status ?? "UNKNOWN";
            const availability =
              summary.totalChecks > 0
                ? Math.round((summary.upChecks / summary.totalChecks) * 100)
                : 0;

            return (
              <div key={summary.location} style={styles.locationRow}>
                <div>
                  <strong style={styles.locationName}>
                    {summary.location}
                  </strong>
                  <p style={styles.locationMeta}>
                    {summary.latestCheck
                      ? `Último check ${formatDateTime(summary.latestCheck.checkedAt)}`
                      : "Sin checks"}
                  </p>
                </div>

                <div style={styles.locationProgressWrap}>
                  <div style={styles.locationProgressTrack}>
                    <div
                      style={{
                        ...styles.locationProgressFill,
                        width: `${availability}%`,
                        background: getStatusColor(latestStatus),
                      }}
                    />
                  </div>
                  <span style={styles.locationMeta}>
                    {availability}% disponibilidad
                  </span>
                </div>

                <div style={styles.locationStats}>
                  <span style={styles.locationStat}>{summary.upChecks} ok</span>
                  <span style={styles.locationStat}>
                    {summary.downChecks} down
                  </span>
                  <span style={styles.statusInline}>
                    <StatusDot status={latestStatus} />
                    {getStatusLabel(latestStatus)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatusHistoryChart({ checks }: { checks: MonitorCheck[] }) {
  const visibleChecks = checks.slice(-50);

  if (visibleChecks.length === 0) {
    return <EmptyChart label="Sin datos de estado" />;
  }

  return (
    <div style={styles.statusTimelineChart}>
      {visibleChecks.map((check) => (
        <div
          key={check.id}
          title={`${formatDateTime(check.checkedAt)} · ${getStatusLabel(
            check.status,
          )}`}
          style={{
            ...styles.statusTimelineItem,
            background: getStatusColor(check.status),
            opacity: check.status === "UNKNOWN" ? 0.45 : 1,
          }}
        />
      ))}
    </div>
  );
}

function ResponseTimeChart({ checks }: { checks: MonitorCheck[] }) {
  const width = 720;
  const height = 210;

  const visibleChecks = checks.slice(-50);
  const values = visibleChecks
    .map((check) => check.responseTimeMs)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return <EmptyChart label="Sin tiempos de respuesta" />;
  }

  const maxValue = Math.max(...values, 1);

  const points = visibleChecks.map((check, index) => {
    const x =
      visibleChecks.length === 1
        ? width / 2
        : (index / (visibleChecks.length - 1)) * width;

    const value = check.responseTimeMs ?? maxValue;
    const y = 25 + ((maxValue - value) / maxValue) * 145;

    return {
      x,
      y: Math.min(185, Math.max(25, y)),
      check,
    };
  });

  const path = points.map((point) => `${point.x} ${point.y}`).join(" L ");
  const areaPath = [`0 210`, ...points.map((p) => `${p.x} ${p.y}`), `${width} 210`].join(
    " L",
  );

  return (
    <svg
      width="100%"
      height="210"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={width} height={height} rx="16" fill="#fbfdff" />

      {[40, 90, 140].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2={width}
          y2={y}
          stroke="#dbe3ef"
          strokeDasharray="4 6"
        />
      ))}

      <path
        d={`M ${areaPath} Z`}
        fill={uiTheme.colors.primary}
        opacity="0.08"
      />

      <path
        d={`M ${path}`}
        fill="none"
        stroke={uiTheme.colors.primary}
        strokeWidth="2.5"
      />

      {points.map((point) =>
        point.check.status === "DOWN" ? (
          <circle
            key={point.check.id}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="#dc2626"
          />
        ) : null,
      )}
    </svg>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div style={styles.chartEmpty}>{label}</div>;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Sin checks";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "Ahora mismo";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} días`;
}

function formatDuration(value: number | null) {
  if (value === null) return "-";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${value} ms`;
}

function getStatusLabel(status: MonitorStatus) {
  if (status === "UP") return "Operativo";
  if (status === "DOWN") return "Caído";
  return "Pendiente";
}

function getStatusColor(status: MonitorStatus) {
  if (status === "UP") return uiTheme.colors.success;
  if (status === "DOWN") return "#dc2626";
  return uiTheme.colors.slate;
}

function getStatusSoftBackground(status: MonitorStatus) {
  if (status === "UP") return toneStyles.green.background;
  if (status === "DOWN") return toneStyles.red.background;
  return toneStyles.slate.background;
}

function getToneColor(tone: "green" | "blue" | "orange" | "red" | "slate") {
  const colors = {
    green: uiTheme.colors.success,
    blue: uiTheme.colors.primary,
    orange: uiTheme.colors.warning,
    red: "#dc2626",
    slate: uiTheme.colors.text,
  };

  return colors[tone];
}

function getToneBorder(tone: "green" | "blue" | "orange" | "red" | "slate") {
  const colors = {
    green: "rgba(22, 163, 74, 0.22)",
    blue: "rgba(37, 99, 235, 0.22)",
    orange: "rgba(245, 158, 11, 0.24)",
    red: "rgba(220, 38, 38, 0.24)",
    slate: "rgba(148, 163, 184, 0.22)",
  };

  return colors[tone];
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
  main: {
    ...pageMain,
    paddingBottom: 48,
  },

  breadcrumb: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
    marginBottom: 18,
  },

  breadcrumbLink: {
    color: uiTheme.colors.primary,
    textDecoration: "none",
    fontWeight: 600,
  },

  alertBanner: {
    border: "1px solid rgba(220, 38, 38, 0.18)",
    background:
      "linear-gradient(135deg, rgba(254, 242, 242, 0.96), rgba(255, 255, 255, 0.98))",
    borderRadius: uiTheme.radii.md,
    padding: "16px 18px",
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    boxShadow: "0 12px 30px rgba(220, 38, 38, 0.08)",
  },

  alertMeta: {
    color: "#991b1b",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  heroCard: {
    ...surfaceCard,
    borderRadius: 22,
    padding: 24,
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "center",
    marginBottom: 18,
    border: `1px solid ${uiTheme.colors.border}`,
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
  },

  heroLeft: {
    display: "flex",
    gap: 20,
    alignItems: "center",
    minWidth: 0,
  },

  heroText: {
    minWidth: 0,
  },

  monitorIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  title: {
    ...pageTitle,
    margin: 0,
    fontSize: 27,
    letterSpacing: "-0.04em",
  },

  url: {
    display: "block",
    marginTop: 8,
    color: uiTheme.colors.primary,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 620,
  },

  metaRow: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  heroRight: {
    display: "flex",
    gap: 18,
    alignItems: "center",
    flexShrink: 0,
  },

  lastCheckBox: {
    display: "grid",
    gap: 3,
    minWidth: 150,
    padding: "12px 14px",
    borderRadius: 16,
    background: uiTheme.colors.background,
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  heroActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  primaryButton: {
    ...primaryButtonBase,
    borderRadius: 13,
    padding: "0 16px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.22)",
  },

  secondaryButton: {
    ...secondaryButtonBase,
    borderRadius: 13,
    padding: "0 16px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 42,
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
    borderRadius: 18,
    padding: 18,
    minHeight: 110,
    display: "grid",
    alignContent: "center",
    gap: 7,
    border: "1px solid transparent",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  kpiTitle: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontWeight: 700,
    fontSize: 12,
  },

  kpiValue: {
    display: "block",
    fontSize: 26,
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
  },

  kpiDescription: {
    color: uiTheme.colors.muted,
    fontSize: 11,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 320px",
    gap: 14,
    marginBottom: 14,
  },

  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 1fr",
    gap: 14,
    marginTop: 14,
  },

  cardLarge: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  card: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  infoCard: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
  },

  cardHeaderCompact: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },

  cardSubtitle: {
    margin: "5px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  helperText: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    paddingTop: 14,
  },

  metric: {
    display: "grid",
    gap: 5,
    color: uiTheme.colors.muted,
    fontSize: 11,
  },

  infoRow: {
    display: "grid",
    gridTemplateColumns: "110px 1fr",
    gap: 10,
    padding: "12px 0",
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
    borderRadius: 20,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    display: "grid",
    placeItems: "center",
  },

  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },

  pausedBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#92400e",
    background: "#fef3c7",
  },

  chartEmpty: {
    height: 210,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.slate,
    border: "1px dashed #cbd5e1",
    borderRadius: 16,
    background: uiTheme.colors.background,
  },

  statusTimelineChart: {
    minHeight: 210,
    padding: 18,
    borderRadius: 16,
    background:
      "linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 1))",
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
    display: "flex",
    alignItems: "stretch",
    gap: 5,
    overflow: "hidden",
    marginBottom: 14,
  },

  statusTimelineItem: {
    flex: 1,
    minWidth: 5,
    borderRadius: 999,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
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

  statusInline: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
  },

  statusDot: {
    display: "inline-block",
    width: 9,
    height: 9,
    borderRadius: 999,
    flexShrink: 0,
  },

  timeline: {
    display: "grid",
    gap: 14,
  },

  timelineItem: {
    display: "grid",
    gridTemplateColumns: "20px 1fr",
    gap: 12,
    alignItems: "start",
    paddingBottom: 12,
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  timelineMarkerWrap: {
    paddingTop: 4,
  },

  timelineTitle: {
    fontSize: 13,
  },

  timelineMeta: {
    margin: "4px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  timelineError: {
    margin: "7px 0 0",
    color: "#b91c1c",
    fontSize: 12,
    padding: "8px 10px",
    background: "#fef2f2",
    borderRadius: 10,
  },

  locationEmpty: {
    minHeight: 140,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },

  locationList: {
    display: "grid",
    gap: 12,
  },

  locationRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: 18,
    alignItems: "center",
    padding: "14px 0",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  locationName: {
    fontSize: 14,
  },

  locationMeta: {
    margin: "4px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  locationProgressWrap: {
    display: "grid",
    gap: 7,
  },

  locationProgressTrack: {
    height: 8,
    borderRadius: 999,
    background: uiTheme.colors.background,
    overflow: "hidden",
  },

  locationProgressFill: {
    height: "100%",
    borderRadius: 999,
  },

  locationStats: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  locationStat: {
    padding: "5px 9px",
    borderRadius: 999,
    background: uiTheme.colors.background,
    fontWeight: 700,
  },

  toast: {
    position: "fixed",
    bottom: 20,
    right: 20,
    padding: "12px 16px",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 700,
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    zIndex: 999,
  },
};
