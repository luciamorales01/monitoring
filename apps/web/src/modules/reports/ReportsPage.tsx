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
import { ActivityIcon, ClockIcon, GlobeIcon, RefreshIcon } from "../../shared/uiIcons";
import { getReportsSummary, type ReportRange, type ReportRow, type ReportsSummary } from "../../shared/reportsApi";

type StatusFilter = "all" | "UP" | "DOWN" | "PAUSED";

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<ReportRange>("7d");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedMonitor, setSelectedMonitor] = useState("all");
  const [search, setSearch] = useState("");

  async function loadReports(activeRange = range) {
    try {
      setLoading(true);
      setSummary(await getReportsSummary(activeRange));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports(range);
  }, [range]);

  const rows = summary?.rows ?? [];

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const currentStatus = getRowStatus(row);
      const matchesStatus = status === "all" || currentStatus === status;
      const matchesMonitor = selectedMonitor === "all" || String(row.monitor.id) === selectedMonitor;
      const matchesSearch =
        !normalizedSearch ||
        row.monitor.name.toLowerCase().includes(normalizedSearch) ||
        row.monitor.target.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesMonitor && matchesSearch;
    });
  }, [rows, search, selectedMonitor, status]);

  const totals = useMemo(() => {
    const divisor = filteredRows.length || 1;
    const avgUptime = filteredRows.reduce((sum, row) => sum + row.uptimePercent, 0) / divisor;
    const avgResponse = filteredRows.reduce((sum, row) => sum + row.averageResponseTimeMs, 0) / divisor;

    return {
      avgUptime: Number(avgUptime.toFixed(2)),
      avgResponse: Math.round(avgResponse),
      incidents: filteredRows.reduce((sum, row) => sum + row.incidents, 0),
      checks: filteredRows.reduce((sum, row) => sum + row.checks, 0),
    };
  }, [filteredRows]);

  function exportGeneralCsv() {
    downloadCsv("informe-general-monitoring.csv", [
      ["Monitor", "URL", "Estado", "Disponibilidad", "Tiempo medio", "Incidencias", "Checks", "Última caída"],
      ...filteredRows.map((row) => [
        row.monitor.name,
        row.monitor.target,
        getStatusLabel(getRowStatus(row)),
        `${row.uptimePercent}%`,
        `${row.averageResponseTimeMs} ms`,
        String(row.incidents),
        String(row.checks),
        formatDate(row.lastDowntime),
      ]),
    ]);
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <div style={styles.badge}>● Informe operativo</div>
          <h1 style={styles.title}>Informes</h1>
          <p style={styles.subtitle}>Datos reales de disponibilidad, incidencias y tiempos de respuesta.</p>
          <p style={styles.headerMeta}>
            {summary ? `Periodo: ${formatDate(summary.from)} - ${formatDate(summary.to)}` : "Cargando datos del backend"}
          </p>
        </div>

        <div style={styles.actionsRow}>
          <button type="button" style={styles.iconButton} onClick={() => void loadReports()} title="Refrescar">
            <RefreshIcon size={15} />
          </button>
          <button type="button" style={styles.primaryButton} onClick={exportGeneralCsv} disabled={loading || filteredRows.length === 0}>
            Exportar CSV
          </button>
        </div>
      </header>

      <section style={styles.filtersCard}>
        <label style={styles.filterGroup}>
          <span>Buscar</span>
          <input style={styles.input} placeholder="Buscar monitor o URL..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        <label style={styles.filterGroup}>
          <span>Rango</span>
          <select style={styles.input} value={range} onChange={(event) => setRange(event.target.value as ReportRange)}>
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>
        </label>

        <label style={styles.filterGroup}>
          <span>Monitor</span>
          <select style={styles.input} value={selectedMonitor} onChange={(event) => setSelectedMonitor(event.target.value)}>
            <option value="all">Todos los monitores</option>
            {rows.map((row) => (
              <option key={row.monitor.id} value={row.monitor.id}>{row.monitor.name}</option>
            ))}
          </select>
        </label>

        <label style={styles.filterGroup}>
          <span>Estado</span>
          <select style={styles.input} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">Todos</option>
            <option value="UP">Online</option>
            <option value="DOWN">Con incidencias</option>
            <option value="PAUSED">Pausados</option>
          </select>
        </label>
      </section>

      <section style={styles.kpiGrid}>
        <KpiCard icon={<ActivityIcon size={18} />} title="Disponibilidad media" value={loading ? "..." : `${totals.avgUptime}%`} note="Calculada con checks reales" tone="blue" />
        <KpiCard icon={<ActivityIcon size={18} />} title="Incidencias" value={loading ? "..." : totals.incidents} note="Dentro del periodo" tone="orange" />
        <KpiCard icon={<ClockIcon size={18} />} title="Tiempo medio" value={loading ? "..." : `${totals.avgResponse} ms`} note="Promedio de respuesta" tone="blue" />
        <KpiCard icon={<GlobeIcon size={18} />} title="Checks ejecutados" value={loading ? "..." : totals.checks} note="Registros reales" tone="green" />
      </section>

      <section style={styles.tableCard}>
        <div style={styles.tableTop}>
          <div>
            <h2 style={styles.sectionTitle}>Informe por monitor</h2>
            <p style={styles.mutedText}>Métricas calculadas desde `/reports/summary`.</p>
          </div>
          <span style={styles.resultBadge}>{filteredRows.length} resultados</span>
        </div>

        {loading ? (
          <div style={styles.emptyState}>Cargando informe...</div>
        ) : filteredRows.length === 0 ? (
          <div style={styles.emptyState}>No hay datos para los filtros seleccionados.</div>
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
                  const currentStatus = getRowStatus(row);
                  return (
                    <tr key={row.monitor.id}>
                      <td style={styles.td}>
                        <div style={styles.monitorCell}>
                          <div style={styles.monitorIcon}><GlobeIcon size={18} /></div>
                          <div style={styles.monitorText}>
                            <strong>{row.monitor.name}</strong>
                            <span>{row.monitor.target}</span>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}><span style={getStatusStyle(currentStatus)}><span style={styles.badgeDot} />{getStatusLabel(currentStatus)}</span></td>
                      <td style={styles.td}><strong>{row.uptimePercent}%</strong></td>
                      <td style={styles.td}>{row.averageResponseTimeMs} ms</td>
                      <td style={styles.td}>{row.incidents}</td>
                      <td style={styles.td}>{row.checks}</td>
                      <td style={styles.td}>{formatDate(row.lastDowntime)}</td>
                      <td style={styles.tdActions}><Link to={`/monitors/${row.monitor.id}`} style={styles.secondaryLink}>Ver detalle</Link></td>
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

function KpiCard({ icon, title, value, note, tone }: { icon: React.ReactNode; title: string; value: string | number; note: string; tone: "green" | "blue" | "orange" }) {
  const colors = { green: uiTheme.colors.success, blue: uiTheme.colors.primary, orange: uiTheme.colors.warning };
  return (
    <article style={styles.kpiCard}>
      <div style={{ ...styles.kpiIcon, background: `${colors[tone]}16`, color: colors[tone] }}>{icon}</div>
      <div>
        <p style={styles.kpiTitle}>{title}</p>
        <strong style={{ ...styles.kpiValue, color: colors[tone] }}>{value}</strong>
        <p style={styles.kpiNote}>{note}</p>
      </div>
    </article>
  );
}

function getRowStatus(row: ReportRow): "UP" | "DOWN" | "PAUSED" {
  if (!row.monitor.isActive) return "PAUSED";
  return row.monitor.currentStatus === "DOWN" ? "DOWN" : "UP";
}

function getStatusLabel(status: string) {
  if (status === "UP") return "Online";
  if (status === "DOWN") return "Incidencia";
  if (status === "PAUSED") return "Pausado";
  return "Pendiente";
}

function getStatusStyle(status: string): CSSProperties {
  const base: CSSProperties = { padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 };
  if (status === "UP") return { ...base, ...toneStyles.green };
  if (status === "DOWN") return { ...base, ...toneStyles.red };
  return { ...base, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary };
}

function formatDate(value?: string | null) {
  if (!value) return "Sin caídas recientes";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const styles: Record<string, CSSProperties> = {
  main: { ...pageMain, display: "grid", gap: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 },
  title: pageTitle,
  subtitle: { ...pageSubtitle, marginTop: 8 },
  headerMeta: { margin: "8px 0 0", fontSize: 12, color: uiTheme.colors.muted },
  badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, fontSize: 12, fontWeight: 600, marginBottom: 10 },
  actionsRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  iconButton: { ...secondaryButtonBase, width: 40, height: 40, padding: 0, borderRadius: uiTheme.radii.sm, display: "grid", placeItems: "center", cursor: "pointer" },
  primaryButton: { ...primaryButtonBase, minHeight: 40, padding: "0 14px", borderRadius: uiTheme.radii.sm, fontWeight: 600, cursor: "pointer" },
  filtersCard: { ...surfaceCard, padding: 20, display: "grid", gridTemplateColumns: "1.35fr 1fr 1fr 1fr", gap: 14 },
  filterGroup: { display: "grid", gap: 8, color: uiTheme.colors.muted, fontSize: 12 },
  input: { ...inputBase, height: 44, borderRadius: uiTheme.radii.sm },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 },
  kpiCard: { ...surfaceCard, padding: 20, display: "flex", alignItems: "center", gap: 14, minHeight: 100 },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0 },
  kpiTitle: { margin: 0, fontSize: 12, fontWeight: 600, color: uiTheme.colors.text },
  kpiValue: { display: "block", marginTop: 7, fontSize: 24, lineHeight: 1, fontWeight: 700 },
  kpiNote: { margin: "7px 0 0", fontSize: 11, color: uiTheme.colors.muted },
  tableCard: { ...surfaceCard, padding: 0, overflow: "hidden" },
  tableTop: { padding: "22px 24px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: uiTheme.colors.text, letterSpacing: "-0.02em" },
  mutedText: { margin: "5px 0 0", fontSize: 12, color: uiTheme.colors.muted },
  resultBadge: { padding: "6px 10px", borderRadius: 999, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  emptyState: { margin: 24, padding: 38, borderRadius: 20, background: "#f8fafc", border: `1px dashed ${uiTheme.colors.border}`, textAlign: "center", color: uiTheme.colors.muted },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "14px 18px", textAlign: "left", fontSize: 12, color: uiTheme.colors.muted, fontWeight: 600, borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`, borderBottom: `1px solid ${uiTheme.colors.border}`, background: "#fff" },
  thActions: { padding: "14px 18px", textAlign: "right", fontSize: 12, color: uiTheme.colors.muted, fontWeight: 600, borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`, borderBottom: `1px solid ${uiTheme.colors.border}`, background: "#fff" },
  td: { padding: "15px 18px", borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`, fontSize: 13, verticalAlign: "middle", color: uiTheme.colors.text },
  tdActions: { padding: "15px 18px", borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`, fontSize: 13, verticalAlign: "middle", textAlign: "right" },
  monitorCell: { display: "flex", alignItems: "center", gap: 12 },
  monitorIcon: { width: 38, height: 38, borderRadius: uiTheme.radii.sm, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, display: "grid", placeItems: "center", flexShrink: 0 },
  monitorText: { display: "grid", gap: 4, minWidth: 0 },
  badgeDot: { width: 7, height: 7, borderRadius: 999, background: "currentColor" },
  secondaryLink: { ...secondaryButtonBase, minHeight: 34, padding: "0 12px", textDecoration: "none", whiteSpace: "nowrap", borderRadius: uiTheme.radii.sm, display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 600 },
};
