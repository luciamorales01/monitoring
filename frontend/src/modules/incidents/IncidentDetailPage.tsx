import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  acknowledgeIncident,
  getIncident,
  resolveIncident,
  updateIncidentSeverity,
  type Incident,
  type IncidentSeverity,
} from '../../shared/incidentApi';
import { realtimeEventName, type MonitoringRealtimeEvent } from '../../shared/realtimeEvents';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';
import { useCurrentUserPermissions } from '../../shared/permissions';
import { uiTheme } from '../../theme/commonStyles';

const severities: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function IncidentDetailPage() {
  const { id } = useParams();
  const incidentId = Number(id);
  const { canWrite: canWriteActions } = useCurrentUserPermissions();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [rootCause, setRootCause] = useState('');

  const loadData = async () => {
    if (!Number.isFinite(incidentId)) return;
    const nextIncident = await getIncident(incidentId);
    setIncident(nextIncident);
    setResolutionNote(nextIncident.resolutionNote ?? '');
    setRootCause(nextIncident.rootCause ?? '');
  };

  useEffect(() => {
    loadData()
      .catch(() => setError('No se pudo cargar la incidencia.'))
      .finally(() => setLoading(false));
  }, [incidentId]);

  useEffect(() => {
    const refreshIncident = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as MonitoringRealtimeEvent;
      if (detail.payload.incidentId !== incidentId) return;
      void loadData().catch(() => setError('No se pudo cargar la incidencia.'));
    };

    window.addEventListener(realtimeEventName, refreshIncident);
    return () => window.removeEventListener(realtimeEventName, refreshIncident);
  }, [incidentId]);

  const runAction = async (action: () => Promise<Incident>) => {
    try {
      setSaving(true);
      setError(null);
      const nextIncident = await action();
      setIncident(nextIncident);
    } catch {
      setError('No se pudo actualizar la incidencia.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState variant="page" label="Cargando incidencia" />;
  }

  if (!incident) {
    return <main style={styles.main}><p style={styles.empty}>{error ?? 'Incidencia no encontrada.'}</p></main>;
  }

  const isResolved = incident.status === 'RESOLVED';
  const code = `INC-${String(incident.id).padStart(4, '0')}`;
  const monitorName = incident.monitor?.name ?? 'Monitor';
  const monitorTarget = incident.monitor?.target ?? '-';

  return (
    <main style={styles.main}>
      <AppTopbar
        title={code}
        subtitle={incident.title}
        onRefresh={loadData}
        eyebrow={(
          <>
            <Link to="/incidents" style={styles.breadcrumbLink}>Incidencias</Link>
            <span>&gt;</span>
            <strong>{code}</strong>
          </>
        )}
      />

      {error && <p style={styles.error}>{error}</p>}

      <section style={styles.layout}>
        <div style={styles.content}>
          <section style={styles.heroCard}>
            <div>
              <div style={styles.badgeRow}>
                <span style={styles.codeBadge}>{code}</span>
                <span style={getStatusStyle(incident.status)}>{getStatusLabel(incident.status)}</span>
                <span style={getSeverityStyle(incident.severity ?? 'HIGH')}>{getSeverityLabel(incident.severity ?? 'HIGH')}</span>
              </div>
              <h1 style={styles.title}>{incident.title}</h1>
              <p style={styles.subtitle}>
                Incidencia asociada a <strong>{monitorName}</strong>. {canWriteActions ? 'Desde aquí puedes reconocerla, cambiar su severidad y cerrarla con nota técnica.' : 'Puedes revisar su estado, severidad y trazabilidad.'}
              </p>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Monitor afectado</h2>
            <div style={styles.monitorBox}>
              <div>
                <strong>{monitorName}</strong>
                <p style={styles.monitorUrl}>{monitorTarget}</p>
              </div>
              {incident.monitor?.id && <Link to={`/monitors/${incident.monitor.id}`} style={styles.monitorButton}>Ver monitor</Link>}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Diagnóstico y resolución</h2>
            {canWriteActions ? (
              <>
                <label style={styles.label}>
                  Causa raíz
                  <textarea style={styles.textarea} value={rootCause} onChange={(event) => setRootCause(event.target.value)} placeholder="Ej: caída del servidor, timeout externo..." />
                </label>
                <label style={styles.label}>
                  Nota de resolución
                  <textarea style={styles.textarea} value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Qué se hizo para resolver la incidencia" />
                </label>
              </>
            ) : (
              <>
                <InfoRow label="Causa raíz" value={rootCause || '-'} />
                <InfoRow label="Nota de resolución" value={resolutionNote || '-'} />
              </>
            )}
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Línea de tiempo</h2>
            <TimelineItem title="Incidencia creada" value={formatDate(incident.startedAt)} />
            {incident.acknowledgedAt && <TimelineItem title="Incidencia reconocida" value={formatDate(incident.acknowledgedAt)} />}
            {incident.resolvedAt && <TimelineItem title="Incidencia resuelta" value={formatDate(incident.resolvedAt)} />}
            {incident.lastStatusChangeAt && <TimelineItem title="Último cambio" value={formatDate(incident.lastStatusChangeAt)} />}
          </section>
        </div>

        <aside style={styles.side}>
          <section style={styles.sideCard}>
            <h2 style={styles.sideTitle}>Información</h2>
            <InfoRow label="Estado" value={getStatusLabel(incident.status)} />
            <InfoRow label="Severidad" value={getSeverityLabel(incident.severity ?? 'HIGH')} />
            <InfoRow label="Creada" value={formatDate(incident.startedAt)} />
            <InfoRow label="Duración" value={formatDuration(incident.durationSeconds, incident.startedAt, incident.resolvedAt)} />
          </section>

          {canWriteActions ? (
            <>
              <section style={styles.sideCard}>
                <h2 style={styles.sideTitle}>Acciones</h2>
                <button type="button" style={styles.secondaryButton} disabled={saving || isResolved} onClick={() => runAction(() => acknowledgeIncident(incident.id))}>
                  Reconocer incidencia
                </button>
                <button type="button" style={styles.primaryButton} disabled={saving || isResolved} onClick={() => runAction(() => resolveIncident(incident.id, { resolutionNote, rootCause }))}>
                  Resolver incidencia
                </button>
              </section>

              <section style={styles.sideCard}>
                <h2 style={styles.sideTitle}>Severidad</h2>
                <div style={styles.severityGrid}>
                  {severities.map((severity) => (
                    <button
                      key={severity}
                      type="button"
                      style={{ ...styles.severityButton, ...(incident.severity === severity ? styles.severityActive : {}) }}
                      disabled={saving}
                      onClick={() => runAction(() => updateIncidentSeverity(incident.id, severity))}
                    >
                      {getSeverityLabel(severity)}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function TimelineItem({ title, value }: { title: string; value: string }) {
  return <div style={styles.timelineItem}><span style={styles.timelineDot} /><strong>{title}</strong><span>{value}</span></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div style={styles.infoRow}><span>{label}</span><strong>{value}</strong></div>;
}

function getStatusLabel(status: Incident['status']) {
  return status === 'RESOLVED' ? 'Resuelta' : status === 'ACKNOWLEDGED' ? 'Reconocida' : 'Abierta';
}

function getSeverityLabel(severity: IncidentSeverity) {
  const labels: Record<IncidentSeverity, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica' };
  return labels[severity];
}

function getStatusStyle(status: Incident['status']): CSSProperties {
  const base = styles.badge;
  if (status === 'RESOLVED') return { ...base, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary };
  if (status === 'ACKNOWLEDGED') return { ...base, background: uiTheme.colors.warningSoft, color: '#d97706' };
  return { ...base, background: uiTheme.colors.dangerSoft, color: '#dc2626' };
}

function getSeverityStyle(severity: IncidentSeverity): CSSProperties {
  const base = styles.badge;
  if (severity === 'CRITICAL') return { ...base, background: '#fee2e2', color: '#b91c1c' };
  if (severity === 'HIGH') return { ...base, background: '#ffedd5', color: '#c2410c' };
  if (severity === 'MEDIUM') return { ...base, background: uiTheme.colors.warningSoft, color: '#d97706' };
  return { ...base, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary };
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(durationSeconds?: number | null, startedAt?: string, resolvedAt?: string | null) {
  let seconds = durationSeconds ?? 0;
  if (!seconds && startedAt) {
    const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
    seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const styles: Record<string, CSSProperties> = {
  main: { padding: 24, background: uiTheme.colors.background, minHeight: '100%' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 },
  content: { display: 'grid', gap: 16 },
  heroCard: { background: uiTheme.colors.surface, border: `1px solid ${uiTheme.colors.border}`, borderRadius: 22, padding: 24, boxShadow: uiTheme.shadows.card },
  badgeRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  codeBadge: { padding: '7px 11px', borderRadius: 999, background: uiTheme.colors.surfaceSoft, color: uiTheme.colors.text, fontSize: 12, fontWeight: 800 },
  badge: { padding: '7px 11px', borderRadius: 999, fontSize: 12, fontWeight: 800 },
  title: { margin: 0, fontSize: 28, color: uiTheme.colors.text },
  subtitle: { margin: '10px 0 0', color: uiTheme.colors.muted, lineHeight: 1.6 },
  card: { background: uiTheme.colors.surface, border: `1px solid ${uiTheme.colors.border}`, borderRadius: 18, padding: 20, boxShadow: uiTheme.shadows.card },
  cardTitle: { margin: '0 0 14px', fontSize: 17, color: uiTheme.colors.text },
  monitorBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: uiTheme.colors.surfaceSoft },
  monitorUrl: { margin: '4px 0 0', color: uiTheme.colors.muted, fontSize: 13 },
  monitorButton: { color: uiTheme.colors.primary, textDecoration: 'none', fontWeight: 800 },
  label: { display: 'grid', gap: 8, fontSize: 13, fontWeight: 800, color: uiTheme.colors.text, marginBottom: 12 },
  textarea: { minHeight: 92, resize: 'vertical', border: `1px solid ${uiTheme.colors.border}`, borderRadius: 14, padding: 12, font: 'inherit', color: uiTheme.colors.text },
  timelineItem: { display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 10, alignItems: 'center', padding: '12px 0', borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`, color: uiTheme.colors.text, fontSize: 13 },
  timelineDot: { width: 9, height: 9, borderRadius: 999, background: uiTheme.colors.primary },
  side: { display: 'grid', gap: 16, alignSelf: 'start' },
  sideCard: { background: uiTheme.colors.surface, border: `1px solid ${uiTheme.colors.border}`, borderRadius: 18, padding: 18, boxShadow: uiTheme.shadows.card },
  sideTitle: { margin: '0 0 14px', fontSize: 16 },
  infoRow: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`, fontSize: 13 },
  primaryButton: { width: '100%', border: 0, borderRadius: 12, padding: '12px 14px', background: uiTheme.colors.primary, color: '#fff', fontWeight: 800, cursor: 'pointer', marginTop: 8 },
  secondaryButton: { width: '100%', border: `1px solid ${uiTheme.colors.border}`, borderRadius: 12, padding: '12px 14px', background: uiTheme.colors.surface, color: uiTheme.colors.text, fontWeight: 800, cursor: 'pointer', marginTop: 8 },
  severityGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  severityButton: { border: `1px solid ${uiTheme.colors.border}`, borderRadius: 12, background: uiTheme.colors.surface, color: uiTheme.colors.text, padding: 10, cursor: 'pointer', fontWeight: 800 },
  severityActive: { borderColor: uiTheme.colors.primary, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary },
  breadcrumbLink: { color: uiTheme.colors.primary, textDecoration: 'none' },
  empty: { color: uiTheme.colors.muted },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12, fontWeight: 700 },
};
