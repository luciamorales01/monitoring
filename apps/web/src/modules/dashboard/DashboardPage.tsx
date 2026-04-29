import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  avatarBase,
  controlBase,
  datePillBase,
  filterGroupBase,
  iconButtonBase,
  inputBase,
  kpiCardBase,
  pageActiveButtonBase,
  pageArrowBase,
  pageMain,
  pageSubtitle,
  pageTitle,
  paginationBase,
  primaryButtonBase,
  selectFakeBase,
  secondaryButtonBase,
  surfaceCard,
  tableCardBase,
  toneStyles,
  topActionsBase,
  topbarBase,
  uiTheme,
} from "../../theme/commonStyles";
import {
  getMonitors,
  runMonitorCheck,
  toggleMonitorActive,
  type Monitor,
} from "../../shared/monitorApi";
import {
  filterMonitors,
  getMonitorViewStatus,
  sortMonitors,
  type MonitorSortOption,
  type MonitorStatusFilter,
} from "../../shared/monitorFilters";
import { getMonitorStatusToast } from "../../shared/monitorStatusToast";
import { useLocalPagination } from "../../shared/useLocalPagination";
import { useUrlFilterState } from "../../shared/useUrlFilterState";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BellIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeIcon,
  MonitorIcon,
  PauseIcon,
  PlusIcon,
  RefreshIcon,
} from "../../shared/uiIcons";

const dashboardFilterDefaults = {
  search: "",
  sort: "status",
  status: "ALL",
};

