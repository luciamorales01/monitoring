import { useEffect, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicStatus, type PublicStatusResponse } from '../../shared/statusApi';
import { uiTheme } from '../../theme/commonStyles';

export default function PublicStatusPage() {
  const { slug } = useParams();
  const [data, setData] = useState<PublicStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('Falta el identificador de la organización en la URL.');
      return;
    }

    getPublicStatus(slug)
      .then(setData)
      .catch(() => setError('No se pudo cargar el estado público.'));
  }, [slug]);

  if (error) return <main style={styles.main}><p style={styles.error}>{error}</p></main>;
  if (!data) return <main style={styles.main}><p style={styles.muted}>Cargando estado...</p></main>;

  return (
    <main style={styles.main}>
      <section style={styles.hero}>
        <span style={getOverallBadge(data.overallStatus)}>{getOverallLabel(data.overallStatus)}</span>
        <h1 style={styles.title}>Estado de {data.organization.name}</h1>
        <p style={styles.subtitle}>Última actualización: {formatDate(data.generatedAt)}</p>
      </section>

      <section style={styles.grid}>
        {data.monitors.map((monitor) => (
          <article key={monitor.id} style={styles.card}>
            <div>
              <strong>{monitor.name}</strong>
              <p style={styles.target}>{monitor.target}</p>
            </div>
            <span style={getMonitorBadge(monitor.currentStatus)}>{getMonitorLabel(monitor.currentStatus)}</span>
            <small style={styles.muted}>{monitor.lastResponseTime ? `${monitor.lastResponseTime} ms` : 'Sin respuesta'} · {formatDate(monitor.lastCheckedAt)}</small>
          </article>
        ))}
      </section>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Incidencias activas</h2>
        {data.openIncidents.length === 0 ? (
          <p style={styles.muted}>No hay incidencias activas.</p>
        ) : (
          data.openIncidents.map((incident) => (
            <div key={incident.id} style={styles.incidentRow}>
              <strong>{incident.title}</strong>
              <span>{incident.monitor?.name ?? 'Monitor'}</span>
              <span>{formatDate(incident.startedAt)}</span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

function getOverallLabel(status: PublicStatusResponse['overallStatus']) {
  if (status === 'DEGRADED') return 'Servicio degradado';
  if (status === 'PARTIAL') return 'Estado parcial';
  return 'Todos los sistemas operativos';
}

function getOverallBadge(status: PublicStatusResponse['overallStatus']): CSSProperties {
  if (status === 'DEGRADED') return { ...styles.badge, background: '#fee2e2', color: '#b91c1c' };
  if (status === 'PARTIAL') return { ...styles.badge, background: '#fef3c7', color: '#b45309' };
  return { ...styles.badge, background: '#dcfce7', color: '#15803d' };
}

function getMonitorLabel(status: 'UP' | 'DOWN' | 'UNKNOWN') {
  if (status === 'UP') return 'Operativo';
  if (status === 'DOWN') return 'Caído';
  return 'Sin datos';
}

function getMonitorBadge(status: 'UP' | 'DOWN' | 'UNKNOWN'): CSSProperties {
  if (status === 'UP') return { ...styles.statusBadge, background: '#dcfce7', color: '#15803d' };
  if (status === 'DOWN') return { ...styles.statusBadge, background: '#fee2e2', color: '#b91c1c' };
  return { ...styles.statusBadge, background: uiTheme.colors.surfaceSoft, color: uiTheme.colors.muted };
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const styles: Record<string, CSSProperties> = {
  main: { minHeight: '100vh', padding: 32, background: uiTheme.colors.background, color: uiTheme.colors.text },
  hero: { maxWidth: 980, margin: '0 auto 22px', background: '#fff', border: `1px solid ${uiTheme.colors.border}`, borderRadius: 24, padding: 28, boxShadow: uiTheme.shadows.card },
  title: { margin: '12px 0 6px', fontSize: 36 },
  subtitle: { margin: 0, color: uiTheme.colors.muted },
  badge: { display: 'inline-flex', borderRadius: 999, padding: '8px 12px', fontWeight: 800, fontSize: 13 },
  grid: { maxWidth: 980, margin: '0 auto', display: 'grid', gap: 12 },
  card: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', background: '#fff', border: `1px solid ${uiTheme.colors.border}`, borderRadius: 18, padding: 18, boxShadow: uiTheme.shadows.card },
  target: { margin: '4px 0 0', color: uiTheme.colors.muted, fontSize: 13 },
  statusBadge: { borderRadius: 999, padding: '7px 10px', fontWeight: 800, fontSize: 12 },
  panel: { maxWidth: 980, margin: '18px auto 0', background: '#fff', border: `1px solid ${uiTheme.colors.border}`, borderRadius: 20, padding: 20, boxShadow: uiTheme.shadows.card },
  panelTitle: { margin: '0 0 12px', fontSize: 18 },
  incidentRow: { display: 'grid', gridTemplateColumns: '1fr 180px 120px', gap: 12, padding: '12px 0', borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`, fontSize: 13 },
  muted: { color: uiTheme.colors.muted },
  error: { color: '#991b1b', background: '#fee2e2', padding: 14, borderRadius: 14 },
};
