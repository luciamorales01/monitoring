import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import "./monitor.css";
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
import { downloadReportExport, type ReportFormat, type ReportRange } from "../../shared/reportsApi";
import { useCurrentUserPermissions } from "../../shared/permissions";
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

type PeriodFilter = "1h" | "24h" | "7d" | "30d" | "all";

export default function MonitorDetailPage() {
  const { id } = useParams();
  const monitorId = Number(id);
  const { canWrite: canWriteActions } = useCurrentUserPermissions();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<MonitorCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState<MonitorStatusToast>(null);
  const [exportRange, setExportRange] = useState<ReportRange>("7d");
  const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(null);
  const [customExportFrom, setCustomExportFrom] = useState("");
  const [customExportTo, setCustomExportTo] = useState("");

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
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

  useEffect(() => {
    if (!Number.isFinite(monitorId) || monitorId <= 0 || !monitor?.isActive) {
      return;
    }

    const intervalMs = Math.min(
      30000,
      Math.max(10000, monitor.frequencySeconds * 1000),
    );

    const intervalId = window.setInterval(() => {
      void loadData().catch(() => undefined);
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [monitor?.frequencySeconds, monitor?.isActive, monitorId]);

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


  const handleExportReport = async (format: ReportFormat) => {
    try {
      setExportingFormat(format);
      await downloadReportExport(exportRange, format, {
        monitorId,
        from: customExportFrom ? new Date(customExportFrom).toISOString() : undefined,
        to: customExportTo ? new Date(customExportTo).toISOString() : undefined,
      });
      setToast({ text: "Informe exportado", type: "ok" });
    } catch {
      setToast({ text: "No se pudo exportar el informe", type: "error" });
    } finally {
      setExportingFormat(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const status = monitor?.currentStatus ?? "UNKNOWN";
  const latestCheck = checks[0] ?? null;
  const latestChecks = checks.slice(0, 10);

  const filteredChecks = useMemo(() => {
    const now = Date.now();

    return checks.filter((check) => {
      if (periodFilter === "all") return true;

      const checkedAt = new Date(check.checkedAt).getTime();
      const periodMs = getPeriodMs(periodFilter);

      return now - checkedAt <= periodMs;
    });
  }, [checks, periodFilter]);

  const checksAsc = useMemo(() => [...filteredChecks].reverse(), [filteredChecks]);

  const stats = useMemo(() => {
    const total = checks.length;
    const upChecks = checks.filter((check) => check.status === "UP").length;
    const downChecks = checks.filter((check) => check.status === "DOWN").length;

    const responseTimes = getResponseTimes(checks);
    const averageResponseTime = getAverage(responseTimes);

    return {
      availability:
        total > 0 ? `${((upChecks / total) * 100).toFixed(1)}%` : "-",
      averageResponseTime:
        averageResponseTime !== null ? formatDuration(averageResponseTime) : "-",
      totalChecks: total,
      failures: downChecks,
      lastCheck: latestCheck ? formatDateTime(latestCheck.checkedAt) : "-",
      lastCheckRelative: latestCheck
        ? formatRelativeTime(latestCheck.checkedAt)
        : "Sin checks",
    };
  }, [checks, latestCheck]);

  const filteredStats = useMemo(() => {
    const total = filteredChecks.length;
    const up = filteredChecks.filter((check) => check.status === "UP").length;
    const down = filteredChecks.filter((check) => check.status === "DOWN").length;
    const unknown = filteredChecks.filter(
      (check) => check.status !== "UP" && check.status !== "DOWN",
    ).length;

    const responseTimes = getResponseTimes(filteredChecks);

    return {
      total,
      up,
      down,
      unknown,
      average: getAverage(responseTimes),
      p95: getPercentile(responseTimes, 95),
      max: responseTimes.length > 0 ? Math.max(...responseTimes) : null,
      min: responseTimes.length > 0 ? Math.min(...responseTimes) : null,
      uptime: total > 0 ? `${((up / total) * 100).toFixed(1)}%` : "-",
    };
  }, [filteredChecks]);

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
    <main style={styles.main} className="monitor-detail-page">
      <AppTopbar
        title="Detalle de monitor"
        subtitle={monitor.name}
        onRefresh={loadData}
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

      <div style={styles.breadcrumb} className="monitor-detail-breadcrumb">
        <Link to="/dashboard" style={styles.breadcrumbLink}>
          Webs monitorizadas
        </Link>
        <span>/</span>
        <strong>{monitor.name}</strong>
      </div>

      {isDown && (
        <section style={styles.alertBanner} className="monitor-detail-alert">
          <div>
            <strong>Monitor caído</strong>
            <p>
              La última comprobación ha fallado. Revisa el endpoint y el código
              HTTP esperado.
            </p>
          </div>
          <span style={styles.alertMeta}>
            Último check: {stats.lastCheckRelative}
          </span>
        </section>
      )}

      <section style={styles.heroCard} className="monitor-detail-hero">
        <div style={styles.heroLeft} className="monitor-detail-hero-left">
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

        <div style={styles.heroRight} className="monitor-detail-hero-right">
          <div style={styles.lastCheckBox} className="monitor-detail-last-check">
            <span>Último check</span>
            <strong>{stats.lastCheckRelative}</strong>
            <small>{stats.lastCheck}</small>
          </div>

          {canWriteActions ? (
            <div style={styles.heroActions} className="monitor-detail-actions">
              <button
                type="button"
                style={styles.primaryButton}
                className="monitor-detail-button monitor-detail-button-primary"
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
                className="monitor-detail-button monitor-detail-button-secondary"
                onClick={handleToggleActive}
                disabled={toggling}
              >
                {!toggling &&
                  (monitor.isActive ? (
                    <PauseIcon size={15} />
                  ) : (
                    <PlayIcon size={15} />
                  ))}
                {toggling ? (
                  <LoadingState variant="button" label="Actualizando monitor" />
                ) : monitor.isActive ? (
                  "Pausar"
                ) : (
                  "Reanudar"
                )}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section style={styles.kpiGrid} className="monitor-detail-kpi-grid">
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


      <section style={styles.exportCard} className="monitor-detail-export">
        <div>
          <h2 style={styles.exportTitle}>Exportar informe de este monitor</h2>
          <p style={styles.exportSubtitle}>
            Genera un informe filtrado solo para {monitor.name}, con SLA, checks e incidencias del periodo seleccionado.
          </p>
        </div>

        <div style={styles.exportControls} className="monitor-detail-export-controls">
          <select
            value={exportRange}
            onChange={(event) => setExportRange(event.target.value as ReportRange)}
            style={styles.select}
          >
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="custom">Personalizado</option>
          </select>
          {exportRange === "custom" ? (
            <>
              <input
                type="date"
                value={customExportFrom}
                onChange={(event) => setCustomExportFrom(event.target.value)}
                style={styles.select}
              />
              <input
                type="date"
                value={customExportTo}
                onChange={(event) => setCustomExportTo(event.target.value)}
                style={styles.select}
              />
            </>
          ) : null}

          <button
            type="button"
            style={styles.secondaryButton}
            className="monitor-detail-button monitor-detail-button-secondary"
            onClick={() => void handleExportReport("csv")}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === "csv" ? "Exportando..." : "CSV"}
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            className="monitor-detail-button monitor-detail-button-secondary"
            onClick={() => void handleExportReport("xlsx")}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === "xlsx" ? "Exportando..." : "Excel"}
          </button>

          <button
            type="button"
            style={styles.primaryButton}
            className="monitor-detail-button monitor-detail-button-primary"
            onClick={() => void handleExportReport("pdf")}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === "pdf" ? "Exportando..." : "PDF"}
          </button>
        </div>
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

          </>
        ) : (
        <>
          <section style={styles.chartToolbarCard} className="monitor-detail-toolbar">
            <div>
                <strong style={styles.toolbarTitle}>Vista de gráficas</strong>
                <p style={styles.cardSubtitle}>
                  Filtra el histórico por periodo.
                </p>
              </div>

              <div style={styles.toolbarControls} className="monitor-detail-toolbar-controls">
              <SegmentedControl
                value={periodFilter}
                onChange={setPeriodFilter}
                options={[
                  { label: "1h", value: "1h" },
                  { label: "24h", value: "24h" },
                  { label: "7 días", value: "7d" },
                  { label: "30 días", value: "30d" },
                  { label: "Todo", value: "all" },
                ]}
              />

            </div>
          </section>

          <section style={styles.grid} className="monitor-detail-grid">
            <div style={styles.cardLarge} className="monitor-detail-surface monitor-detail-card-large">
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Disponibilidad</h2>
                  <p style={styles.cardSubtitle}>
                    Últimos estados registrados sin mezclar latencia.
                  </p>
                </div>
                <span style={styles.helperText}>
                  {filteredStats.total} registros
                </span>
              </div>

              <StatusHistoryChart checks={checksAsc} />

              <div style={styles.legendRow}>
                <LegendItem status="UP" label="Operativo" />
                <LegendItem status="DOWN" label="Caído" />
                <LegendItem status="UNKNOWN" label="Pendiente" />
              </div>

              <div style={styles.summaryGrid}>
                <Metric label="Operativos" value={String(filteredStats.up)} />
                <Metric label="Caídas" value={String(filteredStats.down)} />
                <Metric label="Pendientes" value={String(filteredStats.unknown)} />
                <Metric label="Uptime" value={filteredStats.uptime} />
              </div>
            </div>

            <div style={styles.cardLarge} className="monitor-detail-surface monitor-detail-card-large">
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Tiempo de respuesta</h2>
                  <p style={styles.cardSubtitle}>
                    Latencia de checks con respuesta válida.
                  </p>
                </div>
                <span style={styles.helperText}>ms</span>
              </div>

              <ResponseTimeChart
                checks={checksAsc}
                timeoutMs={monitor.timeoutSeconds * 1000}
              />

              <div style={styles.summaryGrid}>
                <Metric
                  label="Último"
                  value={formatDuration(latestCheck?.responseTimeMs ?? null)}
                />
                <Metric
                  label="Media"
                  value={formatDuration(filteredStats.average)}
                />
                <Metric label="P95" value={formatDuration(filteredStats.p95)} />
                <Metric
                  label="Máximo"
                  value={formatDuration(filteredStats.max)}
                />
              </div>
            </div>

            <div style={styles.infoCard} className="monitor-detail-surface monitor-detail-info-card">
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
              <InfoRow label="Último estado" value={getStatusLabel(status)} />
              <InfoRow
                label="Último código"
                value={
                  latestCheck?.statusCode ? String(latestCheck.statusCode) : "-"
                }
              />
            </div>
          </section>

          <section style={styles.bottomGrid} className="monitor-detail-bottom-grid">
            <div style={styles.card} className="monitor-detail-surface monitor-detail-card">
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Últimos checks</h2>
                  <p style={styles.cardSubtitle}>
                    Registros más recientes del monitor.
                  </p>
                </div>
                <span style={styles.helperText}>Orden descendente</span>
              </div>

              <div style={styles.tableHeader}>
                <span>Hora</span>
                <span>Estado</span>
                <span>Tiempo</span>
                <span>Código</span>
              </div>

              {latestChecks.map((check) => (
                <div key={check.id} style={styles.tableRow} className="monitor-detail-table-row">
                  <span>{formatDateTime(check.checkedAt)}</span>
                  <span style={styles.statusInline}>
                    <StatusDot status={check.status} />
                    {getStatusLabel(check.status)}
                  </span>
                  <span>{formatDuration(check.responseTimeMs)}</span>
                  <span>{check.statusCode ?? "-"}</span>
                </div>
              ))}
            </div>

            <div style={styles.card} className="monitor-detail-surface monitor-detail-card">
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Timeline</h2>
                  <p style={styles.cardSubtitle}>
                    Últimos eventos técnicos registrados.
                  </p>
                </div>
              </div>

              <div style={styles.timeline}>
                {latestChecks.map((check) => (
                  <div key={check.id} style={styles.timelineItem} className="monitor-detail-timeline-item">
                    <div style={styles.timelineMarkerWrap}>
                      <StatusDot status={check.status} />
                    </div>

                    <div>
                      <strong style={styles.timelineTitle}>
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
    <div style={{ ...styles.kpiCard, borderColor: getToneBorder(tone) }}>
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

function StatusHistoryChart({ checks }: { checks: MonitorCheck[] }) {
  const visibleChecks = checks.slice(-50);

  if (visibleChecks.length === 0) {
    return <EmptyChart label="Sin datos de estado para este filtro" />;
  }

  return (
    <div style={styles.statusChartWrap}>
      <div style={styles.statusTimelineTrack}>
        {visibleChecks.map((check) => {
          const isDown = check.status === "DOWN";

          return (
            <div
              key={check.id}
              title={`${formatDateTime(check.checkedAt)} · ${getStatusLabel(
                check.status,
              )} · código ${
                check.statusCode ?? "-"
              } · ${formatDuration(check.responseTimeMs)}`}
              style={{
                ...styles.statusTimelineSegment,
                height: isDown ? 84 : 46,
                background: getStatusColor(check.status),
                opacity: check.status === "UNKNOWN" ? 0.5 : 1,
              }}
            />
          );
        })}
      </div>

      <div style={styles.statusEventRow}>
        {visibleChecks.map((check) => (
          <div key={check.id} style={styles.statusEventSlot}>
            {check.status === "DOWN" ? (
              <span
                title={check.errorMessage || "Check fallido"}
                style={styles.statusEventMarker}
              />
            ) : null}
          </div>
        ))}
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
    (check) => typeof check.responseTimeMs === "number",
  );

  if (validChecks.length === 0) {
    return <EmptyChart label="Sin tiempos de respuesta para este filtro" />;
  }

  const values = validChecks.map((check) => check.responseTimeMs as number);
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
              {`${formatDateTime(point.check.checkedAt)} · ${getStatusLabel(point.check.status)} · ${formatDuration(
                point.check.responseTimeMs,
              )}`}
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

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: React.Dispatch<React.SetStateAction<T>>;
  options: Array<{ label: string; value: T }>;
}) {
  return (
    <div style={styles.segmentedControl}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              ...styles.segmentedButton,
              ...(active ? styles.segmentedButtonActive : null),
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function LegendItem({
  status,
  label,
}: {
  status: MonitorStatus;
  label: string;
}) {
  return (
    <span style={styles.legendItem}>
      <StatusDot status={status} />
      {label}
    </span>
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
  if (value === null || Number.isNaN(value)) return "-";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
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

function getResponseTimes(checks: MonitorCheck[]) {
  return checks
    .map((check) => check.responseTimeMs)
    .filter((value): value is number => value !== null);
}

function getAverage(values: number[]) {
  if (values.length === 0) return null;

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function getPercentile(values: number[], percentile: number) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function getPeriodMs(period: PeriodFilter) {
  const hour = 60 * 60 * 1000;

  const periods: Record<PeriodFilter, number> = {
    "1h": hour,
    "24h": 24 * hour,
    "7d": 7 * 24 * hour,
    "30d": 30 * 24 * hour,
    all: Number.POSITIVE_INFINITY,
  };

  return periods[period];
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
    background: uiTheme.colors.dangerSoft,
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
    color: uiTheme.colors.danger,
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
    letterSpacing: "0em",
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
    background: uiTheme.colors.surfaceSoft,
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

  exportCard: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  exportTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "0em",
  },

  exportSubtitle: {
    margin: "6px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
    maxWidth: 620,
  },

  exportControls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
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
    letterSpacing: "0em",
  },

  kpiDescription: {
    color: uiTheme.colors.muted,
    fontSize: 11,
  },

  chartToolbarCard: {
    ...surfaceCard,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
  },

  toolbarTitle: {
    fontSize: 14,
  },

  toolbarControls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  segmentedControl: {
    display: "inline-flex",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    background: uiTheme.colors.surfaceSoft,
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },

  segmentedButton: {
    border: "none",
    background: "transparent",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 700,
    color: uiTheme.colors.muted,
    cursor: "pointer",
  },

  segmentedButtonActive: {
    background: uiTheme.colors.surface,
    color: uiTheme.colors.primary,
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
  },

  select: {
    minHeight: 36,
    borderRadius: 999,
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
    background: "var(--control-bg)",
    color: uiTheme.colors.text,
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 700,
    outline: "none",
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
    letterSpacing: "0em",
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
    height: 230,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.slate,
    border: `1px dashed ${uiTheme.colors.borderStrong}`,
    borderRadius: 16,
    background: uiTheme.colors.surfaceSoft,
  },

  statusChartWrap: {
    height: 230,
    padding: 18,
    borderRadius: 16,
    background: uiTheme.colors.surface,
    border: `1px solid ${uiTheme.colors.surfaceSoft}`,
    marginBottom: 12,
    display: "grid",
    gridTemplateRows: "1fr 18px",
    gap: 10,
  },

  statusTimelineTrack: {
    display: "flex",
    alignItems: "end",
    gap: 3,
    minHeight: 150,
  },

  statusTimelineSegment: {
    flex: 1,
    minWidth: 3,
    borderRadius: "999px 999px 8px 8px",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
    transition: "height 160ms ease, opacity 160ms ease",
  },

  statusEventRow: {
    display: "flex",
    gap: 3,
    alignItems: "center",
  },

  statusEventSlot: {
    flex: 1,
    minWidth: 3,
    display: "grid",
    placeItems: "center",
  },

  statusEventMarker: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: "#dc2626",
    boxShadow: "0 0 0 4px rgba(220, 38, 38, 0.1)",
  },

  legendRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  legendItem: {
    display: "inline-flex",
    gap: 7,
    alignItems: "center",
    fontWeight: 700,
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
    background: uiTheme.colors.dangerSoft,
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
    background: uiTheme.colors.surfaceSoft,
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
    background: uiTheme.colors.surfaceSoft,
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