const dashboardAllowedValues = {
  sort: ["status", "name", "latest-check"],
  status: ["ALL", "UP", "DOWN", "PAUSED", "UNKNOWN"],
} as const;

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [hoveredMonitorId, setHoveredMonitorId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "ok" | "error" } | null>(null);

  const navigate = useNavigate();
  const { filters, setFilter } = useUrlFilterState(
    dashboardFilterDefaults,
    dashboardAllowedValues,
  );

  const refreshMonitors = async () => {
    const data = await getMonitors();
    setMonitors(data);
    return data;
  };

  useEffect(() => {
    refreshMonitors().finally(() => setLoading(false));
  }, []);

  const handleRunCheck = async (id: number) => {
    try {
      setCheckingId(id);
      await runMonitorCheck(id);

      const updatedMonitors = await refreshMonitors();
      const updatedMonitor = updatedMonitors.find((monitor) => monitor.id === id);

      setToast(getMonitorStatusToast(updatedMonitor?.currentStatus));
    } catch {
      setToast({ text: "Error al comprobar", type: "error" });
    } finally {
      setCheckingId(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      setTogglingId(id);
      await toggleMonitorActive(id);
      await refreshMonitors();
    } catch {
      setToast({ text: "Error al actualizar", type: "error" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredMonitors = useMemo(() => {
    return sortMonitors(
      filterMonitors(monitors, {
        location: "ALL",
        search: filters.search,
        status: filters.status as MonitorStatusFilter,
        type: "ALL",
      }),
      filters.sort as MonitorSortOption,
    );
  }, [filters.search, filters.sort, filters.status, monitors]);

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeStart,
    rangeEnd,
    hasPreviousPage,
    hasNextPage,
  } = useLocalPagination(filteredMonitors, {
    pageSize: 10,
    resetKey: `${filters.search}|${filters.status}|${filters.sort}|${filteredMonitors.length}`,
  });

  const stats = useMemo(() => {
    const total = monitors.length;
    const online = monitors.filter((monitor) => monitor.currentStatus === "UP").length;
    const alerts = monitors.filter((monitor) => monitor.currentStatus === "DOWN").length;

    return {
      total,
      online,
      alerts,
      uptime: total > 0 ? `${((online / total) * 100).toFixed(2)}%` : "0%",
      response: total > 0 ? "732 ms" : "0 ms",
    };
  }, [monitors]);

  useEffect(() => {
    const intervalMs = stats.alerts > 0 ? 10000 : 30000;

    const intervalId = window.setInterval(() => {
      void refreshMonitors();
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [stats.alerts]);

  return (
    <main style={styles.main}>
      <header style={styles.topbar}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Resumen general de todas las webs monitorizadas</p>
        </div>

        <div style={styles.topActions}>
          <div style={styles.datePill}>
            <CalendarIcon size={15} />
            24 may 2024 00:00 — 24 may 2024 23:59
          </div>

          <button type="button" style={styles.iconButton} onClick={() => void refreshMonitors()}>
            <RefreshIcon size={16} />
          </button>

          <div style={styles.bell}>
            <BellIcon size={16} />
            {stats.alerts > 0 && <span style={styles.bellBadge}>{stats.alerts}</span>}
          </div>

          <div style={styles.avatar}>AS</div>

          <Link to="/monitors/create" style={styles.primaryButton}>
            <PlusIcon size={16} />
            Nuevo monitor
          </Link>
        </div>
      </header>

      <section style={styles.kpiGrid}>
        <KpiCard icon={<MonitorIcon size={18} />} title="Webs monitorizadas" value={stats.total} note="Total actual" tone="blue" />
        <KpiCard icon={<CheckCircleIcon size={18} />} title="Webs online" value={stats.online} note={`${stats.total ? ((stats.online / stats.total) * 100).toFixed(1) : 0}% del total`} tone="green" />
        <KpiCard icon={<AlertTriangleIcon size={18} />} title="Alertas activas" value={stats.alerts} note="Incidencias abiertas" tone="orange" />
        <KpiCard icon={<ClockIcon size={18} />} title="Uptime promedio" value={stats.uptime} note="Promedio global" tone="blue" />
        <KpiCard icon={<ActivityIcon size={18} />} title="Tiempo de respuesta" value={stats.response} note="Promedio global" tone="blue" />
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

            <svg width="100%" height="210" viewBox="0 0 720 210" preserveAspectRatio="none">
              <rect x="0" y="0" width="720" height="210" rx="16" fill="#fbfdff" />
              <line x1="0" y1="25" x2="720" y2="25" stroke="#dbe3ef" strokeDasharray="4 6" />
              <line x1="0" y1="70" x2="720" y2="70" stroke="#dbe3ef" strokeDasharray="4 6" />
              <line x1="0" y1="115" x2="720" y2="115" stroke="#dbe3ef" strokeDasharray="4 6" />
              <line x1="0" y1="160" x2="720" y2="160" stroke="#dbe3ef" strokeDasharray="4 6" />
              <path
                d="M0 68 C45 62, 70 72, 110 60 C160 45, 230 60, 285 54 C335 48, 390 60, 430 95 C455 125, 485 70, 535 54 C590 40, 640 55, 680 60 C700 62, 690 118, 720 82"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
              />
              <path
                d="M0 68 C45 62, 70 72, 110 60 C160 45, 230 60, 285 54 C335 48, 390 60, 430 95 C455 125, 485 70, 535 54 C590 40, 640 55, 680 60 C700 62, 690 118, 720 82 L720 210 L0 210 Z"
                fill="#2563eb"
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

          {stats.alerts === 0 ? (
            <p style={styles.empty}>No hay alertas activas.</p>
          ) : (
            monitors
              .filter((monitor) => getMonitorViewStatus(monitor) === "DOWN")
              .slice(0, 3)
              .map((monitor) => (
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

      <section style={styles.bottomGrid}>
        <div style={styles.tableCard}>
          <div style={styles.tableTop}>
            <h2 style={styles.cardTitle}>Todas las webs monitorizadas</h2>

            <div style={styles.tableControls}>
              <input
                style={styles.search}
                placeholder="Buscar web..."
                value={filters.search}
                onChange={(event) => setFilter("search", event.target.value)}
              />

              <label style={styles.filterGroup}>
                <span>Estado</span>
                <select
                  style={styles.selectInput}
                  value={filters.status}
                  onChange={(event) => setFilter("status", event.target.value)}
                >
                  <option value="ALL">Todos</option>
                  <option value="UP">Operativos</option>
                  <option value="DOWN">Caídos</option>
                  <option value="PAUSED">Pausados</option>
                  <option value="UNKNOWN">Pendientes</option>
                </select>
              </label>

              <label style={styles.filterGroup}>
                <span>Ordenar</span>
                <select
                  style={styles.selectInput}
                  value={filters.sort}
                  onChange={(event) => setFilter("sort", event.target.value)}
                >
                  <option value="status">Estado</option>
                  <option value="name">Nombre</option>
                  <option value="latest-check">Último check</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <p style={styles.empty}>Cargando monitores...</p>
          ) : filteredMonitors.length === 0 ? (
            <p style={styles.empty}>No hay monitores que coincidan con los filtros.</p>
          ) : (
            <>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Web</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Uptime</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Última comprobación</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {pageItems.map((monitor) => (
                    <tr
                      key={monitor.id}
                      style={{
                        ...styles.tr,
                        ...(hoveredMonitorId === monitor.id ? styles.trHover : {}),
                      }}
                      onClick={() => navigate(`/monitors/${monitor.id}`)}
                      onMouseEnter={() => setHoveredMonitorId(monitor.id)}
                      onMouseLeave={() => setHoveredMonitorId(null)}
                    >
                      <td style={styles.td}>
                        <div style={styles.webCell}>
                          <span style={styles.webIcon}>
                            <GlobeIcon size={18} />
                          </span>
                          <div>
                            <strong>{monitor.name}</strong>
                            <div style={styles.url}>{monitor.target}</div>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <StatusBadge status={monitor.currentStatus ?? "UNKNOWN"} />
                      </td>

                      <td style={styles.td}>
                        {monitor.currentStatus === "UP"
                          ? "99.9%"
                          : monitor.currentStatus === "DOWN"
                            ? "94.1%"
                            : "-"}
                      </td>

                      <td style={styles.td}>{monitor.type}</td>
                      <td style={styles.td}>Hace 1 min</td>

                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleRunCheck(monitor.id);
                            }}
                            disabled={checkingId === monitor.id}
                            style={{
                              ...styles.checkButton,
                              ...(checkingId === monitor.id ? styles.checkButtonDisabled : {}),
                            }}
                          >
                            {checkingId !== monitor.id && <ActivityIcon size={14} />}
                            {checkingId === monitor.id ? "Comprobando..." : "Comprobar ahora"}
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleToggleActive(monitor.id);
                            }}
                            disabled={togglingId === monitor.id}
                            style={{
                              ...styles.secondaryButton,
                              ...(togglingId === monitor.id ? styles.checkButtonDisabled : {}),
                            }}
                          >
                            {monitor.isActive ? <PauseIcon size={14} /> : <CheckCircleIcon size={14} />}
                            {togglingId === monitor.id
                              ? "Actualizando..."
                              : monitor.isActive
                                ? "Pausar"
                                : "Reanudar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={styles.pagination}>
                <span>
                  Mostrando {rangeStart} a {rangeEnd} de {filteredMonitors.length} monitores
                </span>

                <div style={styles.pages}>
                  <button
                    type="button"
                    style={styles.pageArrow}
                    onClick={() => setPage(page - 1)}
                    disabled={!hasPreviousPage}
                    aria-label="Página anterior"
                  >
                    ‹
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      style={pageNumber === page ? styles.pageActiveButton : styles.pageNumberButton}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    style={styles.pageArrow}
                    onClick={() => setPage(page + 1)}
                    disabled={!hasNextPage}
                    aria-label="Página siguiente"
                  >
                    ›
                  </button>
                </div>

                <span style={styles.selectFake}>10 por página</span>
              </div>
            </>
          )}
        </div>

        <div style={styles.regionCard}>
          <h2 style={styles.cardTitle}>Estado por región</h2>

          <div style={styles.mapMock}>
            <span style={{ ...styles.mapDot, top: "42%", left: "25%" }} />
            <span style={{ ...styles.mapDot, top: "58%", left: "40%" }} />
            <span style={{ ...styles.mapDot, top: "37%", left: "55%" }} />
            <span style={{ ...styles.mapDot, top: "50%", left: "73%" }} />
            <span style={{ ...styles.mapDot, top: "65%", left: "82%" }} />
          </div>

          {["Europa (Frankfurt)", "América (Norte)", "América (Sur)", "Asia (Singapur)", "Oceanía (Sídney)"].map((region, index) => (
            <div key={region} style={styles.regionRow}>
              <span>{region}</span>
              <div style={styles.regionBar}>
                <span style={{ ...styles.regionProgress, width: `${96 + index}%` }} />
              </div>
              <strong>{(99.8 - index * 0.15).toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      </section>

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
  icon,
  title,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
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
        <strong style={{ ...styles.kpiValue, color: colors[tone] }}>
          {value}
        </strong>
        <p style={styles.kpiNote}>{note}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
      <span style={styles.badgeDot} />
      {isUp ? "Operativo" : isDown ? "Problema" : "Pendiente"}
    </span>
  );
}

function AlertRow({
  title,
  text,
  tone,
  meta,
  onClick,
}: {
  title: string;
  text: string;
  tone: "red" | "orange" | "blue";
  meta: string;
  onClick?: () => void;
}) {
  const color =
    tone === "red"
      ? uiTheme.colors.danger
      : tone === "orange"
        ? uiTheme.colors.warning
        : uiTheme.colors.primary;

  return (
    <div
      style={{
        ...styles.alertRow,
        ...(onClick ? styles.alertRowInteractive : {}),
      }}
      onClick={onClick}
      onMouseEnter={(event) => {
        if (!onClick) return;
        event.currentTarget.style.backgroundColor = uiTheme.colors.background;
      }}
      onMouseLeave={(event) => {
        if (!onClick) return;
        event.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span
        style={{
          ...styles.alertIcon,
          color,
          borderColor: `${color}30`,
          background: `${color}12`,
        }}
      >
        <AlertTriangleIcon size={14} />
      </span>
      <div style={{ flex: 1 }}>
        <strong>{title}</strong>
        <p style={styles.alertText}>{text}</p>
      </div>
      <span style={{ ...styles.alertMeta, color }}>{meta}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  main: { ...pageMain, overflow: "auto" },
  topbar: topbarBase,
  topActions: topActionsBase,
  title: pageTitle,
  subtitle: { ...pageSubtitle, margin: "6px 0 0" },
  datePill: { ...datePillBase, padding: "9px 12px" },
  iconButton: iconButtonBase,
  bell: { ...iconButtonBase, position: "relative" },
  bellBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    background: uiTheme.colors.primary,
    color: "#fff",
    borderRadius: 999,
    width: 18,
    height: 18,
    display: "grid",
    placeItems: "center",
    fontSize: 10,
  },
  avatar: {
    ...avatarBase,
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 13,
  },
  primaryButton: {
    ...primaryButtonBase,
    textDecoration: "none",
    padding: "0 16px",
    borderRadius: uiTheme.radii.sm,
    fontWeight: 800,
    fontSize: 14,
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
    ...kpiCardBase,
    padding: 18,
    display: "flex",
    gap: 14,
    alignItems: "center",
    minHeight: 94,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  kpiTitle: {
    margin: 0,
    color: uiTheme.colors.text,
    fontWeight: 800,
    fontSize: 13,
  },
  kpiValue: { display: "block", marginTop: 6, fontSize: 24, lineHeight: 1 },
  kpiNote: { margin: "7px 0 0", color: uiTheme.colors.muted, fontSize: 11 },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1.35fr 1fr",
    gap: 14,
    marginBottom: 14,
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1.7fr 0.85fr",
    gap: 14,
  },
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
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 800 },
  selectFake: {
    ...selectFakeBase,
    justifySelf: "end",
  },
  linkFake: {
    color: uiTheme.colors.primary,
    fontSize: 12,
    fontWeight: 700,
  },
  chartBox: {
    borderTop: `1px solid ${uiTheme.colors.border}`,
    paddingTop: 14,
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    alignItems: "stretch",
  },
  yAxis: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    color: uiTheme.colors.muted,
    fontSize: 11,
    padding: "0 6px 0 0",
  },

  tableCard: {
    ...tableCardBase,
    borderRadius: uiTheme.radii.md,
    padding: 20,
  },
  tableTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 14,
    marginBottom: 14,
  },
  tableControls: {
    display: "grid",
    gridTemplateColumns:
      "minmax(280px, 1.8fr) minmax(160px, 0.8fr) minmax(150px, 0.7fr)",
    alignItems: "end",
    gap: 12,
    width: "100%",
    maxWidth: 720,
  },
  search: inputBase,
  filterGroup: filterGroupBase,
  selectInput: inputBase,
  filterSelectFake: {
    ...controlBase,
    borderRadius: uiTheme.radii.sm,
    padding: "0 12px",
    fontSize: 13,
    minHeight: 40,
    display: "flex",
    alignItems: "center",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    color: uiTheme.colors.muted,
    fontSize: 12,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    fontWeight: 800,
  },
  tr: {
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
    background: "#fff",
  },
  trHover: { background: uiTheme.colors.background },
  td: {
    padding: "12px 10px",
    fontSize: 12,
    color: uiTheme.colors.text,
  },
  actionGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
    flexWrap: "nowrap",
    whiteSpace: "nowrap",
  },
  webCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  webIcon: {
    width: 36,
    height: 36,
    borderRadius: uiTheme.radii.sm,
    background: uiTheme.colors.primarySoft,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.primary,
    flexShrink: 0,
  },
  url: {
    marginTop: 3,
    color: uiTheme.colors.muted,
    fontSize: 11,
  },
  badge: {
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: "currentColor",
    display: "inline-block",
  },
  checkButton: {
    ...primaryButtonBase,
    borderRadius: uiTheme.radii.sm,
    padding: "0 12px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: 12,
    minHeight: 38,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  checkButtonDisabled: { opacity: 0.6, cursor: "not-allowed" },
  secondaryButton: {
    ...secondaryButtonBase,
    borderRadius: uiTheme.radii.sm,
    padding: "0 12px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: 12,
    minHeight: 38,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },

  pagination: { ...paginationBase, gap: 18, padding: "16px 20px" },
  pages: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifySelf: "center",
    color: uiTheme.colors.text,
  },
  pageActiveButton: pageActiveButtonBase,
  pageArrow: pageArrowBase,

  alertRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "13px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  alertRowInteractive: {
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  alertIcon: {
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "1px solid",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  alertText: {
    margin: "3px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  alertMeta: { fontSize: 11, whiteSpace: "nowrap" },
  empty: { color: uiTheme.colors.muted, fontSize: 13, padding: 20 },

  regionCard: {
    ...surfaceCard,
    borderRadius: uiTheme.radii.md,
    padding: 20,
  },
  mapMock: {
    height: 140,
    borderRadius: uiTheme.radii.sm,
    background: "radial-gradient(circle at top left, #eff6ff 0%, #ffffff 58%)",
    margin: "14px 0",
    position: "relative",
    overflow: "hidden",
    border: `1px solid ${uiTheme.colors.border}`,
  },
  mapDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 999,
    background: uiTheme.colors.primary,
    boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.12)",
  },
  regionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 74px 44px",
    gap: 8,
    alignItems: "center",
    fontSize: 11,
    padding: "8px 0",
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  regionBar: {
    height: 4,
    background: uiTheme.colors.borderStrong,
    borderRadius: 999,
    overflow: "hidden",
  },
  regionProgress: {
    display: "block",
    height: "100%",
    background: uiTheme.colors.primary,
    borderRadius: 999,
  },
};
