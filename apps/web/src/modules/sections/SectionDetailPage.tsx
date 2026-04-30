import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  controlBase,
  inputBase,
  pageActiveButtonBase,
  pageArrowBase,
  pageMain,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from '../../theme/commonStyles';
import { getMonitors, type Monitor } from '../../shared/monitorApi';
import {
  getMonitorViewStatus,
  type MonitorViewStatus,
} from '../../shared/monitorFilters';
import { useLocalPagination } from '../../shared/useLocalPagination';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';
import {
  readSections,
  sanitizeSections,
  writeSections,
  type MonitorSection,
} from '../../shared/sectionsStore';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  FilterIcon,
  GlobeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from '../../shared/uiIcons';
import {
  SectionIconGlyph,
  getSectionIconWrapStyle,
} from './sectionVisuals';

const statusOptions = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Operativos', value: 'UP' },
  { label: 'Incidencias', value: 'DOWN' },
  { label: 'Pausados', value: 'PAUSED' },
  { label: 'Pendientes', value: 'UNKNOWN' },
] as const;

const typeOptions = [
  { label: 'Todos', value: 'ALL' },
  { label: 'HTTP', value: 'HTTP' },
  { label: 'HTTPS', value: 'HTTPS' },
] as const;

type StatusFilter = (typeof statusOptions)[number]['value'];
type TypeFilter = (typeof typeOptions)[number]['value'];
type ActiveTab = 'monitors' | 'summary' | 'alerts' | 'incidents' | 'settings';

