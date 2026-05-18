import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Link, useParams } from "react-router-dom";
import "./monitor.css";
import {
  getMonitor,
  getMonitorChecks,
  runMonitorCheck,
  toggleMonitorActive,
  type Monitor,
  type MonitorCheck,
  type UpdateMonitorInput,
} from "../../shared/monitorApi";
import {
  getMonitorStatusToast,
  type MonitorStatusToast,
} from "../../shared/monitorStatusToast";
import { useUpdateMonitorMutation } from "../../shared/monitorQueries";
import {
  downloadReportExport,
  type ReportFormat,
  type ReportRange,
} from "../../shared/reportsApi";
import { useCurrentUserPermissions } from "../../shared/permissions";
import AppTopbar from "../../shared/AppTopbar";
import LoadingState from "../../shared/LoadingState";
import { PlusIcon } from "../../shared/uiIcons";
import { MonitorChartsToolbar } from "./components/MonitorChartsToolbar";
import { MonitorChecksEmptyState } from "./components/MonitorChecksEmptyState";
import { MonitorChecksTable } from "./components/MonitorChecksTable";
import { MonitorHero } from "./components/MonitorHero";
import { MonitorInfoCard } from "./components/MonitorInfoCard";
import { MonitorReportExport } from "./components/MonitorReportExport";
import { MonitorResponseChart } from "./components/MonitorResponseChart";
import { MonitorStatusCard } from "./components/MonitorStatusCard";
import { MonitorTimeline } from "./components/MonitorTimeline";
import { monitorDetailStyles as styles } from "./components/monitorDetailStyles";
import type { PeriodFilter } from "./components/monitorDetailTypes";
import {
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  getAverage,
  getPercentile,
  getPeriodMs,
  getResponseTimes,
} from "./components/monitorDetailUtils";
import MonitorEditModal from "./MonitorEditModal";

export default function MonitorDetailPage() {
  const { id } = useParams();
  const monitorId = Number(id);
  const isValidMonitorId = Number.isFinite(monitorId) && monitorId > 0;
  const { canWrite: canWriteActions } = useCurrentUserPermissions();

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<MonitorCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState<MonitorStatusToast>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [exportRange, setExportRange] = useState<ReportRange>("7d");
  const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(
    null,
  );
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [filterNow, setFilterNow] = useState(() => Date.now());

  const updateMonitorMutation = useUpdateMonitorMutation();

  const loadData = useCallback(async () => {
    const [monitorData, checksData] = await Promise.all([
      getMonitor(monitorId),
      getMonitorChecks(monitorId),
    ]);

    setMonitor(monitorData);
    setChecks(checksData);
    setFilterNow(Date.now());

    return { monitor: monitorData, checks: checksData };
  }, [monitorId]);

  useEffect(() => {
    if (!isValidMonitorId) {
      return;
    }
    loadData()
      .catch(() => {
        setMonitor(null);
        setChecks([]);
      })
      .finally(() => setLoading(false));
  }, [isValidMonitorId, loadData]);

  useEffect(() => {
    if (!isValidMonitorId || !monitor?.isActive) {
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
  }, [isValidMonitorId, loadData, monitor?.frequencySeconds, monitor?.isActive]);

  useEffect(() => {
    const closeMenu = () => setIsActionMenuOpen(false);

    window.addEventListener("click", closeMenu);

    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const handleRunCheck = async () => {
    try {
      setChecking(true);
      setIsActionMenuOpen(false);
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
      setIsActionMenuOpen(false);
      await toggleMonitorActive(monitorId);
      await loadData();
    } catch {
      setToast({ text: "Error al actualizar", type: "error" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setToggling(false);
    }
  };

  const handleOpenEdit = () => {
    setIsActionMenuOpen(false);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    if (isSavingEdit) {
      return;
    }

    setIsEditModalOpen(false);
    setEditError(null);
  };

  const handleSaveEdit = async (data: UpdateMonitorInput) => {
    if (!monitor) {
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);
      await updateMonitorMutation.mutateAsync({ id: monitor.id, data });
      await loadData();
      setIsEditModalOpen(false);
      setToast({ text: "Monitor actualizado correctamente", type: "ok" });
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "No se pudo guardar el monitor.",
      );
    } finally {
      setIsSavingEdit(false);
      window.setTimeout(() => setToast(null), 2500);
    }
  };

  const handleExportReport = async (format: ReportFormat) => {
    try {
      setExportingFormat(format);
      await downloadReportExport(exportRange, format, { monitorId });
      setToast({ text: "Informe exportado", type: "ok" });
    } catch {
      setToast({ text: "No se pudo exportar el informe", type: "error" });
    } finally {
      setExportingFormat(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handlePeriodFilterChange: Dispatch<SetStateAction<PeriodFilter>> = (
    value,
  ) => {
    setFilterNow(Date.now());
    setPeriodFilter(value);
  };

  const status = monitor?.currentStatus ?? "UNKNOWN";
  const latestCheck = checks[0] ?? null;
  const latestChecks = checks.slice(0, 10);

  const filteredChecks = useMemo(() => {
    return checks.filter((check) => {
      if (periodFilter === "all") return true;

      const checkedAt = new Date(check.checkedAt).getTime();
      const periodMs = getPeriodMs(periodFilter);

      return filterNow - checkedAt <= periodMs;
    });
  }, [checks, filterNow, periodFilter]);

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

  if (!isValidMonitorId) {
    return <main style={styles.main}>Monitor no encontrado</main>;
  }

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

      {isDown ? (
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
      ) : null}

      <MonitorHero
        monitor={monitor}
        status={status}
        stats={stats}
        canWriteActions={canWriteActions}
        isActionMenuOpen={canWriteActions && isActionMenuOpen}
        actionState={{ checking, toggling }}
        onToggleActionMenu={() => setIsActionMenuOpen((current) => !current)}
        onRunCheck={() => void handleRunCheck()}
        onToggleActive={() => void handleToggleActive()}
        onOpenEdit={handleOpenEdit}
      />

      <MonitorStatusCard stats={stats} status={status} isPaused={isPaused} />

      <MonitorReportExport
        monitorName={monitor.name}
        exportRange={exportRange}
        exportingFormat={exportingFormat}
        onRangeChange={setExportRange}
        onExportReport={(format) => void handleExportReport(format)}
      />

      {checks.length === 0 ? (
        <MonitorChecksEmptyState />
      ) : (
        <>
          <MonitorChartsToolbar
            periodFilter={periodFilter}
            onPeriodFilterChange={handlePeriodFilterChange}
          />

          <section style={styles.grid} className="monitor-detail-grid">
            <MonitorTimeline checks={checksAsc} stats={filteredStats} />
            <MonitorResponseChart
              checks={checksAsc}
              latestCheck={latestCheck}
              timeoutMs={monitor.timeoutSeconds * 1000}
              stats={filteredStats}
            />
            <MonitorInfoCard
              monitor={monitor}
              latestCheck={latestCheck}
              status={status}
            />
          </section>

          <MonitorChecksTable checks={latestChecks} />
        </>
      )}

      {toast ? (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "ok" ? "#16a34a" : "#dc2626",
          }}
        >
          {toast.text}
        </div>
      ) : null}

      <MonitorEditModal
        isOpen={isEditModalOpen}
        monitor={monitor}
        isSubmitting={isSavingEdit}
        error={editError}
        onClose={handleCloseEdit}
        onSubmit={handleSaveEdit}
      />
    </main>
  );
}
