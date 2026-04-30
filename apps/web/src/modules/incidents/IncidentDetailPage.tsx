import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { matchesSearchTerm, normalizeSearchTerm } from '../../shared/filterUtils';
import { getIncidents, type Incident } from '../../shared/incidentApi';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    const nextIncidents = await getIncidents();
    setIncidents(nextIncidents);
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const incident = useMemo(
    () => incidents.find((item) => String(item.id) === String(id)),
    [incidents, id],
  );

  if (loading) {
    return (
      <main style={styles.main}>
        <LoadingState variant="page" label="Cargando incidencia" />
      </main>
    );
  }

  if (!incident) {
    return (
      <main style={styles.main}>
        <p style={styles.empty}>No se ha encontrado la incidencia.</p>
      </main>
    );
  }

  const isOpen = incident.status === 'OPEN';
  const code = `INC-${String(incident.id).padStart(4, '0')}`;
  const monitorName = incident.monitor?.name ?? 'Monitor no disponible';
  const monitorTarget = incident.monitor?.target ?? 'Sin URL disponible';
  const searchTerm = normalizeSearchTerm(search);
  const timelineItems = [
    {
      color: '#ef4444',
      text: 'La incidencia se ha creado automáticamente por una alerta crítica.',
      time: formatDate(incident.startedAt),
      title: 'Incidencia creada',
    },
    {
      color: '#f59e0b',
      text: `${monitorName} no responde correctamente.`,
      time: formatDate(incident.startedAt),
      title: 'Primera alerta asociada',
    },
    {
      color: '#2563eb',
      text: `La incidencia se ha marcado como ${isOpen ? 'abierta' : 'resuelta'}.`,
      time: formatDate(incident.resolvedAt ?? incident.startedAt),
      title: `Estado cambiado a ${isOpen ? 'Abierta' : 'Resuelta'}`,
    },
    {
      color: '#2563eb',
      text: 'Se está investigando la causa raíz del problema.',
      time: 'Hace 20 min',
      title: 'Nota añadida',
    },
  ];
  const visibleTimelineItems = timelineItems.filter((item) =>
    matchesSearchTerm(searchTerm, item.title, item.text, item.time),
  );
  const allTags = ['monitor', 'servidor', 'alerta'];
  const visibleTags = allTags.filter((tag) => matchesSearchTerm(searchTerm, tag));

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

      <div style={styles.searchBar}>
        <input
          style={styles.search}
          placeholder="Buscar en la incidencia..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section style={styles.layout}>
        <div style={styles.content}>
          <section style={styles.heroCard}>
            <div style={styles.alertIcon}>△</div>

            <div style={styles.heroContent}>
              <div style={styles.badgeRow}>
                <span style={styles.codeBadge}>{code}</span>
                <span style={isOpen ? styles.statusOpen : styles.statusResolved}>
                  {isOpen ? 'Abierta' : 'Resuelta'}
                </span>
              </div>

              <h1 style={styles.title}>{incident.title}</h1>
              <p style={styles.subtitle}>
                {isOpen
                  ? `${monitorName} no responde correctamente. El sistema ha creado esta incidencia automáticamente.`
                  : `La incidencia asociada a ${monitorName} ha sido resuelta correctamente.`}
              </p>

              <div style={styles.metaRow}>
                <span style={styles.metaPill}>▣ Creada: {formatDate(incident.startedAt)}</span>
                <span style={styles.metaPill}>◷ Actualizada: hace 25 min</span>
              </div>
            </div>
          </section>

          <nav style={styles.tabs}>
            <span style={styles.tabActive}>Resumen</span>
            <span style={styles.tab}>Línea de tiempo</span>
            <span style={styles.tab}>Monitor afectado (1)</span>
            <span style={styles.tab}>Alertas</span>
            <span style={styles.tab}>Notas</span>
          </nav>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Descripción</h2>
            <p style={styles.text}>
              Desde {formatDate(incident.startedAt)} se detecta que el servicio monitorizado no está
              respondiendo como se esperaba. Los usuarios pueden experimentar errores o pérdida de
              disponibilidad en el servicio afectado.
            </p>
            <p style={styles.text}>
              El equipo técnico debe revisar el monitor, comprobar los últimos checks y validar si el
              servicio vuelve a estar operativo.
            </p>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Monitor afectado</h2>

            <div style={styles.monitorBox}>
              <span style={styles.monitorIcon}>◎</span>
              <div>
                <strong>{monitorName}</strong>
                <p style={styles.monitorUrl}>{monitorTarget}</p>
              </div>

              {incident.monitor?.id && (
                <Link to={`/monitors/${incident.monitor.id}`} style={styles.monitorButton}>
                  Ver monitor ↗
                </Link>
              )}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Línea de tiempo</h2>

            <div style={styles.timeline}>
              {visibleTimelineItems.length === 0 ? (
                <p style={styles.empty}>No hay eventos que coincidan con la búsqueda.</p>
              ) : (
                visibleTimelineItems.map((item) => (
                  <TimelineItem
                    key={`${item.title}-${item.time}`}
                    color={item.color}
                    title={item.title}
                    text={item.text}
                    time={item.time}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <aside style={styles.side}>
          <section style={styles.sideCard}>
            <h2 style={styles.sideTitle}>Información</h2>

            <InfoRow label="Estado" value={isOpen ? 'Abierta' : 'Resuelta'} danger={isOpen} />
            <InfoRow label="Severidad" value={isOpen ? 'Crítica' : 'Baja'} danger={isOpen} />
            <InfoRow label="Prioridad" value={isOpen ? 'Alta' : 'Normal'} />
            <InfoRow label="Servicio" value={monitorName} />
            <InfoRow label="Creada por" value="Sistema" />
            <InfoRow label="Asignada a" value="Admin" />
            <InfoRow label="Tiempo abierto" value={incident.durationSeconds ? formatDuration(incident.durationSeconds) : 'En curso'} />
          </section>

          <section style={styles.sideCard}>
            <h2 style={styles.sideTitle}>Acciones</h2>

            <button type="button" style={styles.primaryButton}>Actualizar estado</button>
            <button type="button" style={styles.secondaryButton}>Asignar a un usuario</button>
            <button type="button" style={styles.secondaryButton}>Añadir nota</button>
            <button type="button" style={styles.dangerButton}>Cerrar incidencia</button>
          </section>

          <section style={styles.sideCard}>
            <h2 style={styles.sideTitle}>Etiquetas</h2>

            <div style={styles.tags}>
              {visibleTags.length === 0 ? (
                <span style={styles.empty}>Sin etiquetas visibles.</span>
              ) : (
                visibleTags.map((tag) => (
                  <span key={tag} style={styles.tag}>{tag}</span>
                ))
              )}
            </div>

            <button type="button" style={styles.linkButton}>+ Añadir etiqueta</button>
          </section>
        </aside>
      </section>
    </main>
  );
}

function TimelineItem({
  color,
  title,
  text,
  time,
}: {
  color: string;
  title: string;
  text: string;
  time: string;
}) {
  return (
    <div style={styles.timelineItem}>
      <span style={{ ...styles.timelineDot, background: color }} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <span style={styles.timelineTime}>{time}</span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div style={styles.infoRow}>
      <span>{label}</span>
      <strong style={danger ? styles.dangerText : undefined}>{value}</strong>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

const styles: Record<string, CSSProperties> = {
  main: { flex: 1, padding: '24px 28px', background: '#f8fafc' },
  breadcrumbLink: { color: '#64748b', textDecoration: 'none' },
  searchBar: { display: 'flex', justifyContent: 'flex-end', marginTop: -12, marginBottom: 20 },
  search: { height: 40, border: '1px solid #dbe3ef', borderRadius: 10, padding: '0 14px', fontSize: 13 },

  layout: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 },
  content: { display: 'grid', gap: 14 },
  side: { display: 'grid', gap: 14, alignContent: 'start' },

  heroCard: { display: 'flex', gap: 22, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 28, boxShadow: '0 10px 30px rgba(15,23,42,.04)' },
  alertIcon: { width: 94, height: 94, borderRadius: 16, background: '#fef2f2', color: '#ef4444', display: 'grid', placeItems: 'center', fontSize: 44, fontWeight: 900 },
  heroContent: { flex: 1 },
  badgeRow: { display: 'flex', gap: 10, alignItems: 'center' },
  codeBadge: { padding: '6px 10px', borderRadius: 8, background: '#f1f5f9', color: '#334155', fontWeight: 600, fontSize: 12 },
  statusOpen: { padding: '6px 10px', borderRadius: 8, background: '#fee2e2', color: '#ef4444', fontWeight: 600, fontSize: 12 },
  statusResolved: { padding: '6px 10px', borderRadius: 8, background: '#dcfce7', color: '#059669', fontWeight: 600, fontSize: 12 },
  title: { margin: '14px 0 8px', fontSize: 28, fontWeight: 600, color: '#0f172a' },
  subtitle: { margin: 0, color: '#64748b', fontSize: 15 },
  metaRow: { display: 'flex', gap: 10, marginTop: 20 },
  metaPill: { border: '1px solid #dbe3ef', borderRadius: 8, padding: '9px 12px', background: '#fff', color: '#475569', fontSize: 12 },

  tabs: { display: 'flex', gap: 26, borderBottom: '1px solid #dbe3ef', marginTop: 6 },
  tab: { padding: '12px 0', color: '#64748b', fontWeight: 500, fontSize: 13 },
  tabActive: { padding: '12px 0', color: '#2563eb', fontWeight: 600, fontSize: 13, borderBottom: '2px solid #2563eb' },

  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,.035)' },
  cardTitle: { margin: '0 0 14px', fontSize: 16, fontWeight: 800 },
  text: { margin: '0 0 8px', color: '#64748b', lineHeight: 1.6 },

  monitorBox: { display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 14, alignItems: 'center' },
  monitorIcon: { width: 44, height: 44, borderRadius: 10, background: '#dcfce7', color: '#10b981', display: 'grid', placeItems: 'center', fontSize: 24 },
  monitorUrl: { margin: '4px 0 0', color: '#64748b', fontSize: 13 },
  monitorButton: { border: '1px solid #dbe3ef', borderRadius: 8, padding: '10px 14px', textDecoration: 'none', color: '#2563eb', fontWeight: 800 },

  timeline: { display: 'grid', gap: 18 },
  timelineItem: { display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 12, alignItems: 'start', color: '#334155' },
  timelineDot: { width: 10, height: 10, borderRadius: 999, marginTop: 5 },
  timelineTime: { color: '#64748b', fontSize: 12 },
  sideCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, boxShadow: '0 8px 24px rgba(15,23,42,.035)' },
  sideTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 800 },
  infoRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 0', color: '#64748b', fontSize: 13 },
  dangerText: { color: '#ef4444' },
  primaryButton: { width: '100%', height: 42, border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 600, marginBottom: 10 },
  secondaryButton: { width: '100%', height: 42, border: '1px solid #dbe3ef', borderRadius: 8, background: '#fff', color: '#2563eb', fontWeight: 600, marginBottom: 10 },
  dangerButton: { width: '100%', height: 42, border: '1px solid #fecaca', borderRadius: 8, background: '#fff', color: '#ef4444', fontWeight: 800 },
  tags: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tag: { padding: '7px 10px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700 },
  linkButton: { marginTop: 14, border: 0, background: 'transparent', color: '#2563eb', fontWeight: 800 },
  empty: { color: '#64748b' },
};
