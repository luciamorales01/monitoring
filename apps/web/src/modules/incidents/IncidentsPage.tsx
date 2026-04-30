import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUniqueOptions, matchesSearchTerm, normalizeSearchTerm } from '../../shared/filterUtils';
import { getIncidents, type Incident } from '../../shared/incidentApi';
import { useLocalPagination } from '../../shared/useLocalPagination';
import { useUrlFilterState } from '../../shared/useUrlFilterState';
import {
  controlBase,
  filterGroupBase,
  inputBase,
  kpiCardBase,
  pageActiveButtonBase,
  pageArrowBase,
  pageMain,
  paginationBase,
  selectFakeBase,
  surfaceCard,
  tableCardBase,
  uiTheme,
} from '../../theme/commonStyles';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';
import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
} from '../../shared/uiIcons';

type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type IncidentFilterStatus = 'ALL' | 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

const incidentFilterDefaults = {
  monitor: 'ALL',
  search: '',
  severity: 'ALL',
  status: 'ALL',
  tab: 'active',
};

const incidentAllowedValues = {
  severity: ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  status: ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'],
  tab: ['active', 'history'],
} as const;

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hoveredIncidentId, setHoveredIncidentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filters, setFilter } = useUrlFilterState(
    incidentFilterDefaults,
    incidentAllowedValues,
  );

  const loadData = async () => {
    try {
      setError(null);
      const allIncidents = await getIncidents();
      setIncidents(allIncidents);
    } catch (currentError) {
      console.error('Error loading incidents', currentError);
      setError('No se pudieron cargar las incidencias.');
      setIncidents([]);
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.status !== 'RESOLVED'),
    [incidents],
  );

  const historyIncidents = useMemo(
    () => incidents.filter((incident) => incident.status === 'RESOLVED'),
    [incidents],
  );

  const openCount = activeIncidents.length;
  const investigatingCount = activeIncidents.filter(
    (incident) => getIncidentViewStatus(incident) === 'INVESTIGATING',
  ).length;
  const resolvedCount = historyIncidents.length;
  const resolutionRate = incidents.length
    ? `${Math.round((resolvedCount / incidents.length) * 100)}%`
    : '0%';
  const meanResolutionTime = formatAverageResolution(historyIncidents);

  const monitorOptions = useMemo(() => {
    return getUniqueOptions(incidents.map((incident) => incident.monitor?.name));
  }, [incidents]);

  const scopedIncidents =
    filters.tab === 'active' ? activeIncidents : historyIncidents;

  const filteredIncidents = useMemo(() => {
    const searchTerm = normalizeSearchTerm(filters.search);

    return scopedIncidents.filter((incident) => {
      const monitorName = incident.monitor?.name ?? '';
      const monitorTarget = incident.monitor?.target ?? '';
      const incidentCode = `inc-${String(incident.id).padStart(4, '0')}`;
      const viewStatus = getIncidentViewStatus(incident);
      const severity = getIncidentSeverity(incident);

      const matchesStatus =
        filters.status === 'ALL' ||
        viewStatus === filters.status ||
        incident.status === filters.status;

      const matchesSeverity =
        filters.severity === 'ALL' || severity === filters.severity;

      const matchesMonitor =
        filters.monitor === 'ALL' || monitorName === filters.monitor;

      return (
        matchesSearchTerm(
          searchTerm,
          incident.title,
          monitorName,
          monitorTarget,
          incidentCode,
        ) &&
        matchesStatus &&
        matchesSeverity &&
        matchesMonitor
      );
    });
  }, [filters.monitor, filters.search, filters.severity, filters.status, scopedIncidents]);

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeStart,
    rangeEnd,
    hasPreviousPage,
    hasNextPage,
  } = useLocalPagination(filteredIncidents, {
    pageSize: 10,
    resetKey: `${filters.tab}|${filters.search}|${filters.status}|${filters.severity}|${filters.monitor}|${filteredIncidents.length}`,
  });

  const incidentTotalsByMonitor = useMemo(() => {
    const groupedTotals = new Map<string, number>();

    for (const incident of incidents) {
      const key = incident.monitor?.name ?? incident.title;
      groupedTotals.set(key, (groupedTotals.get(key) ?? 0) + 1);
    }

    return Array.from(groupedTotals.entries())
      .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])
      .slice(0, 5);
  }, [incidents]);

  const donutBackground = useMemo(() => {
    const total = openCount + investigatingCount + resolvedCount;

    if (total === 0) {
      return 'conic-gradient(#e2e8f0 0 100%)';
    }

    const openAngle = Math.round((openCount / total) * 100);
    const investigatingAngle = Math.round((investigatingCount / total) * 100);
    const resolvedStart = openAngle + investigatingAngle;

    return `conic-gradient(${uiTheme.colors.danger} 0 ${openAngle}%, ${uiTheme.colors.warning} ${openAngle}% ${resolvedStart}%, ${uiTheme.colors.primary} ${resolvedStart}% 100%)`;
  }, [investigatingCount, openCount, resolvedCount]);

  return (
    <main style={styles.main}>
      <AppTopbar
        title="Incidencias"
        subtitle="Gestiona y da seguimiento a las incidencias detectadas en tus servicios."
        onRefresh={loadData}
      />

      <section style={styles.kpiGrid}>
        <KpiCard title="Incidencias abiertas" value={openCount} tone="red" />
        <KpiCard title="En investigación" value={investigatingCount} tone="orange" />
        <KpiCard title="Resueltas" value={resolvedCount} tone="blue" />
        <KpiCard title="Tiempo medio resolución" value={meanResolutionTime} tone="blue" />
        <KpiCard title="Tasa de resolución" value={resolutionRate} tone="blue" />
      </section>

      <section style={styles.contentGrid}>
        <div style={styles.tableCard}>
          <div style={styles.toolbar}>
              <input
                style={styles.search}
                placeholder="Buscar por título, web, ID..."
                value={filters.search}
                onChange={(event) => setFilter('search', event.target.value)}
              />

            <label style={styles.filterGroup}>
              <span>Estado</span>
              <select
                style={styles.select}
                value={filters.status}
                onChange={(event) => setFilter('status', event.target.value)}
              >
                <option value="ALL">Todos</option>
                <option value="OPEN">Abiertas</option>
                <option value="INVESTIGATING">En investigación</option>
                <option value="RESOLVED">Resueltas</option>
              </select>
            </label>

            <label style={styles.filterGroup}>
              <span>Severidad</span>
              <select
                style={styles.select}
                value={filters.severity}
                onChange={(event) => setFilter('severity', event.target.value)}
              >
                <option value="ALL">Todas</option>
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </label>

            <label style={styles.filterGroup}>
              <span>Web</span>
              <select
                style={styles.select}
                value={filters.monitor}
                onChange={(event) => setFilter('monitor', event.target.value)}
              >
                <option value="ALL">Todas</option>
                {monitorOptions.map((monitorName) => (
                  <option key={monitorName} value={monitorName}>
                    {monitorName}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.filterGroup}>
              <span>Vista</span>
              <div style={styles.tabs}>
                <button
                  type="button"
                  onClick={() => setFilter('tab', 'active')}
                  style={{ ...styles.tabButton, ...(filters.tab === 'active' ? styles.tabActive : {}) }}
                >
                  Activas
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('tab', 'history')}
                  style={{ ...styles.tabButton, ...(filters.tab === 'history' ? styles.tabActive : {}) }}
                >
                  Historial
                </button>
              </div>
            </label>
          </div>

          {loading ? (
            <LoadingState variant="table" label="Cargando incidencias" rows={7} />
          ) : error ? (
            <p style={styles.empty}>{error}</p>
          ) : filteredIncidents.length === 0 ? (
            <p style={styles.empty}>
              {filters.tab === 'active' ? 'No hay incidencias activas.' : 'No hay incidencias resueltas.'}
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Incidencia</th>
                  <th style={styles.th}>Web</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Creación</th>
                  <th style={styles.th}>Resolución</th>
                  <th style={styles.th}>Duración</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.map((incident) => (
                  <tr
                    key={incident.id}
                    style={{
                      ...styles.tr,
                      ...(hoveredIncidentId === incident.id ? styles.trHover : {}),
                    }}
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    onMouseEnter={() => setHoveredIncidentId(incident.id)}
                    onMouseLeave={() => setHoveredIncidentId(null)}
                  >
                    <td style={styles.td}>
                      <strong>{incident.title}</strong>
                      <div style={styles.url}>
                        ID: INC-{String(incident.id).padStart(4, '0')} · {getSeverityLabel(getIncidentSeverity(incident))}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <strong>{incident.monitor?.name ?? 'Monitor'}</strong>
                      <div style={styles.url}>{incident.monitor?.target ?? '-'}</div>
                    </td>

                    <td style={styles.td}>
                      <StatusBadge status={getIncidentViewStatus(incident)} />
                    </td>

                    <td style={styles.td}>{formatDate(incident.startedAt)}</td>
                    <td style={styles.td}>{incident.resolvedAt ? formatDate(incident.resolvedAt) : '-'}</td>
                    <td style={styles.td}>{formatDuration(getIncidentDurationSeconds(incident))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={styles.pagination}>
            <span>
              Mostrando {rangeStart} a {rangeEnd} de {filteredIncidents.length} incidencias
            </span>
            <div style={styles.pages}>
              <button
                type="button"
                style={styles.pageArrow}
                onClick={() => setPage(page - 1)}
                disabled={!hasPreviousPage}
                aria-label="Página anterior"
              >
                <span style={styles.pageArrowLeft}>
                  <ChevronRightIcon size={14} />
                </span>
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
                <ChevronRightIcon size={14} />
              </button>
            </div>
            <span style={styles.selectFake}>10 por página</span>
          </div>
        </div>

        <aside style={styles.sidePanel}>
          <div style={styles.sideCard}>
            <h2 style={styles.cardTitle}>Incidencias por estado</h2>

            <div style={{ ...styles.donut, background: donutBackground }}>
              <div style={styles.donutInner}>
                <strong>{incidents.length}</strong>
                <span>Total</span>
              </div>
            </div>

            <LegendRow color={uiTheme.colors.danger} label="Abiertas" value={openCount} />
            <LegendRow color={uiTheme.colors.warning} label="En investigación" value={investigatingCount} />
            <LegendRow color={uiTheme.colors.primary} label="Resueltas" value={resolvedCount} />
          </div>

          <div style={styles.sideCard}>
            <h2 style={styles.cardTitle}>Top webs con más incidencias</h2>

            {incidentTotalsByMonitor.length === 0 ? (
              <p style={styles.empty}>Sin incidencias registradas.</p>
            ) : (
              incidentTotalsByMonitor.map(([monitorName, total], index) => (
                <div key={monitorName} style={styles.topRow}>
                  <span>{index + 1}</span>
                  <strong>{monitorName}</strong>
                  <span style={styles.countBadge}>{total}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
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
  tone: 'red' | 'orange' | 'blue' | 'purple' | 'green';
}) {
  const colors = {
    red: uiTheme.colors.danger,
    orange: uiTheme.colors.warning,
    blue: uiTheme.colors.primary,
    purple: uiTheme.colors.primary,
    green: uiTheme.colors.primary,
  };

  return (
    <div style={styles.kpiCard}>
      <div style={{ ...styles.kpiIcon, background: `${colors[tone]}16`, color: colors[tone] }}>
        {tone === 'red' || tone === 'orange' ? <AlertTriangleIcon size={18} /> : tone === 'green' ? <CheckCircleIcon size={18} /> : tone === 'blue' ? <BellIcon size={18} /> : <ClockIcon size={18} />}
      </div>
      <div>
        <p style={styles.kpiTitle}>{title}</p>
        <strong style={{ ...styles.kpiValue, color: colors[tone] }}>{value}</strong>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: IncidentFilterStatus }) {
  const stylesByStatus: Record<IncidentFilterStatus, { background: string; color: string; label: string }> = {
    ALL: { background: uiTheme.colors.background, color: uiTheme.colors.muted, label: 'Todas' },
    OPEN: { background: uiTheme.colors.dangerSoft, color: '#dc2626', label: 'Abierta' },
    INVESTIGATING: { background: uiTheme.colors.warningSoft, color: '#d97706', label: 'En investigación' },
    RESOLVED: { background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, label: 'Resuelta' },
  };

  return (
    <span
      style={{
        ...styles.badge,
        background: stylesByStatus[status].background,
        color: stylesByStatus[status].color,
      }}
    >
      <span style={styles.badgeDot} />
      {stylesByStatus[status].label}
    </span>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={styles.legendRow}>
      <span style={{ ...styles.dot, background: color }} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getIncidentViewStatus(incident: Incident): IncidentFilterStatus {
  if (incident.status === 'RESOLVED') {
    return 'RESOLVED';
  }

  return getIncidentDurationSeconds(incident) >= 30 * 60 ? 'INVESTIGATING' : 'OPEN';
}

function getIncidentSeverity(incident: Incident): IncidentSeverity {
  const durationSeconds = getIncidentDurationSeconds(incident);

  if (durationSeconds >= 4 * 60 * 60) return 'CRITICAL';
  if (durationSeconds >= 60 * 60) return 'HIGH';
  if (durationSeconds >= 15 * 60) return 'MEDIUM';
  return 'LOW';
}

function getIncidentDurationSeconds(incident: Incident) {
  if (typeof incident.durationSeconds === 'number' && incident.durationSeconds > 0) {
    return incident.durationSeconds;
  }

  const startedAt = new Date(incident.startedAt).getTime();
  const finishedAt = incident.resolvedAt
    ? new Date(incident.resolvedAt).getTime()
    : Date.now();

  if (Number.isNaN(startedAt) || Number.isNaN(finishedAt)) {
    return 0;
  }

  return Math.max(0, Math.round((finishedAt - startedAt) / 1000));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return '-';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatAverageResolution(resolvedIncidents: Incident[]) {
  if (resolvedIncidents.length === 0) return '—';

  const totalDuration = resolvedIncidents.reduce(
    (sum, incident) => sum + getIncidentDurationSeconds(incident),
    0,
  );

  return formatDuration(Math.round(totalDuration / resolvedIncidents.length));
}

function getSeverityLabel(severity: IncidentSeverity) {
  const labels: Record<IncidentSeverity, string> = {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    CRITICAL: 'Crítica',
  };

  return labels[severity];
}

const styles: Record<string, React.CSSProperties> = {
  main: { ...pageMain, overflow: 'auto' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14, marginBottom: 14 },
  kpiCard: { ...kpiCardBase, padding: 18, display: 'flex', gap: 14, alignItems: 'center', minHeight: 94 },
  kpiIcon: { width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', flexShrink: 0 },
  kpiTitle: { margin: 0, color: uiTheme.colors.text, fontWeight: 600, fontSize: 13 },
  kpiValue: { display: 'block', marginTop: 6, fontSize: 24, lineHeight: 1 },

  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 },
  tableCard: { ...tableCardBase, borderRadius: uiTheme.radii.md, padding: 20 },
  toolbar: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, minmax(120px, 0.7fr)) auto', alignItems: 'end', gap: 12, marginBottom: 18 },
  search: inputBase,
  select: inputBase,
  filterGroup: filterGroupBase,
  tabs: { display: 'flex', gap: 8, alignItems: 'center' },
  tabButton: { ...controlBase, borderRadius: uiTheme.radii.sm, padding: '0 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13, height: 40, display: 'inline-flex', alignItems: 'center' },
  tabActive: { background: uiTheme.colors.primarySoft, borderColor: '#bfdbfe', color: uiTheme.colors.primary },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 10px', color: uiTheme.colors.muted, fontSize: 12, borderBottom: `1px solid ${uiTheme.colors.border}`, fontWeight: 800 },
  tr: { borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`, background: '#fff', cursor: 'pointer' },
  trHover: { background: '#F1F5F9' },
  td: { padding: '13px 10px', fontSize: 12, color: uiTheme.colors.text },
  url: { marginTop: 3, color: uiTheme.colors.muted, fontSize: 11 },
  badge: { padding: '5px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 },
  badgeDot: { width: 7, height: 7, borderRadius: 999, background: 'currentColor', display: 'inline-block' },
  empty: { color: uiTheme.colors.muted, fontSize: 13 },
  pagination: { ...paginationBase, padding: '16px 20px' },
  pages: { display: 'flex', gap: 10, alignItems: 'center', justifySelf: 'center', color: uiTheme.colors.text },
  pageActiveButton: pageActiveButtonBase,
  pageNumberButton: { border: '1px solid transparent', background: 'transparent', color: '#475569', minWidth: 36, textAlign: 'center', cursor: 'pointer', padding: '7px 11px' },
  pageArrow: pageArrowBase,
  pageArrowLeft: { transform: 'rotate(180deg)', display: 'grid', placeItems: 'center' },
  selectFake: { ...selectFakeBase, justifySelf: 'end' },

  sidePanel: { display: 'flex', flexDirection: 'column', gap: 14 },
  sideCard: { ...surfaceCard, borderRadius: uiTheme.radii.md, padding: 20 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 800 },
  donut: { width: 130, height: 130, borderRadius: '50%', margin: '24px auto', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.05)' },
  donutInner: { width: 88, height: 88, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: 12, boxShadow: '0 0 0 6px rgba(255,255,255,0.9)' },
  legendRow: { display: 'grid', gridTemplateColumns: '14px 1fr 32px', gap: 8, alignItems: 'center', fontSize: 12, padding: '8px 0', borderTop: `1px solid ${uiTheme.colors.surfaceSoft}` },
  dot: { width: 8, height: 8, borderRadius: 999 },
  topRow: { display: 'grid', gridTemplateColumns: '20px 1fr 28px', alignItems: 'center', gap: 8, padding: '9px 0', fontSize: 12 },
  countBadge: { background: '#fee2e2', color: '#dc2626', borderRadius: 999, padding: '3px 8px', fontWeight: 800 },
};
