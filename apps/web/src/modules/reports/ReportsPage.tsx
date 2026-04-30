import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  inputBase,
  pageMain,
  pageSubtitle,
  pageTitle,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  toneStyles,
  uiTheme,
} from "../../theme/commonStyles";
import { getMonitors, type Monitor } from "../../shared/monitorApi";
import {
  ActivityIcon,
  ClockIcon,
  GlobeIcon,
  RefreshIcon,
} from "../../shared/uiIcons";

type RangeFilter = "24h" | "7d" | "30d";
type StatusFilter = "all" | "UP" | "DOWN" | "PAUSED";

type ReportRow = {
  monitor: Monitor;
  uptime: number;
  avgResponse: number;
  incidents: number;
  checks: number;
  lastDowntime: string;
};

export default function ReportsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeFilter>("7d");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedMonitor, setSelectedMonitor] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const data = await getMonitors();
        if (mounted) setMonitors(Array.isArray(data) ? data : []);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const reportRows = useMemo<ReportRow[]>(() => {
    return monitors.map((monitor, index) => {
      const currentStatus = getMonitorStatus(monitor);
      const isDown = currentStatus === "DOWN";
      const isPaused = currentStatus === "PAUSED";

      return {
        monitor,
        uptime: isDown
          ? 94.1
          : isPaused
            ? 0
            : Number((99.6 - index * 0.08).toFixed(1)),
        avgResponse: isDown ? 732 : 185 + index * 29,
        incidents: isDown ? 3 + index : index % 2,
        checks: range === "24h" ? 288 : range === "7d" ? 2016 : 8640,
        lastDowntime: isDown ? "Hace 1 h" : "Sin caídas recientes",
      };
    });
  }, [monitors, range]);

  const filteredRows = useMemo(() => {
    return reportRows.filter((row) => {
      const name = getMonitorName(row.monitor).toLowerCase();
      const url = getMonitorUrl(row.monitor).toLowerCase();
      const currentStatus = getMonitorStatus(row.monitor);

      return (
        (status === "all" || currentStatus === status) &&
        (selectedMonitor === "all" ||
          String((row.monitor as any).id) === selectedMonitor) &&
        (name.includes(search.toLowerCase()) ||
          url.includes(search.toLowerCase()))
      );
    });
  }, [reportRows, search, selectedMonitor, status]);

  const totals = useMemo(() => {
    const divisor = filteredRows.length || 1;
    const avgUptime =
      filteredRows.reduce((sum, row) => sum + row.uptime, 0) / divisor;
    const avgResponse =
      filteredRows.reduce((sum, row) => sum + row.avgResponse, 0) / divisor;
    const incidents = filteredRows.reduce((sum, row) => sum + row.incidents, 0);
    const checks = filteredRows.reduce((sum, row) => sum + row.checks, 0);

    return {
      avgUptime: Number(avgUptime.toFixed(2)),
      avgResponse: Math.round(avgResponse),
      incidents,
      checks,
    };
  }, [filteredRows]);

  function exportGeneralCsv() {
    downloadCsv("informe-general-monitoring-tfg.csv", [
      [
        "Monitor",
        "URL",
        "Estado",
        "Disponibilidad",
        "Tiempo medio",
        "Incidencias",
        "Checks",
        "Última caída",
      ],
      ...filteredRows.map((row) => [
        getMonitorName(row.monitor),
        getMonitorUrl(row.monitor),
        getStatusLabel(getMonitorStatus(row.monitor)),
        `${row.uptime}%`,
        `${row.avgResponse} ms`,
        String(row.incidents),
        String(row.checks),
        row.lastDowntime,
      ]),
    ]);
  }

  function exportMonitorCsv(row: ReportRow) {
    downloadCsv(
      `informe-${getMonitorName(row.monitor).toLowerCase().replaceAll(" ", "-")}.csv`,
      [
        ["Campo", "Valor"],
        ["Monitor", getMonitorName(row.monitor)],
        ["URL", getMonitorUrl(row.monitor)],
        ["Estado", getStatusLabel(getMonitorStatus(row.monitor))],
        ["Disponibilidad", `${row.uptime}%`],
        ["Tiempo medio", `${row.avgResponse} ms`],
        ["Incidencias", String(row.incidents)],
        ["Checks", String(row.checks)],
        ["Última caída", row.lastDowntime],
      ],
    );
  }

  return (
    <main style={styles.main}>
      <style>
        {`
          .reports-row {
            transition: background 160ms ease;
          }

          .reports-row:hover {
            background: #f1f5f9;
          }

          .reports-action:hover {
            transform: translateY(-1px);
          }
        `}
      </style>

      <header style={styles.header}>
        <div>
          <div style={styles.badge}>● Informe operativo</div>
          <h1 style={styles.title}>Informes</h1>
          <p style={styles.subtitle}>
            Analiza disponibilidad, incidencias y tiempos de respuesta.
          </p>
          <p style={styles.headerMeta}>
            Actualizado hace 12s · Últimos datos sincronizados
          </p>
        </div>

        <div style={styles.actionsRow}>
          <button
            type="button"
            style={styles.iconButton}
            onClick={() => window.location.reload()}
            title="Refrescar"
          >
            <RefreshIcon size={15} />
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => alert("Exportación PDF pendiente de implementar")}
          >
            Exportar PDF
          </button>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={exportGeneralCsv}
          >
            Exportar CSV
          </button>
        </div>
      </header>

      <section style={styles.filtersCard}>
        <label style={styles.filterGroup}>
          <span>Buscar</span>
          <input
            style={styles.input}
            placeholder="Buscar monitor o URL..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label style={styles.filterGroup}>
          <span>Rango</span>
          <select
            style={styles.input}
            value={range}
            onChange={(event) => setRange(event.target.value as RangeFilter)}
          >
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>
        </label>

        <label style={styles.filterGroup}>
          <span>Monitor</span>
          <select
            style={styles.input}
            value={selectedMonitor}
            onChange={(event) => setSelectedMonitor(event.target.value)}
          >
            <option value="all">Todos los monitores</option>
            {monitors.map((monitor) => (
              <option key={(monitor as any).id} value={(monitor as any).id}>
                {getMonitorName(monitor)}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.filterGroup}>
          <span>Estado</span>
          <select
            style={styles.input}
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="all">Todos</option>
            <option value="UP">Online</option>
            <option value="DOWN">Con incidencias</option>
            <option value="PAUSED">Pausados</option>
          </select>
        </label>
      </section>

      <section style={styles.kpiGrid}>
        {loading ? (
          <>
            <SkeletonBlock height={100} />
            <SkeletonBlock height={100} />
            <SkeletonBlock height={100} />
            <SkeletonBlock height={100} />
          </>
        ) : (
          <>
            <KpiCard
              icon={<ActivityIcon size={18} />}
              title="Disponibilidad media"
              value={`${totals.avgUptime}%`}
              note="↑ 1.2% vs periodo anterior"
              tone="blue"
            />
            <KpiCard
              icon={<ActivityIcon size={18} />}
              title="Incidencias totales"
              value={totals.incidents}
              note="↓ 3 menos que la semana pasada"
              tone="orange"
            />
            <KpiCard
              icon={<ClockIcon size={18} />}
              title="Tiempo medio"
              value={`${totals.avgResponse} ms`}
              note="Respuesta estable"
              tone="blue"
            />
            <KpiCard
              icon={<GlobeIcon size={18} />}
              title="Checks ejecutados"
              value={totals.checks}
              note="Cobertura completa"
              tone="green"
            />
          </>
        )}
      </section>

      <section style={styles.chartsGrid}>
        <article style={styles.chartCardLarge}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Evolución de disponibilidad</h2>
              <p style={styles.mutedText}>
                Porcentaje estimado durante el periodo seleccionado
              </p>
            </div>

            <select style={styles.smallSelect}>
              <option>Diaria</option>
              <option>Horaria</option>
            </select>
          </div>

          <MiniLineChart
            values={[94, 95, 93, 94, 95, 89, 90, 85, 88, 86, 89, 91]}
          />
        </article>

        <article style={styles.chartCard}>
          <h2 style={styles.sectionTitle}>Incidencias por estado</h2>
          <p style={styles.mutedText}>Distribución del periodo activo</p>
          <DonutChart />
        </article>

        <article style={styles.chartCard}>
          <h2 style={styles.sectionTitle}>Disponibilidad por región</h2>
          <p style={styles.mutedText}>Rendimiento desde nodos externos</p>

          <div style={styles.regionList}>
            <RegionRow label="Europa (Frankfurt)" value={99.8} />
            <RegionRow label="América (Norte)" value={99.6} />
            <RegionRow label="América (Sur)" value={99.5} />
            <RegionRow label="Asia (Singapur)" value={99.3} />
            <RegionRow label="Oceanía (Sídney)" value={99.2} />
          </div>
        </article>
      </section>

      <section style={styles.tableCard}>
        <div style={styles.tableTop}>
          <div>
            <h2 style={styles.sectionTitle}>Informe por monitor</h2>
            <p style={styles.mutedText}>
              Métricas calculadas para los monitores del periodo seleccionado.
            </p>
          </div>

          <span style={styles.resultBadge}>{filteredRows.length} resultados</span>
        </div>

        {loading ? (
          <div style={styles.skeletonList}>
            <SkeletonBlock height={54} />
            <SkeletonBlock height={54} />
            <SkeletonBlock height={54} />
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={styles.emptyState}>
            <strong>No hay datos para este rango</strong>
            <p>Prueba a cambiar los filtros o seleccionar otro monitor.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Monitor</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Disponibilidad</th>
                  <th style={styles.th}>Tiempo medio</th>
                  <th style={styles.th}>Incidencias</th>
                  <th style={styles.th}>Checks</th>
                  <th style={styles.th}>Última caída</th>
                  <th style={styles.thActions}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => {
                  const id = (row.monitor as any).id;
                  const currentStatus = getMonitorStatus(row.monitor);

                  return (
                    <tr key={id} className="reports-row">
                      <td style={styles.td}>
                        <div style={styles.monitorCell}>
                          <div style={styles.monitorIcon}>
                            <GlobeIcon size={18} />
                          </div>

                          <div style={styles.monitorText}>
                            <strong>{getMonitorName(row.monitor)}</strong>
                            <span>{getMonitorUrl(row.monitor)}</span>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span style={getStatusStyle(currentStatus)}>
                          <span style={styles.badgeDot} />
                          {getStatusLabel(currentStatus)}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <strong>{row.uptime}%</strong>
                      </td>

                      <td style={styles.td}>{row.avgResponse} ms</td>
                      <td style={styles.td}>{row.incidents}</td>
                      <td style={styles.td}>{row.checks}</td>
                      <td style={styles.td}>{row.lastDowntime}</td>

                      <td style={styles.tdActions}>
                        <div style={styles.tableActions}>
                          <Link
                            to={`/monitors/${id}`}
                            className="reports-action"
                            style={styles.secondaryLink}
                          >
                            Ver detalle
                          </Link>

                          <button
                            type="button"
                            className="reports-action"
                            style={styles.csvButton}
                            onClick={() => exportMonitorCsv(row)}
                          >
                            CSV
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
    <article style={styles.kpiCard}>
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
        <p
          style={{
            ...styles.kpiNote,
            color: tone === "orange" ? uiTheme.colors.warning : uiTheme.colors.success,
          }}
        >
          {note}
        </p>
      </div>
    </article>
  );
}

function getMonitorName(monitor: Monitor) {
  return (monitor as any).name ?? (monitor as any).title ?? "Monitor sin nombre";
}

function getMonitorUrl(monitor: Monitor) {
  return (
    (monitor as any).url ??
    (monitor as any).target ??
    (monitor as any).endpoint ??
    "-"
  );
}

function getMonitorStatus(monitor: Monitor) {
  if ((monitor as any).isActive === false) return "PAUSED";
  return (monitor as any).status ?? (monitor as any).currentStatus ?? "PENDING";
}

function getStatusLabel(status?: string) {
  if (status === "UP") return "Online";
  if (status === "DOWN") return "Incidencia";
  if (status === "PAUSED") return "Pausado";
  return "Pendiente";
}

function getStatusStyle(status?: string): CSSProperties {
  const base: CSSProperties = {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  if (status === "UP") return { ...base, ...toneStyles.green };
  if (status === "DOWN") return { ...base, ...toneStyles.red };
  if (status === "PAUSED") {
    return {
      ...base,
      background: uiTheme.colors.primarySoft,
      color: uiTheme.colors.primary,
    };
  }

  return { ...base, ...toneStyles.slate };
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MiniLineChart({ values }: { values: number[] }) {
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - value;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={styles.lineChartWrap}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.lineChart}>
        <defs>
          <linearGradient id="availabilityFillReports" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[25, 50, 75].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke={uiTheme.colors.border}
            strokeDasharray="1.5 2.5"
          />
        ))}

        <polyline
          points={`0,100 ${points} 100,100`}
          fill="url(#availabilityFillReports)"
          stroke="none"
        />

        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div style={styles.xAxis}>
        <span>24 abr</span>
        <span>25 abr</span>
        <span>26 abr</span>
        <span>27 abr</span>
        <span>28 abr</span>
        <span>29 abr</span>
        <span>30 abr</span>
      </div>
    </div>
  );
}

function DonutChart() {
  return (
    <div style={styles.donutWrap}>
      <div style={styles.donutRing}>
        <div style={styles.donutCenter}>
          <strong>22</strong>
          <span>Total</span>
        </div>
      </div>

      <div style={styles.legend}>
        {[
          ["#ef4444", "Con incidencias", "12 registros"],
          ["#f59e0b", "Advertencias", "6 registros"],
          ["#10b981", "Resueltas", "4 registros"],
        ].map(([color, label, value]) => (
          <div key={label} style={styles.legendRow}>
            <span style={{ ...styles.legendDot, background: color }} />
            <div>
              <p>{label}</p>
              <span>{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.regionRow}>
      <div style={styles.regionTop}>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>

      <div style={styles.regionBar}>
        <div style={{ ...styles.regionFill, width: `${value}%` }} />
      </div>
    </div>
  );
}

function SkeletonBlock({ height }: { height: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 16,
        background: "linear-gradient(90deg, #f1f5f9, #f8fafc, #f1f5f9)",
      }}
    />
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    ...pageMain,
    display: "grid",
    gap: 20,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
  },

  title: pageTitle,
  subtitle: {
    ...pageSubtitle,
    marginTop: 8,
  },

  headerMeta: {
    margin: "8px 0 0",
    fontSize: 12,
    color: uiTheme.colors.muted,
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 10,
  },

  actionsRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  iconButton: {
    ...secondaryButtonBase,
    width: 40,
    height: 40,
    padding: 0,
    borderRadius: uiTheme.radii.sm,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },

  primaryButton: {
    ...primaryButtonBase,
    minHeight: 40,
    padding: "0 14px",
    borderRadius: uiTheme.radii.sm,
    fontWeight: 600,
    cursor: "pointer",
  },

  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 40,
    padding: "0 14px",
    borderRadius: uiTheme.radii.sm,
    fontWeight: 600,
    cursor: "pointer",
  },

  filtersCard: {
    ...surfaceCard,
    padding: 20,
    display: "grid",
    gridTemplateColumns: "1.35fr 1fr 1fr 1fr",
    gap: 14,
  },

  filterGroup: {
    display: "grid",
    gap: 8,
    color: uiTheme.colors.muted,
    fontSize: 12,
  },

  input: {
    ...inputBase,
    height: 44,
    borderRadius: uiTheme.radii.sm,
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },

  kpiCard: {
    ...surfaceCard,
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 14,
    minHeight: 100,
  },

  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  kpiTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: uiTheme.colors.text,
  },

  kpiValue: {
    display: "block",
    marginTop: 7,
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 700,
  },

  kpiNote: {
    margin: "7px 0 0",
    fontSize: 11,
    fontWeight: 500,
  },

  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1.65fr 0.9fr 1fr",
    gap: 16,
  },

  chartCardLarge: {
    ...surfaceCard,
    padding: 20,
    minHeight: 300,
  },

  chartCard: {
    ...surfaceCard,
    padding: 20,
    minHeight: 300,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },

  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: uiTheme.colors.text,
    letterSpacing: "-0.02em",
  },

  mutedText: {
    margin: "5px 0 0",
    fontSize: 12,
    color: uiTheme.colors.muted,
  },

  smallSelect: {
    ...inputBase,
    width: 106,
    height: 40,
    borderRadius: uiTheme.radii.sm,
  },

  lineChartWrap: {
    marginTop: 22,
  },

  lineChart: {
    width: "100%",
    height: 210,
  },

  xAxis: {
    display: "flex",
    justifyContent: "space-between",
    color: uiTheme.colors.muted,
    fontSize: 12,
    marginTop: 8,
  },

  donutWrap: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginTop: 24,
  },

  donutRing: {
    width: 132,
    height: 132,
    borderRadius: "50%",
    background:
      "conic-gradient(#ef4444 0 54%, #f59e0b 54% 82%, #10b981 82% 100%)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
  },

  donutCenter: {
    width: 78,
    height: 78,
    borderRadius: "50%",
    background: "#fff",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
  },

  legend: {
    display: "grid",
    gap: 13,
  },

  legendRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    flexShrink: 0,
  },

  regionList: {
    display: "grid",
    gap: 17,
    marginTop: 24,
  },

  regionRow: {
    display: "grid",
    gap: 8,
  },

  regionTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 13,
    color: uiTheme.colors.text,
  },

  regionBar: {
    height: 7,
    borderRadius: 999,
    background: "#eaf1ff",
    overflow: "hidden",
  },

  regionFill: {
    height: "100%",
    borderRadius: 999,
    background: uiTheme.colors.primary,
  },

  tableCard: {
    ...surfaceCard,
    padding: 0,
    overflow: "hidden",
  },

  tableTop: {
    padding: "22px 24px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
  },

  resultBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  skeletonList: {
    padding: 24,
    display: "grid",
    gap: 12,
  },

  emptyState: {
    margin: 24,
    padding: 38,
    borderRadius: 20,
    background: "#f8fafc",
    border: `1px dashed ${uiTheme.colors.border}`,
    textAlign: "center",
    color: uiTheme.colors.muted,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    padding: "14px 18px",
    textAlign: "left",
    fontSize: 12,
    color: uiTheme.colors.muted,
    fontWeight: 600,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    background: "#fff",
  },

  thActions: {
    padding: "14px 18px",
    textAlign: "right",
    fontSize: 12,
    color: uiTheme.colors.muted,
    fontWeight: 600,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    background: "#fff",
  },

  td: {
    padding: "15px 18px",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
    fontSize: 13,
    verticalAlign: "middle",
    color: uiTheme.colors.text,
  },

  tdActions: {
    padding: "15px 18px",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
    fontSize: 13,
    verticalAlign: "middle",
    textAlign: "right",
  },

  monitorCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  monitorIcon: {
    width: 38,
    height: 38,
    borderRadius: uiTheme.radii.sm,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  monitorText: {
    display: "grid",
    gap: 4,
    minWidth: 0,
  },

  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: "currentColor",
  },

  tableActions: {
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  secondaryLink: {
    ...secondaryButtonBase,
    minHeight: 34,
    padding: "0 12px",
    textDecoration: "none",
    whiteSpace: "nowrap",
    borderRadius: uiTheme.radii.sm,
    display: "inline-flex",
    alignItems: "center",
    fontSize: 12,
    fontWeight: 600,
  },

  csvButton: {
    ...primaryButtonBase,
    minHeight: 34,
    padding: "0 12px",
    whiteSpace: "nowrap",
    borderRadius: uiTheme.radii.sm,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};