export default function SectionDetailPage() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState<MonitorSection | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [activeTab, setActiveTab] = useState<ActiveTab>('monitors');

  const loadData = async () => {
    setLoading(true);

    try {
      const sections = readSections();
      const currentSection = sections.find((item) => item.id === sectionId) ?? null;
      const nextMonitors = await getMonitors();
      const sanitizedSections = sanitizeSections(
        sections,
        nextMonitors.map((monitor) => monitor.id),
      );
      const sanitizedSection =
        sanitizedSections.find((item) => item.id === sectionId) ?? null;

      if (JSON.stringify(sections) !== JSON.stringify(sanitizedSections)) {
        writeSections(sanitizedSections);
      }

      setSection(sanitizedSection ?? currentSection);
      setMonitors(nextMonitors);
      setError(null);
    } catch (currentError) {
      console.error('Error loading section detail', currentError);
      setError('No se pudo cargar la seccion.');
      setMonitors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [sectionId]);

  const sectionMonitors = useMemo(() => {
    if (!section) {
      return [];
    }

    return monitors.filter((monitor) => section.monitorIds.includes(monitor.id));
  }, [monitors, section]);

  const stats = useMemo(() => {
    const statuses = sectionMonitors.map((monitor) => getMonitorViewStatus(monitor));
    const up = statuses.filter((status) => status === 'UP').length;
    const down = statuses.filter((status) => status === 'DOWN').length;
    const paused = statuses.filter((status) => status === 'PAUSED').length;
    const unknown = statuses.filter((status) => status === 'UNKNOWN').length;
    const activeAlerts = down;
    const uptime =
      sectionMonitors.length === 0
        ? '0%'
        : `${((up / sectionMonitors.length) * 100).toFixed(2)}%`;

    const statusTone: 'green' | 'orange' | 'slate' =
      sectionMonitors.length === 0 || unknown > 0 || paused === sectionMonitors.length
        ? 'slate'
        : down > 0
          ? 'orange'
          : 'green';

    return {
      up,
      down,
      paused,
      unknown,
      activeAlerts,
      uptime,
      statusLabel:
        sectionMonitors.length === 0
          ? 'Sin monitores'
          : down > 0
            ? `${down} ${down === 1 ? 'incidencia' : 'incidencias'}`
            : 'Todo operativo',
      statusTone,
    };
  }, [sectionMonitors]);

  const filteredMonitors = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return sectionMonitors.filter((monitor) => {
      const viewStatus = getMonitorViewStatus(monitor);
      const matchesSearch =
        searchTerm.length === 0 ||
        monitor.name.toLowerCase().includes(searchTerm) ||
        monitor.target.toLowerCase().includes(searchTerm);
      const matchesStatus =
        statusFilter === 'ALL' || viewStatus === statusFilter;
      const matchesType = typeFilter === 'ALL' || monitor.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, sectionMonitors, statusFilter, typeFilter]);

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeStart,
    rangeEnd,
    hasNextPage,
    hasPreviousPage,
  } = useLocalPagination(filteredMonitors, {
    pageSize: 10,
    resetKey: `${search}|${statusFilter}|${typeFilter}|${filteredMonitors.length}`,
  });

  if (loading) {
    return (
      <main style={styles.page}>
        <LoadingState variant="page" label="Cargando seccion" />
      </main>
    );
  }

  if (error || !section) {
    return (
      <main style={styles.page}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <MonitorIcon size={26} />
          </div>
          <strong>{error ?? 'Seccion no encontrada.'}</strong>
          <Link to="/sections" style={styles.secondaryLink}>
            Volver a secciones
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <AppTopbar
        title="Detalle de seccion"
        subtitle={section.name}
        onRefresh={loadData}
        cta={{
          icon: <PlusIcon size={16} />,
          label: "Nuevo monitor",
          to: "/monitors/create",
        }}
      />

      <div style={styles.breadcrumb}>
        <Link to="/sections" style={styles.breadcrumbLink}>
          Secciones
        </Link>
        <ChevronRightIcon size={14} />
        <strong>{section.name}</strong>
      </div>

      <header style={styles.hero}>
        <div style={styles.heroMain}>
          <div style={getSectionIconWrapStyle(section.icon, styles.heroIcon)}>
            <SectionIconGlyph icon={section.icon} size={34} />
          </div>

          <div style={styles.heroCopy}>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>{section.name}</h1>
              <span style={styles.countBadge}>
                <MonitorIcon size={14} />
                {sectionMonitors.length}{' '}
                {sectionMonitors.length === 1 ? 'monitor' : 'monitores'}
              </span>
            </div>
            <p style={styles.description}>
              {section.description || 'Monitores agrupados en esta seccion.'}
            </p>
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                <ClockIcon size={14} />
                Ultima actualizacion: {formatRelativeDate(section.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.heroActions}>
          <Link to="/sections" style={styles.secondaryButton}>
            <SettingsIcon size={16} />
            Configurar seccion
          </Link>
          <Link to="/monitors/create" style={styles.primaryButton}>
            <PlusIcon size={16} />
            Anadir monitor
          </Link>
          <button type="button" style={styles.moreButton}>
            <MoreHorizontalIcon size={18} />
          </button>
        </div>
      </header>

      <section style={styles.kpiGrid}>
        <KpiCard
          icon={<CheckCircleIcon size={22} />}
          iconTone="green"
          title="Estado general"
          value={stats.statusLabel}
          note={stats.activeAlerts > 0 ? 'Requiere revision' : 'Sin incidencias activas'}
          valueTone={stats.statusTone}
        />
        <KpiCard
          icon={<MonitorIcon size={22} />}
          iconTone="blue"
          title="Monitores"
          value={`${stats.up} / ${sectionMonitors.length}`}
          note="Todos los monitores"
        />
        <KpiCard
          icon={<span style={styles.alertDot} />}
          iconTone="orange"
          title="Alertas activas"
          value={stats.activeAlerts}
          note={stats.activeAlerts > 0 ? 'Incidencias abiertas' : 'Sin alertas activas'}
        />
        <KpiCard
          icon={<TrendingGlyph />}
          iconTone="purple"
          title="Uptime estimado"
          value={stats.uptime}
          note="Segun estado actual"
        />
      </section>

      <nav style={styles.tabs}>
        {[
          { key: 'monitors', label: 'Monitores' },
          { key: 'summary', label: 'Resumen' },
          { key: 'alerts', label: 'Alertas' },
          { key: 'incidents', label: 'Incidencias' },
          { key: 'settings', label: 'Configuracion' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            style={
              activeTab === tab.key ? styles.tabActiveButton : styles.tabButton
            }
            onClick={() => setActiveTab(tab.key as ActiveTab)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'monitors' ? (
        <section style={styles.monitorArea}>
          <div style={styles.toolbar}>
            <label style={styles.searchWrap}>
              <SearchIcon size={18} />
              <input
                style={styles.searchInput}
                placeholder="Buscar monitores..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div style={styles.filters}>
              <label style={styles.selectWrap}>
                Estado:
                <select
                  style={styles.select}
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.selectWrap}>
                Tipo:
                <select
                  style={styles.select}
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as TypeFilter)
                  }
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" style={styles.filterButton}>
                <FilterIcon size={16} />
              </button>
            </div>
          </div>

          <div style={styles.tableCard}>
            {filteredMonitors.length === 0 ? (
              <div style={styles.emptyTable}>
                <strong>No hay monitores en esta vista.</strong>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Monitor</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Uptime estimado</th>
                    <th style={styles.th}>Ultima comprobacion</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((monitor) => {
                    const viewStatus = getMonitorViewStatus(monitor);

                    return (
                      <tr
                        key={monitor.id}
                        style={styles.tr}
                        onClick={() => navigate(`/monitors/${monitor.id}`)}
                      >
                        <td style={styles.td}>
                          <div style={styles.monitorCell}>
                            <span style={styles.monitorIcon}>
                              {monitor.type === 'HTTPS' ? (
                                <GlobeIcon size={18} />
                              ) : (
                                <MonitorIcon size={18} />
                              )}
                            </span>
                            <span style={styles.monitorCopy}>
                              <strong>{monitor.name}</strong>
                              <span>{monitor.target}</span>
                            </span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.typeBadge}>{monitor.type}</span>
                        </td>
                        <td style={styles.td}>
                          <StatusText status={viewStatus} />
                        </td>
                        <td style={styles.td}>
                          <span style={styles.uptimeCell}>
                            {getMonitorUptime(viewStatus)}
                            {viewStatus === 'UP' && (
                              <small style={styles.uptimeTrend}>+ 0.02%</small>
                            )}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {formatRelativeDate(monitor.lastCheckedAt)}
                        </td>
                        <td
                          style={styles.td}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button type="button" style={styles.moreButton}>
                            <MoreHorizontalIcon size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.pagination}>
            <span style={styles.paginationText}>
              Mostrando {rangeStart} a {rangeEnd} de {filteredMonitors.length}{' '}
              monitores
            </span>

            <div style={styles.pages}>
              <button
                type="button"
                style={styles.pageArrow}
                onClick={() => setPage(page - 1)}
                disabled={!hasPreviousPage}
                aria-label="Pagina anterior"
              >
                <span style={styles.pageArrowLeft}>
                  <ChevronRightIcon size={14} />
                </span>
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    style={
                      pageNumber === page
                        ? styles.pageActiveButton
                        : styles.pageNumberButton
                    }
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              <button
                type="button"
                style={styles.pageArrow}
                onClick={() => setPage(page + 1)}
                disabled={!hasNextPage}
                aria-label="Pagina siguiente"
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>

            <span style={styles.pageSize}>10 por pagina</span>
          </div>
        </section>
      ) : (
        <section style={styles.placeholderPanel}>
          <strong>{getTabTitle(activeTab)}</strong>
        </section>
      )}
    </main>
  );
}

function KpiCard({
  icon,
  iconTone,
  title,
  value,
  note,
  valueTone = 'default',
}: {
  icon: React.ReactNode;
  iconTone: 'green' | 'blue' | 'orange' | 'purple';
  title: string;
  value: string | number;
  note: string;
  valueTone?: 'default' | 'green' | 'orange' | 'slate';
}) {
  return (
    <article style={styles.kpiCard}>
      <span style={{ ...styles.kpiIcon, ...styles[`kpiIcon${iconTone}`] }}>
        {icon}
      </span>
      <div>
        <span style={styles.kpiTitle}>{title}</span>
        <strong
          style={{
            ...styles.kpiValue,
            ...(valueTone === 'green'
              ? styles.valueGreen
              : valueTone === 'orange'
                ? styles.valueOrange
                : valueTone === 'slate'
                  ? styles.valueSlate
                  : {}),
          }}
        >
          {value}
        </strong>
        <p style={styles.kpiNote}>{note}</p>
      </div>
    </article>
  );
}

function StatusText({ status }: { status: MonitorViewStatus }) {
  return (
    <span
      style={{
        ...styles.statusText,
        ...(status === 'UP'
          ? styles.statusGreen
          : status === 'DOWN'
            ? styles.statusOrange
            : styles.statusSlate),
      }}
    >
      <span style={styles.statusDot}>●</span>
      {status === 'UP'
        ? 'Operativo'
        : status === 'DOWN'
          ? 'Incidencia'
          : status === 'PAUSED'
            ? 'Pausado'
            : 'Pendiente'}
    </span>
  );
}

function TrendingGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 16 9 11l4 4 7-8" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function getMonitorUptime(status: MonitorViewStatus) {
  if (status === 'UP') {
    return '99.98%';
  }

  if (status === 'DOWN') {
    return '96.40%';
  }

  if (status === 'PAUSED') {
    return 'Pausado';
  }

  return 'Pendiente';
}

function getTabTitle(tab: ActiveTab) {
  if (tab === 'summary') {
    return 'Resumen';
  }

  if (tab === 'alerts') {
    return 'Alertas';
  }

  if (tab === 'incidents') {
    return 'Incidencias';
  }

  return 'Configuracion';
}

function formatRelativeDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return '-';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'Hace menos de 1 min';
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} d`;
}

const styles: Record<string, CSSProperties> = {
  page: {
    ...pageMain,
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: uiTheme.colors.muted,
    fontSize: 13,
    fontWeight: 500,
  },
  breadcrumbLink: {
    color: uiTheme.colors.muted,
    textDecoration: 'none',
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
  },
  heroMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    minWidth: 0,
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 20,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  heroCopy: {
    minWidth: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 850,
    color: uiTheme.colors.text,
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '6px 10px',
    borderRadius: 999,
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    fontSize: 12,
    fontWeight: 600,
  },
  description: {
    margin: '10px 0 0',
    color: uiTheme.colors.muted,
    maxWidth: 680,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 500,
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  metaDivider: {
    width: 1,
    height: 15,
    background: uiTheme.colors.borderStrong,
  },
  heroActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    ...primaryButtonBase,
    minHeight: 42,
    padding: '0 18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    fontWeight: 600,
    textDecoration: 'none',
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 42,
    padding: '0 16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    fontWeight: 500,
    textDecoration: 'none',
  },
  secondaryLink: {
    ...secondaryButtonBase,
    marginTop: 16,
    minHeight: 40,
    padding: '0 14px',
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    fontWeight: 500,
  },
  moreButton: {
    ...controlBase,
    width: 42,
    height: 42,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    background: uiTheme.colors.surface,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
  },
  kpiCard: {
    ...surfaceCard,
    minHeight: 92,
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  kpiIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  kpiIcongreen: {
    color: uiTheme.colors.success,
    background: uiTheme.colors.successSoft,
  },
  kpiIconblue: {
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
  },
  kpiIconorange: {
    color: uiTheme.colors.warning,
    background: uiTheme.colors.warningSoft,
  },
  kpiIconpurple: {
    color: '#9333ea',
    background: '#faf5ff',
  },
  alertDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    background: uiTheme.colors.warning,
  },
  kpiTitle: {
    display: 'block',
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
  },
  kpiValue: {
    display: 'block',
    color: uiTheme.colors.text,
    fontSize: 22,
    lineHeight: 1.1,
  },
  kpiNote: {
    margin: '8px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  valueGreen: {
    color: uiTheme.colors.success,
  },
  valueOrange: {
    color: uiTheme.colors.warning,
  },
  valueSlate: {
    color: uiTheme.colors.muted,
  },
  tabs: {
    display: 'flex',
    gap: 12,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },
  tabButton: {
    border: 'none',
    background: 'transparent',
    color: uiTheme.colors.muted,
    fontWeight: 500,
    fontSize: 14,
    padding: '0 16px 14px',
    cursor: 'pointer',
  },
  tabActiveButton: {
    border: 'none',
    background: 'transparent',
    color: uiTheme.colors.primary,
    fontWeight: 600,
    fontSize: 14,
    padding: '0 16px 14px',
    cursor: 'pointer',
    boxShadow: `inset 0 -2px 0 ${uiTheme.colors.primary}`,
  },
  monitorArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  searchWrap: {
    ...inputBase,
    width: 'min(360px, 100%)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: uiTheme.colors.muted,
    paddingLeft: 14,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    background: 'transparent',
    color: uiTheme.colors.text,
    fontSize: 14,
  },
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  selectWrap: {
    ...controlBase,
    height: 42,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 14px',
    color: uiTheme.colors.muted,
    fontSize: 13,
    fontWeight: 500,
  },
  select: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    color: uiTheme.colors.text,
    fontWeight: 500,
  },
  filterButton: {
    ...controlBase,
    width: 42,
    height: 42,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    color: uiTheme.colors.muted,
  },
  tableCard: {
    ...surfaceCard,
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '13px 16px',
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 600,
    background: uiTheme.colors.background,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },
  tr: {
    cursor: 'pointer',
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surface,
  },
  td: {
    padding: '14px 16px',
    color: uiTheme.colors.text,
    fontSize: 13,
  },
  monitorCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  monitorIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    display: 'grid',
    placeItems: 'center',
    color: uiTheme.colors.success,
    background: uiTheme.colors.successSoft,
  },
  monitorCopy: {
    display: 'grid',
    gap: 4,
    minWidth: 0,
  },
  typeBadge: {
    display: 'inline-flex',
    padding: '5px 8px',
    borderRadius: 7,
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    fontWeight: 600,
    fontSize: 12,
  },
  statusText: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 500,
  },
  statusDot: {
    fontSize: 12,
    lineHeight: 1,
  },
  statusGreen: {
    color: uiTheme.colors.success,
  },
  statusOrange: {
    color: uiTheme.colors.warning,
  },
  statusSlate: {
    color: uiTheme.colors.muted,
  },
  uptimeCell: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 14,
    fontWeight: 600,
  },
  uptimeTrend: {
    color: uiTheme.colors.success,
    fontWeight: 600,
  },
  pagination: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  paginationText: {
    fontSize: 13,
  },
  pages: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pageArrow: {
    ...pageArrowBase,
  },
  pageArrowLeft: {
    display: 'inline-flex',
    transform: 'rotate(180deg)',
  },
  pageActiveButton: {
    ...pageActiveButtonBase,
  },
  pageNumberButton: {
    ...pageArrowBase,
    width: 36,
    fontWeight: 500,
  },
  pageSize: {
    justifySelf: 'end',
    ...controlBase,
    padding: '8px 12px',
  },
  emptyState: {
    minHeight: 420,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    color: uiTheme.colors.text,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    margin: '0 auto 16px',
    display: 'grid',
    placeItems: 'center',
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
  },
  emptyTable: {
    minHeight: 240,
    display: 'grid',
    placeItems: 'center',
    color: uiTheme.colors.muted,
  },
  placeholderPanel: {
    ...surfaceCard,
    minHeight: 240,
    display: 'grid',
    placeItems: 'center',
    color: uiTheme.colors.muted,
  },
};
