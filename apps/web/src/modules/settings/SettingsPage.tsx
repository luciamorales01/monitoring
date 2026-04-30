import { type CSSProperties } from 'react';
import {
  pageMain,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from '../../theme/commonStyles';
import AppTopbar from '../../shared/AppTopbar';
import {
  BellIcon,
  ChevronRightIcon,
  CloudIcon,
  CodeIcon,
  DatabaseIcon,
  HardDriveIcon,
  MailIcon,
  MonitorIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
  WrenchIcon,
} from '../../shared/uiIcons';

const generalSettings = [
  { id: 'app', icon: <SettingsIcon size={22} />, title: 'Ajustes de la aplicación', text: 'Personaliza el comportamiento y la apariencia de la aplicación.', tone: 'blue' as const },
  { id: 'notifications', icon: <BellIcon size={22} />, title: 'Notificaciones', text: 'Configura los canales, reglas y preferencias de notificación.', tone: 'blue' as const },
  { id: 'thresholds', icon: <MonitorIcon size={22} />, title: 'Umbrales y reglas', text: 'Define los umbrales de monitoreo y las reglas de alerta.', tone: 'purple' as const },
  { id: 'roles', icon: <UsersIcon size={22} />, title: 'Roles y permisos', text: 'Gestiona los roles de usuario y permisos del sistema.', tone: 'orange' as const },
  { id: 'integrations', icon: <CloudIcon size={22} />, title: 'Integraciones', text: 'Conecta servicios y herramientas externas con Monitoring TFG.', tone: 'purple' as const },
  { id: 'templates', icon: <MailIcon size={22} />, title: 'Plantillas', text: 'Crea y gestiona plantillas de informes, alertas y notificaciones.', tone: 'orange' as const },
  { id: 'data-sources', icon: <DatabaseIcon size={22} />, title: 'Fuentes de datos', text: 'Administra las fuentes y conexiones de datos.', tone: 'blue' as const },
  { id: 'api-webhooks', icon: <CodeIcon size={22} />, title: 'API y webhooks', text: 'Gestiona claves API y endpoints webhook.', tone: 'blue' as const },
];

const systemSettings = [
  { id: 'security', icon: <ShieldIcon size={18} />, title: 'Seguridad', text: 'Configura autenticación, políticas de contraseñas, sesiones y autenticación en dos pasos.' },
  { id: 'backups', icon: <CloudIcon size={18} />, title: 'Copias de seguridad', text: 'Gestiona copias de seguridad automáticas, retención y restauración de datos.' },
  { id: 'maintenance', icon: <WrenchIcon size={18} />, title: 'Mantenimiento', text: 'Programa ventanas de mantenimiento y gestiona el modo mantenimiento.' },
  { id: 'storage', icon: <HardDriveIcon size={18} />, title: 'Almacenamiento', text: 'Consulta el uso de almacenamiento y gestiona la limpieza de datos antiguos.' },
  { id: 'audit', icon: <DatabaseIcon size={18} />, title: 'Auditoría', text: 'Revisa la actividad del sistema y los cambios realizados en la plataforma.' },
];

const quickAccessItems = [
  'Ajustes de notificaciones',
  'Gestionar usuarios',
  'Ver integraciones',
  'Configuración de alertas',
  'Importar / Exportar configuración',
];

const recentActivity = [
  ['Ana Sánchez', 'Actualizó las reglas de alerta', 'Hoy, 10:24'],
  ['José Martínez', 'Añadió integración con Slack', 'Hoy, 09:15'],
  ['Laura Méndez', 'Cambió umbrales de disponibilidad', 'Ayer, 16:42'],
];

export default function SettingsPage() {
  const handlePlaceholderAction = (actionId: string) => {
    console.log(`settings-action:${actionId}`);
  };

  return (
    <main style={styles.main}>
      <AppTopbar
        title="Configuracion"
        subtitle="Personaliza la aplicacion, gestiona preferencias y configura el sistema."
        onRefresh={() => handlePlaceholderAction('refresh')}
      />

      <section style={styles.layout}>
        <div style={styles.left}>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Ajustes generales</h2>

            <div style={styles.settingsGrid}>
              {generalSettings.map((setting) => (
                <SettingTile
                  key={setting.id}
                  icon={setting.icon}
                  title={setting.title}
                  text={setting.text}
                  tone={setting.tone}
                  onClick={() => handlePlaceholderAction(`general:${setting.id}`)}
                />
              ))}
            </div>
          </section>

          <section style={styles.systemCard}>
            <h2 style={styles.sectionTitle}>Configuración del sistema</h2>

            {systemSettings.map((setting) => (
              <SettingRow
                key={setting.id}
                icon={setting.icon}
                title={setting.title}
                text={setting.text}
                onClick={() => handlePlaceholderAction(`system:${setting.id}`)}
              />
            ))}
          </section>
        </div>

        <aside style={styles.side}>
          <SideCard title="Información del sistema">
            <InfoRow label="Versión de la aplicación" value="1.2.3" />
            <InfoRow label="Entorno" value="Producción" />
            <InfoRow label="Región" value="Europe (Madrid)" />
            <InfoRow label="Base de datos" value="PostgreSQL 15" />
            <InfoRow label="Backups" value="Activos" />
            <InfoRow label="Mantenimiento" value="Programado" />
            <button type="button" style={styles.fullButton} onClick={() => handlePlaceholderAction('system-logs')}>
              Ver logs del sistema
            </button>
          </SideCard>

          <SideCard title="Accesos rápidos">
            {quickAccessItems.map((item) => (
              <button
                key={item}
                type="button"
                style={styles.quickRowButton}
                onClick={() => handlePlaceholderAction(`quick:${item}`)}
              >
                <span>{item}</span>
                <strong style={styles.quickArrow}><ChevronRightIcon size={14} /></strong>
              </button>
            ))}
          </SideCard>

          <SideCard title="Actividad reciente en configuración">
            {recentActivity.map(([name, action, time], index) => (
              <div key={name} style={styles.activityRow}>
                <span style={{ ...styles.activityIcon, background: activityColors[index] }}><UsersIcon size={14} /></span>
                <div>
                  <strong>{name}</strong>
                  <p>{action}</p>
                </div>
                <span>{time}</span>
              </div>
            ))}

            <button type="button" style={styles.linkButton} onClick={() => handlePlaceholderAction('settings-activity')}>
              Ver toda la actividad
            </button>
          </SideCard>
        </aside>
      </section>
    </main>
  );
}

function SettingTile({
  icon,
  title,
  text,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: 'green' | 'blue' | 'purple' | 'orange';
  onClick: () => void;
}) {
  const colors = {
    green: uiTheme.colors.success,
    blue: uiTheme.colors.primary,
    purple: uiTheme.colors.primary,
    orange: uiTheme.colors.warning,
  };

  return (
    <article style={styles.tile}>
      <div style={{ ...styles.tileIcon, background: `${colors[tone]}16`, color: colors[tone] }}>
        {icon}
      </div>
      <h3 style={styles.tileTitle}>{title}</h3>
      <p style={styles.tileText}>{text}</p>
      <button type="button" style={styles.configureButton} onClick={onClick}>Configurar</button>
    </article>
  );
}

function SettingRow({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button type="button" style={styles.settingRowButton} onClick={onClick}>
      <span style={styles.rowIcon}>{icon}</span>
      <div style={styles.settingRowCopy}>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <span style={styles.chevron}><ChevronRightIcon size={16} /></span>
    </button>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.sideCard}>
      <h2 style={styles.sideTitle}>{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const activityColors = ['#dbeafe', '#eff6ff', '#dbeafe'];

const styles: Record<string, CSSProperties> = {
  main: pageMain,

  layout: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 },
  left: { display: 'grid', gap: 18 },
  side: { display: 'grid', gap: 18, alignContent: 'start' },

  card: { ...surfaceCard, borderRadius: uiTheme.radii.md, padding: 20 },
  systemCard: { ...surfaceCard, borderRadius: uiTheme.radii.md, padding: 20 },
  sectionTitle: { margin: '0 0 18px', fontSize: 16, fontWeight: 800 },

  settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  tile: { border: `1px solid ${uiTheme.colors.border}`, borderRadius: uiTheme.radii.md, padding: 20, minHeight: 180, background: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' },
  tileIcon: { width: 54, height: 54, borderRadius: 14, display: 'grid', placeItems: 'center', marginBottom: 22 },
  tileTitle: { margin: 0, fontSize: 15, fontWeight: 800 },
  tileText: { color: uiTheme.colors.muted, fontSize: 12, lineHeight: 1.55, minHeight: 48 },
  configureButton: { border: 0, background: 'transparent', color: uiTheme.colors.primary, padding: 0, fontWeight: 600, cursor: 'pointer', fontSize: 12 },

  settingRowButton: { display: 'grid', gridTemplateColumns: '40px 1fr 20px', gap: 12, alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`, borderTop: 0, borderLeft: 0, borderRight: 0, background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' },
  settingRowCopy: { color: uiTheme.colors.text },
  rowIcon: { width: 34, height: 34, borderRadius: uiTheme.radii.sm, background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary, display: 'grid', placeItems: 'center' },
  chevron: { color: uiTheme.colors.muted, display: 'grid', placeItems: 'center' },
  sideCard: { ...surfaceCard, borderRadius: uiTheme.radii.md, padding: 18 },
  sideTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 800 },

  infoRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '11px 0', fontSize: 12, color: uiTheme.colors.text },
  fullButton: { ...secondaryButtonBase, width: '100%', marginTop: 14, borderRadius: uiTheme.radii.sm, padding: '10px 12px', fontWeight: 500, cursor: 'pointer' },
  quickRowButton: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`, borderTop: 0, borderLeft: 0, borderRight: 0, background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 13 },
  quickArrow: { color: uiTheme.colors.muted, display: 'grid', placeItems: 'center' },
  activityRow: { display: 'grid', gridTemplateColumns: '30px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', fontSize: 11 },
  activityIcon: { width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', color: uiTheme.colors.primary },
  linkButton: { marginTop: 12, border: 0, background: 'transparent', color: uiTheme.colors.primary, fontWeight: 600, cursor: 'pointer' },
};
