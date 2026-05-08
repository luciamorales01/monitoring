import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../../shared/LoadingState';
import { getNotifications, type NotificationEvent } from '../../shared/notificationApi';
import {
  pageMain,
  pageSubtitle,
  pageTitle,
  primaryButtonBase,
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    return notifications.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'SENT') acc.sent += 1;
        if (item.status === 'FAILED') acc.failed += 1;
        if (item.status === 'SKIPPED') acc.skipped += 1;
        return acc;
      },
      { total: 0, sent: 0, failed: 0, skipped: 0 },
    );
  }, [notifications]);

  if (loading) return <LoadingState label="Cargando notificaciones..." />;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={pageTitle}>Notificaciones</h1>
          <p style={pageSubtitle}>Historial de emails enviados, omitidos o fallidos por los monitores.</p>
        </div>
        <button type="button" onClick={() => void load()} style={styles.refreshButton}>Actualizar</button>
      </header>

      <section style={styles.kpiGrid}>
        <Kpi label="Eventos" value={summary.total} />
        <Kpi label="Enviadas" value={summary.sent} tone="success" />
        <Kpi label="Fallidas" value={summary.failed} tone="danger" />
        <Kpi label="Omitidas" value={summary.skipped} />
      </section>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <section style={styles.card}>
        {notifications.length === 0 ? (
          <div style={styles.empty}>Todavía no hay notificaciones registradas.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Monitor</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Destinatario</th>
                  <th style={styles.th}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((item) => (
                  <tr key={item.id} style={styles.row}>
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

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'danger' }) {
  return (
    <article style={styles.kpiCard}>
      <span style={styles.kpiLabel}>{label}</span>
      <strong style={{ ...styles.kpiValue, color: tone === 'success' ? uiTheme.colors.success : tone === 'danger' ? uiTheme.colors.danger : uiTheme.colors.text }}>
        {value}
      </strong>
    </article>
  );
}

function StatusBadge({ status }: { status: NotificationEvent["status"] }) {
  const style =
    status === "SENT"
      ? toneStyles.green
      : status === "FAILED"
        ? toneStyles.red
        : status === "SKIPPED"
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
  refreshButton: { ...primaryButtonBase, height: 40, padding: '0 16px', cursor: 'pointer', boxShadow: 'none' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  kpiCard: { ...surfaceCard, padding: 18, display: 'grid', gap: 8 },
  kpiLabel: { color: uiTheme.colors.muted, fontSize: 13, fontWeight: 600 },
  kpiValue: { fontSize: 28, lineHeight: 1 },
  card: { ...surfaceCard, overflow: 'hidden' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '14px 16px', color: uiTheme.colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: `1px solid ${uiTheme.colors.border}` },
  row: { borderBottom: `1px solid ${uiTheme.colors.border}` },
  td: { padding: '14px 16px', color: uiTheme.colors.text, whiteSpace: 'nowrap' },
  tdMuted: { padding: '14px 16px', color: uiTheme.colors.muted, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 700 },
  link: { color: uiTheme.colors.primary, fontWeight: 700, textDecoration: 'none' },
  errorBox: { ...surfaceCard, padding: 16, color: uiTheme.colors.danger, borderColor: uiTheme.colors.danger },
  empty: { padding: 28, color: uiTheme.colors.muted, textAlign: 'center' },
};
