import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import {
  getPublicStatus,
  type PublicIncident,
  type PublicStatusResponse,
} from '../../shared/statusApi';
import { sortMonitorsByStatusAndLastCheck } from '../../shared/monitorFilters';
import { uiTheme } from '../../theme/commonStyles';

type MonitorStatus = PublicStatusResponse['monitors'][number]['currentStatus'];

export default function PublicStatusPage() {
  const { slug } = useParams();
  const [data, setData] = useState<PublicStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setError('Falta el identificador de la organización en la URL.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getPublicStatus(slug)
      .then((response) => {
        if (isMounted) setData(response);
      })
      .catch(() => {
        if (isMounted) setError('No se pudo cargar el estado público.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const hasIncidents = Boolean(data?.recentIncidents.length);
  const topMonitors = useMemo(
    () => sortMonitorsByStatusAndLastCheck(data?.monitors ?? []).slice(0, 12),
    [data],
  );

  if (isLoading) {
    return (
      <main style={styles.main}>
        <section style={styles.loadingCard}>Cargando estado público...</section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main style={styles.main}>
        <section style={styles.error}>{error ?? 'No se pudo cargar el estado público.'}</section>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <section style={styles.hero}>
        <div style={styles.heroTopline}>
          <span style={getOverallBadge(data.overallStatus)}>{getOverallLabel(data.overallStatus)}</span>
          <span style={styles.generated}>Actualizado: {formatDateTime(data.generatedAt)}</span>
        </div>

        <div style={styles.heroContent}>
          <div>
            <p style={styles.eyebrow}>Status page pública</p>
            <h1 style={styles.title}>Estado de {data.organization.name}</h1>
            <p style={styles.subtitle}>
              Disponibilidad, incidencias y rendimiento de los últimos {data.window.days} días.
            </p>
          </div>

          <div style={styles.scoreCard}>
            <span style={styles.scoreLabel}>Uptime global</span>
            <strong style={styles.score}>{formatPercentage(data.summary.uptimeLast30d)}</strong>
            <span style={styles.scoreHint}>{data.summary.checksLast30d} checks analizados</span>
          </div>
        </div>
      </section>

      <section style={styles.kpiGrid}>
        <Kpi label="Operativos" value={data.summary.operationalMonitors} tone="success" />
        <Kpi label="Caídos" value={data.summary.degradedMonitors} tone="danger" />
        <Kpi label="Incidencias activas" value={data.summary.activeIncidents} tone={data.summary.activeIncidents ? 'danger' : 'success'} />
        <Kpi label="Respuesta media" value={data.summary.avgResponseTimeMs ? `${data.summary.avgResponseTimeMs} ms` : '-'} tone="neutral" />
      </section>

      <section style={styles.sectionGrid}>
        <article style={styles.panelLarge}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>Servicios monitorizados</h2>
              <p style={styles.panelSubtitle}>SLA individual calculado sobre la ventana pública.</p>
            </div>
            <span style={styles.panelPill}>{data.summary.totalMonitors} servicios</span>
          </div>

          <div style={styles.monitorList}>
            {topMonitors.map((monitor) => (
              <div key={monitor.id} style={styles.monitorRow}>
                <div style={styles.monitorMain}>
                  <span style={getMonitorDot(monitor.currentStatus)} />
                  <div>
                    <strong>{monitor.name}</strong>
                    <p style={styles.target}>{monitor.target}</p>
                  </div>
                </div>

                <div style={styles.monitorMetrics}>
                  <span style={getMonitorBadge(monitor.currentStatus)}>{getMonitorLabel(monitor.currentStatus)}</span>
                  <span style={styles.metric}>{formatPercentage(monitor.sla.uptimePercentage)}</span>
                  <span style={styles.metricMuted}>{monitor.sla.avgResponseTimeMs ? `${monitor.sla.avgResponseTimeMs} ms` : '-'}</span>
                </div>

                <div style={styles.historyBar} aria-label={`Histórico de ${monitor.name}`}>
                  {buildHistorySlots(monitor.history).map((item) => (
                    <span key={item.date} title={`${item.date}: ${formatPercentage(item.uptimePercentage)}`} style={getHistorySlot(item.uptimePercentage)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside style={styles.sideColumn}>
          <article style={styles.panel}>
            <h2 style={styles.panelTitle}>SLA 30 días</h2>
            <div style={styles.slaStack}>
              <MetricLine label="Uptime" value={formatPercentage(data.summary.uptimeLast30d)} />
              <MetricLine label="Downtime estimado" value={`${data.summary.downtimeMinutesLast30d} min`} />
              <MetricLine label="Checks" value={data.summary.checksLast30d.toLocaleString('es-ES')} />
              <MetricLine label="Incidencias" value={data.summary.incidentsLast30d} />
            </div>
          </article>

          <article style={styles.panel}>
            <h2 style={styles.panelTitle}>Incidencias activas</h2>
            {data.openIncidents.length === 0 ? (
              <p style={styles.empty}>No hay incidencias activas.</p>
            ) : (
              <div style={styles.incidentStack}>
                {data.openIncidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </article>
        </aside>
      </section>

      <section style={styles.panelWide}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Historial reciente</h2>
            <p style={styles.panelSubtitle}>Incidencias detectadas en la ventana pública.</p>
          </div>
        </div>

        {!hasIncidents ? (
          <p style={styles.empty}>No hay incidencias recientes.</p>
        ) : (
          <div style={styles.timeline}>
            {data.recentIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} compact />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone: 'success' | 'danger' | 'neutral' }) {
  return (
    <article style={styles.kpiCard}>
      <span style={getKpiDot(tone)} />
      <p style={styles.kpiLabel}>{label}</p>
      <strong style={styles.kpiValue}>{value}</strong>
    </article>
  );
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.metricLine}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IncidentCard({ incident, compact = false }: { incident: PublicIncident; compact?: boolean }) {
  return (
    <article style={compact ? styles.incidentCompact : styles.incidentCard}>
      <div>
        <strong>{incident.title}</strong>
        <p style={styles.incidentMeta}>{incident.monitor?.name ?? 'Monitor'} · {formatDateTime(incident.startedAt)}</p>
      </div>
      <div style={styles.incidentBadges}>
        <span style={getSeverityBadge(incident.severity)}>{getSeverityLabel(incident.severity)}</span>
        <span style={styles.stateBadge}>{getIncidentStatusLabel(incident.status)}</span>
      </div>
    </article>
  );
}

function getOverallLabel(status: PublicStatusResponse['overallStatus']) {
  if (status === 'DEGRADED') return 'Servicio degradado';
  if (status === 'PARTIAL') return 'Estado parcial';
  return 'Todos los sistemas operativos';
}

function getOverallBadge(status: PublicStatusResponse['overallStatus']): CSSProperties {
  if (status === 'DEGRADED') return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (status === 'PARTIAL') return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function getMonitorLabel(status: MonitorStatus) {
  if (status === 'UP') return 'Operativo';
  if (status === 'DOWN') return 'Caído';
  return 'Sin datos';
}

function getMonitorBadge(status: MonitorStatus): CSSProperties {
  if (status === 'UP') return { ...styles.statusBadge, background: '#dcfce7', color: '#166534' };
  if (status === 'DOWN') return { ...styles.statusBadge, background: '#fee2e2', color: '#991b1b' };
  return { ...styles.statusBadge, background: '#f1f5f9', color: '#475569' };
}

function getMonitorDot(status: MonitorStatus): CSSProperties {
  const background = status === 'UP' ? '#22c55e' : status === 'DOWN' ? '#ef4444' : '#94a3b8';
  return { ...styles.monitorDot, background };
}

function getKpiDot(tone: 'success' | 'danger' | 'neutral'): CSSProperties {
  const background = tone === 'success' ? '#22c55e' : tone === 'danger' ? '#ef4444' : '#2563eb';
  return { ...styles.kpiDot, background };
}

function getSeverityLabel(severity: PublicIncident['severity']) {
  if (severity === 'CRITICAL') return 'Crítica';
  if (severity === 'HIGH') return 'Alta';
  if (severity === 'MEDIUM') return 'Media';
  return 'Baja';
}

function getSeverityBadge(severity: PublicIncident['severity']): CSSProperties {
  if (severity === 'CRITICAL') return { ...styles.severityBadge, background: '#7f1d1d', color: '#fff' };
  if (severity === 'HIGH') return { ...styles.severityBadge, background: '#fee2e2', color: '#991b1b' };
  if (severity === 'MEDIUM') return { ...styles.severityBadge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.severityBadge, background: '#e0f2fe', color: '#075985' };
}

function getIncidentStatusLabel(status: PublicIncident['status']) {
  if (status === 'ACKNOWLEDGED') return 'Reconocida';
  if (status === 'RESOLVED') return 'Resuelta';
  return 'Abierta';
}

function buildHistorySlots(history: PublicStatusResponse['monitors'][number]['history']) {
  const byDate = new Map(history.map((item) => [item.date, item]));
  const today = new Date();

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    return byDate.get(key) ?? { date: key, uptimePercentage: null, checks: 0 };
  });
}

function getHistorySlot(uptime: number | null): CSSProperties {
  const background = uptime === null ? '#e2e8f0' : uptime >= 99 ? '#22c55e' : uptime >= 95 ? '#f59e0b' : '#ef4444';
  return { ...styles.historySlot, background };
}

function formatPercentage(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';
  return `${value.toFixed(value >= 99.995 ? 3 : 2)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const cardBase: CSSProperties = {
  background: uiTheme.colors.surface,
  border: `1px solid ${uiTheme.colors.border}`,
  boxShadow: uiTheme.shadows.card,
  backdropFilter: 'blur(16px)',
};

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: '100vh',
    padding: '34px 22px 48px',
    background: `linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 34%), ${uiTheme.colors.background}`,
    color: uiTheme.colors.text,
  },
  hero: {
    ...cardBase,
    maxWidth: 1180,
    margin: '0 auto 18px',
    borderRadius: 30,
    padding: 30,
  },
  heroTopline: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  heroContent: { display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'end', marginTop: 26 },
  eyebrow: { margin: '0 0 8px', color: '#2563eb', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0 },
  title: { margin: 0, fontSize: 'clamp(34px, 5vw, 58px)', lineHeight: 1, letterSpacing: 0 },
  subtitle: { margin: '14px 0 0', color: uiTheme.colors.muted, maxWidth: 620, fontSize: 16, lineHeight: 1.65 },
  generated: { color: uiTheme.colors.muted, fontSize: 13, fontWeight: 700 },
  badge: { display: 'inline-flex', borderRadius: 999, padding: '9px 13px', fontWeight: 900, fontSize: 13 },
  scoreCard: { borderRadius: 24, padding: 20, background: 'linear-gradient(135deg, #0f172a, #1d4ed8)', color: '#fff', minHeight: 150, display: 'grid', alignContent: 'center' },
  scoreLabel: { opacity: 0.75, fontSize: 13, fontWeight: 800 },
  score: { fontSize: 44, lineHeight: 1, marginTop: 8, letterSpacing: 0 },
  scoreHint: { opacity: 0.7, marginTop: 8, fontSize: 13 },
  kpiGrid: { maxWidth: 1180, margin: '0 auto 18px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 },
  kpiCard: { ...cardBase, borderRadius: 22, padding: 20, minHeight: 112, position: 'relative', overflow: 'hidden' },
  kpiDot: { width: 10, height: 10, borderRadius: 999, display: 'inline-block', boxShadow: '0 0 0 6px rgba(37, 99, 235, 0.08)' },
  kpiLabel: { margin: '16px 0 4px', color: uiTheme.colors.muted, fontSize: 13, fontWeight: 800 },
  kpiValue: { fontSize: 28, letterSpacing: 0 },
  sectionGrid: { maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' },
  panelLarge: { ...cardBase, borderRadius: 26, padding: 22 },
  sideColumn: { display: 'grid', gap: 18 },
  panel: { ...cardBase, borderRadius: 24, padding: 22 },
  panelWide: { ...cardBase, maxWidth: 1180, margin: '18px auto 0', borderRadius: 26, padding: 22 },
  panelHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 },
  panelTitle: { margin: 0, fontSize: 20, letterSpacing: 0 },
  panelSubtitle: { margin: '5px 0 0', color: uiTheme.colors.muted, fontSize: 13 },
  panelPill: { borderRadius: 999, padding: '8px 12px', background: '#eff6ff', color: '#2563eb', fontWeight: 900, fontSize: 12 },
  monitorList: { display: 'grid', gap: 12 },
  monitorRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: 16, borderRadius: 18, background: uiTheme.colors.surface, border: `1px solid ${uiTheme.colors.border}` },
  monitorMain: { display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 },
  monitorDot: { width: 11, height: 11, borderRadius: 999, marginTop: 5, flex: '0 0 auto' },
  target: { margin: '4px 0 0', color: uiTheme.colors.muted, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 520 },
  monitorMetrics: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  statusBadge: { borderRadius: 999, padding: '7px 10px', fontWeight: 900, fontSize: 12 },
  metric: { fontWeight: 900, fontSize: 14 },
  metricMuted: { color: uiTheme.colors.muted, fontWeight: 800, fontSize: 13 },
  historyBar: { gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 3 },
  historySlot: { height: 22, borderRadius: 6, display: 'block' },
  slaStack: { display: 'grid', gap: 12 },
  metricLine: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '12px 0', borderBottom: `1px solid ${uiTheme.colors.border}`, color: uiTheme.colors.muted },
  incidentStack: { display: 'grid', gap: 10 },
  incidentCard: { display: 'grid', gap: 12, borderRadius: 18, padding: 14, background: uiTheme.colors.surface, border: `1px solid ${uiTheme.colors.border}` },
  incidentCompact: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderRadius: 18, padding: 14, background: uiTheme.colors.surface, border: `1px solid ${uiTheme.colors.border}` },
  incidentMeta: { margin: '5px 0 0', color: uiTheme.colors.muted, fontSize: 12 },
  incidentBadges: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  severityBadge: { display: 'inline-flex', borderRadius: 999, padding: '6px 9px', fontWeight: 900, fontSize: 11 },
  stateBadge: { display: 'inline-flex', borderRadius: 999, padding: '6px 9px', fontWeight: 900, fontSize: 11, background: uiTheme.colors.surfaceSoft, color: uiTheme.colors.muted },
  timeline: { display: 'grid', gap: 10 },
  empty: { margin: 0, color: uiTheme.colors.muted, background: uiTheme.colors.surfaceSoft, borderRadius: 16, padding: 14 },
  loadingCard: { ...cardBase, maxWidth: 720, margin: '90px auto', borderRadius: 24, padding: 30, color: uiTheme.colors.muted },
  error: { maxWidth: 720, margin: '90px auto', color: '#991b1b', background: '#fee2e2', padding: 18, borderRadius: 18 },
};
