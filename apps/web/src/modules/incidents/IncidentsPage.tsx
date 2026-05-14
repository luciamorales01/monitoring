import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchesSearchTerm, normalizeSearchTerm } from '../../shared/filterUtils';
import { getIncidents, type Incident } from '../../shared/incidentApi';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationsAsRead,
  type NotificationEvent,
} from '../../shared/notificationApi';
import { realtimeEventName, type MonitoringRealtimeEvent } from '../../shared/realtimeEvents';
import { useLocalPagination } from '../../shared/useLocalPagination';
import { useUrlFilterState } from '../../shared/useUrlFilterState';
import { uiTheme } from '../../theme/commonStyles';
import AppTopbar from '../../shared/AppTopbar';
import { KpiCard, LegendRow, StatusBadge } from './components/IncidentsPageParts';
import { incidentAllowedValues, incidentFilterDefaults } from './IncidentsPage.constants';
import { styles } from './IncidentsPage.styles';
import { formatAverageResolution, formatDate, formatDuration, formatNotificationDate, getIncidentDurationSeconds, getIncidentSeverity, getIncidentViewStatus, getSeverityLabel } from './IncidentsPage.utils';
import LoadingState from '../../shared/LoadingState';
import { BellIcon, ChevronRightIcon } from '../../shared/uiIcons';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [hoveredIncidentId, setHoveredIncidentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filters, setFilter } = useUrlFilterState(
    incidentFilterDefaults,
    incidentAllowedValues,
  );

  const loadData = async () => {
    try {
      setError(null);
      const [allIncidents, recentNotifications] = await Promise.all([
        getIncidents(),
        getNotifications({ limit: 6 }),
      ]);
      setIncidents(allIncidents);
      setNotifications(Array.isArray(recentNotifications) ? recentNotifications : []);
    } catch (currentError) {
      console.error('Error loading incidents', currentError);
      setError('No se pudieron cargar las incidencias.');
      setIncidents([]);
      setNotifications([]);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const refreshIncidents = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as MonitoringRealtimeEvent;
      if (detail.name !== 'incident.created' && detail.name !== 'incident.resolved') return;
      void loadData();
    };

    window.addEventListener(realtimeEventName, refreshIncidents);
    return () => window.removeEventListener(realtimeEventName, refreshIncidents);
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

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const handleNotificationClick = async (notification: NotificationEvent) => {
    if (!notification.readAt) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );

      try {
        await markNotificationsAsRead([notification.id]);
      } catch {
        const refreshed = await getNotifications({ limit: 6 });
        setNotifications(Array.isArray(refreshed) ? refreshed : []);
      }
    }

    if (notification.incidentId) {
      navigate(`/incidents/${notification.incidentId}`);
      return;
    }

    if (notification.monitorId) {
      navigate(`/monitors/${notification.monitorId}`);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );

    try {
      await markAllNotificationsAsRead();
    } catch {
      const refreshed = await getNotifications({ limit: 6 });
      setNotifications(Array.isArray(refreshed) ? refreshed : []);
    }
  };

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
          <div style={styles.sideCard}>
            <div style={styles.notificationsHeader}>
              <h2 style={styles.cardTitle}>Alertas recientes</h2>
              {unreadNotificationsCount > 0 ? (
                <button
                  type="button"
                  style={styles.linkButton}
                  onClick={() => void handleMarkAllNotificationsAsRead()}
                >
                  Marcar leidas
                </button>
              ) : null}
            </div>

            {notificationLoading ? (
              <p style={styles.empty}>Cargando alertas...</p>
            ) : notifications.length === 0 ? (
              <p style={styles.empty}>No hay alertas recientes.</p>
            ) : (
              <div style={styles.notificationsList}>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    style={{
                      ...styles.notificationItem,
                      ...(!notification.readAt ? styles.notificationItemUnread : {}),
                    }}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <span
                      style={
                        notification.type === 'MONITOR_DOWN'
                          ? styles.notificationIconDanger
                          : styles.notificationIconSuccess
                      }
                    >
                      <BellIcon size={14} />
                    </span>
                    <span style={styles.notificationCopy}>
                      <strong>
                        {notification.type === 'MONITOR_DOWN'
                          ? 'Monitor caido'
                          : 'Monitor recuperado'}
                      </strong>
                      <small>
                        {notification.monitor?.name ?? 'Monitor'} ·{' '}
                        {formatNotificationDate(notification.createdAt)}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
