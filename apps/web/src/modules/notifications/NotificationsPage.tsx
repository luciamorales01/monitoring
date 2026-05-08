import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../../shared/LoadingState';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationsAsRead,
  type NotificationEvent,
} from '../../shared/notificationApi';
import {
  pageMain,
  pageSubtitle,
  pageTitle,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  toneStyles,
  uiTheme,
} from '../../theme/commonStyles';

const typeLabels: Record<NotificationEvent['type'], string> = {
  MONITOR_DOWN: 'Caída detectada',
  MONITOR_RECOVERED: 'Servicio recuperado',
};

const statusLabels: Record<NotificationEvent['status'], string> = {
  PENDING: 'Pendiente',
  SENT: 'Enviada',
  FAILED: 'Fallida',
  SKIPPED: 'Omitida',
};

type Filter = 'all' | 'unread' | 'failed';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications({ limit: 100 });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  const summary = useMemo(() => {
    return notifications.reduce(
      (acc, item) => {
        acc.total += 1;
        if (!item.readAt) acc.unread += 1;
        if (item.status === 'SENT') acc.sent += 1;
        if (item.status === 'FAILED') acc.failed += 1;
        if (item.status === 'SKIPPED') acc.skipped += 1;
        return acc;
      },
      { total: 0, unread: 0, sent: 0, failed: 0, skipped: 0 },
    );
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((item) => !item.readAt);
    if (filter === 'failed') return notifications.filter((item) => item.status === 'FAILED');
    return notifications;
  }, [filter, notifications]);

  const markOneAsRead = async (notification: NotificationEvent) => {
    if (notification.readAt) return;
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    try {
      await markNotificationsAsRead([notification.id]);
    } catch {
      await load();
    }
  };

  const markAllAsRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    try {
      await markAllNotificationsAsRead();
    } catch {
      await load();
    }
  };

  if (loading) return <LoadingState label="Cargando notificaciones..." />;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={pageTitle}>Notificaciones</h1>
          <p style={pageSubtitle}>Centro de alertas con lectura, historial y refresco automático.</p>
        </div>
        <div style={styles.headerActions}>
          <button type="button" onClick={() => void markAllAsRead()} style={styles.secondaryButton}>
            Marcar todas como leídas
          </button>
          <button type="button" onClick={() => void load()} style={styles.refreshButton}>Actualizar</button>
        </div>
      </header>

      <section style={styles.kpiGrid}>
        <Kpi label="Eventos" value={summary.total} />
        <Kpi label="No leídas" value={summary.unread} tone="warning" />
        <Kpi label="Enviadas" value={summary.sent} tone="success" />
        <Kpi label="Fallidas" value={summary.failed} tone="danger" />
      </section>

      <section style={styles.filters}>
        <FilterButton label="Todas" active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterButton label="No leídas" active={filter === 'unread'} onClick={() => setFilter('unread')} />
        <FilterButton label="Fallidas" active={filter === 'failed'} onClick={() => setFilter('failed')} />
      </section>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <section style={styles.card}>
        {visibleNotifications.length === 0 ? (
          <div style={styles.empty}>No hay notificaciones para este filtro.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Lectura</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Monitor</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Destino</th>
                  <th style={styles.th}>Detalle</th>
                  <th style={styles.th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {visibleNotifications.map((item) => (
                  <tr key={item.id} style={{ ...styles.row, ...(!item.readAt ? styles.unreadRow : {}) }}>
                    <td style={styles.td}>{item.readAt ? 'Leída' : <span style={styles.unreadPill}>Nueva</span>}</td>
                    <td style={styles.td}>{formatDate(item.createdAt)}</td>
                    <td style={styles.td}>{typeLabels[item.type]}</td>
                    <td style={styles.td}>
                      {item.monitor ? (
                        <Link to={`/monitors/${item.monitor.id}`} style={styles.link}>{item.monitor.name}</Link>
                      ) : (
                        'Monitor eliminado'
                      )}
                    </td>
                    <td style={styles.td}><StatusBadge status={item.status} /></td>
                    <td style={styles.tdMuted}>{item.recipient || '—'}</td>
                    <td style={styles.tdMuted}>{item.errorMessage || item.subject || '—'}</td>
                    <td style={styles.td}>
                      <button type="button" style={styles.inlineButton} onClick={() => void markOneAsRead(item)} disabled={Boolean(item.readAt)}>
                        {item.readAt ? 'OK' : 'Marcar leída'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" style={{ ...styles.filterButton, ...(active ? styles.filterButtonActive : {}) }} onClick={onClick}>{label}</button>;
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'danger' | 'warning' }) {
  const color = tone === 'success' ? uiTheme.colors.success : tone === 'danger' ? uiTheme.colors.danger : tone === 'warning' ? uiTheme.colors.warning ?? uiTheme.colors.primary : uiTheme.colors.text;
  return (
    <article style={styles.kpiCard}>
      <span style={styles.kpiLabel}>{label}</span>
      <strong style={{ ...styles.kpiValue, color }}>{value}</strong>
    </article>
  );
}

function StatusBadge({ status }: { status: NotificationEvent['status'] }) {
  const style =
    status === 'SENT'
      ? toneStyles.green
      : status === 'FAILED'
        ? toneStyles.red
        : status === 'SKIPPED'
          ? toneStyles.orange
          : toneStyles.blue;

  return <span style={{ ...styles.badge, ...style }}>{statusLabels[status]}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

const styles: Record<string, CSSProperties> = {
  page: { ...pageMain, display: 'grid', gap: 22 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center' },
  refreshButton: { ...primaryButtonBase, height: 40, padding: '0 16px', cursor: 'pointer', boxShadow: 'none' },
  secondaryButton: { ...secondaryButtonBase, height: 40, padding: '0 16px', cursor: 'pointer', boxShadow: 'none' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  kpiCard: { ...surfaceCard, padding: 18, display: 'grid', gap: 8 },
  kpiLabel: { color: uiTheme.colors.muted, fontSize: 13, fontWeight: 600 },
  kpiValue: { fontSize: 28, lineHeight: 1 },
  filters: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filterButton: { ...secondaryButtonBase, minHeight: 36, padding: '0 14px', cursor: 'pointer', boxShadow: 'none' },
  filterButtonActive: { background: uiTheme.colors.primary, color: '#fff', borderColor: uiTheme.colors.primary },
  card: { ...surfaceCard, overflow: 'hidden' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '14px 16px', color: uiTheme.colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: `1px solid ${uiTheme.colors.border}` },
  row: { borderBottom: `1px solid ${uiTheme.colors.border}` },
  unreadRow: { background: uiTheme.colors.primarySoft },
  td: { padding: '14px 16px', color: uiTheme.colors.text, whiteSpace: 'nowrap' },
  tdMuted: { padding: '14px 16px', color: uiTheme.colors.muted, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700 },
  unreadPill: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary },
  link: { color: uiTheme.colors.primary, fontWeight: 700, textDecoration: 'none' },
  inlineButton: { ...secondaryButtonBase, minHeight: 32, padding: '0 10px', cursor: 'pointer', boxShadow: 'none', fontSize: 12 },
  errorBox: { ...surfaceCard, padding: 16, color: uiTheme.colors.danger, borderColor: uiTheme.colors.danger },
  empty: { padding: 28, color: uiTheme.colors.muted, textAlign: 'center' },
};
