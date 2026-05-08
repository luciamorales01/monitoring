import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changePassword, getMe, logout } from '../auth/authApi';
import AppTopbar from '../../shared/AppTopbar';
import LoadingState from '../../shared/LoadingState';
import { tokenStorage } from '../../shared/tokenStorage';
import {
  badgeBase,
  inputBase,
  pageMain,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from '../../theme/commonStyles';
import {
  ActivityIcon,
  BellIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  CodeIcon,
  DownloadIcon,
  GlobeIcon,
  LockIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from '../../shared/uiIcons';

type ProfileTab = 'personal' | 'security' | 'notifications' | 'activity' | 'preferences' | 'api-keys';

type ProfileData = {
  name: string;
  role: string;
  roleDescription: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  memberSince: string;
  lastAccess: string;
  location: string;
  planName: string;
  renewalDate: string;
  monitorsUsed: number;
  monitorsLimit: number;
};

type ProfileFormState = Pick<ProfileData, 'name' | 'email' | 'phone' | 'timezone' | 'language'>;

const tabs: Array<{ key: ProfileTab; label: string; icon: ReactNode }> = [
  { key: 'personal', label: 'Información personal', icon: <UsersIcon size={16} /> },
  { key: 'security', label: 'Seguridad', icon: <ShieldIcon size={16} /> },
  { key: 'notifications', label: 'Notificaciones', icon: <BellIcon size={16} /> },
  { key: 'activity', label: 'Actividad', icon: <ActivityIcon size={16} /> },
  { key: 'preferences', label: 'Preferencias', icon: <SettingsIcon size={16} /> },
  { key: 'api-keys', label: 'API Keys', icon: <CodeIcon size={16} /> },
];

const profileMock: ProfileData = {
  name: 'Juan Pérez',
  role: 'Administrador',
  roleDescription: 'Acceso completo a la plataforma',
  email: 'juan.perez@ejemplo.com',
  phone: '+34 612 345 678',
  timezone: '(GMT+02:00) Madrid, España',
  language: 'Español',
  memberSince: 'Mayo 2024',
  lastAccess: '05 may 2026, 14:07',
  location: 'Madrid, España',
  planName: 'Plan Profesional',
  renewalDate: '10 jun 2026',
  monitorsUsed: 18,
  monitorsLimit: 50,
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [profile, setProfile] = useState<ProfileData>(profileMock);
  const [form, setForm] = useState<ProfileFormState>(pickForm(profileMock));
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'api' | 'mock'>('mock');
  const [statusMessage, setStatusMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getMe();
      const nextProfile = {
        ...profileMock,
        name: currentUser.name,
        email: currentUser.email,
        role: getRoleLabel(currentUser.role),
        roleDescription: getRoleDescription(currentUser.role),
      };

      setProfile(nextProfile);
      setForm(pickForm(nextProfile));
      setDataSource('api');
      setStatusMessage('');
    } catch {
      setProfile(profileMock);
      setForm(pickForm(profileMock));
      setDataSource('mock');
      setStatusMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const usagePercent = useMemo(() => {
    return Math.min(
      100,
      Math.round((profile.monitorsUsed / Math.max(profile.monitorsLimit, 1)) * 100),
    );
  }, [profile.monitorsLimit, profile.monitorsUsed]);

  const filteredQuickActions = useMemo(() => {
    const actions = [
      { id: 'password', icon: <LockIcon size={16} />, label: 'Cambiar contraseña', tone: 'default' as const },
      { id: '2fa', icon: <ShieldIcon size={16} />, label: 'Configurar 2FA', tone: 'default' as const },
      { id: 'data', icon: <DownloadIcon size={16} />, label: 'Descargar mis datos', tone: 'default' as const },
      { id: 'logout', icon: <LogOutIcon size={16} />, label: 'Cerrar sesión', tone: 'danger' as const },
      { id: 'logout-all', icon: <LogOutIcon size={16} />, label: 'Cerrar sesión en todos los dispositivos', tone: 'danger' as const },
    ];

    const normalizedSearch = searchValue.trim().toLowerCase();
    if (!normalizedSearch) return actions;

    return actions.filter((action) =>
      action.label.toLowerCase().includes(normalizedSearch),
    );
  }, [searchValue]);

  const handleFormChange =
    (field: keyof ProfileFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextProfile = { ...profile, ...form };
    setProfile(nextProfile);
    setStatusMessage(
      dataSource === 'api'
        ? 'Cambios guardados localmente. Falta conectar la actualización al endpoint de perfil.'
        : 'Cambios guardados en modo mock. La vista queda lista para conectar el usuario autenticado.',
    );
  };

  const handleQuickAction = async (actionId: string) => {
    if (actionId === 'logout') {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          await logout(refreshToken);
        } catch {
          // Cerrar sesión local aunque el token ya estuviera caducado.
        }
      }
      tokenStorage.clear();
      navigate('/login', { replace: true });
      return;
    }

    if (actionId === 'password') {
      setActiveTab('security');
      return;
    }

    console.log(`profile-action:${actionId}`);
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');

    if (passwordForm.newPassword.length < 6) {
      setStatusMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatusMessage('Las contraseñas no coinciden.');
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      tokenStorage.clear();
      setStatusMessage('Contraseña actualizada. Vuelve a iniciar sesión.');
      window.setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    }
  };

  return (
    <main style={styles.main}>
      <AppTopbar
        title="Mi perfil"
        breadcrumb={
          <>
            <Link to="/settings" style={styles.breadcrumbLink}>
              Ajustes
            </Link>
            <ChevronRightIcon size={14} />
            <span style={styles.breadcrumbCurrent}>Mi perfil</span>
          </>
        }
        onRefresh={loadProfile}
        showRefreshButton={false}
        showSearch
        searchPlaceholder="Buscar acciones o ajustes"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        userSummary={{
          initials: getInitials(profile.name),
          name: profile.name,
          role: profile.role,
        }}
      />

      {isLoading ? (
        <section style={styles.loadingCard}>
          <LoadingState variant="table" label="Cargando perfil" rows={4} />
        </section>
      ) : (
        <>
          <section style={styles.heroCard}>
            <div style={styles.heroLeft}>
              <div style={styles.avatarWrap}>
                <div style={styles.avatar}>{getInitials(profile.name)}</div>
                <button type="button" style={styles.avatarEditButton}>
                  <SettingsIcon size={14} />
                </button>
              </div>

              <div style={styles.identityBlock}>
                <div style={styles.identityHeader}>
                  <h2 style={styles.profileName}>{profile.name}</h2>
                  <span style={styles.roleBadge}>{profile.role}</span>
                </div>

                <div style={styles.identityMeta}>
                  <MetaRow icon={<MailIcon size={15} />} label={profile.email} />
                  <MetaRow icon={<CalendarIcon size={15} />} label={`Miembro desde ${profile.memberSince}`} />
                </div>
              </div>
            </div>

            <div style={styles.heroRight}>
              <SummaryCard
                icon={<ShieldIcon size={18} />}
                title="Rol"
                value={profile.role}
                note={profile.roleDescription}
                tone="success"
              />
              <SummaryCard
                icon={<ClockIcon size={18} />}
                title="Último acceso"
                value={profile.lastAccess}
                note={`Desde ${profile.location}`}
                tone="primary"
              />
            </div>
          </section>

          <nav style={styles.tabsBar} aria-label="Secciones de perfil">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                style={{
                  ...styles.tabButton,
                  ...(activeTab === tab.key ? styles.tabButtonActive : {}),
                }}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <section style={styles.contentWrap}>
            <div style={styles.contentMain}>
              {activeTab === 'personal' ? (
                <section style={styles.formCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>Información personal</h3>
                      <p style={styles.cardSubtitle}>
                        Actualiza tu información personal y de contacto.
                      </p>
                    </div>

                    <span style={styles.statusPill}>
                      {dataSource === 'api' ? 'Conectado con auth' : 'Usando datos mock'}
                    </span>
                  </div>

                  <form onSubmit={handleSave} style={styles.profileForm}>
                    <Field label="Nombre completo">
                      <input
                        value={form.name}
                        onChange={handleFormChange('name')}
                        style={styles.input}
                        placeholder="Nombre y apellidos"
                      />
                    </Field>

                    <Field label="Correo electrónico">
                      <input
                        value={form.email}
                        onChange={handleFormChange('email')}
                        style={styles.input}
                        placeholder="correo@ejemplo.com"
                        type="email"
                      />
                    </Field>

                    <Field label="Teléfono">
                      <input
                        value={form.phone}
                        onChange={handleFormChange('phone')}
                        style={styles.input}
                        placeholder="+34 600 000 000"
                      />
                    </Field>

                    <Field label="Zona horaria">
                      <select value={form.timezone} onChange={handleFormChange('timezone')} style={styles.input}>
                        <option>(GMT+02:00) Madrid, España</option>
                        <option>(GMT+01:00) Lisboa, Portugal</option>
                        <option>(GMT+00:00) Londres, Reino Unido</option>
                      </select>
                    </Field>

                    <Field label="Idioma" wide>
                      <select value={form.language} onChange={handleFormChange('language')} style={styles.input}>
                        <option>Español</option>
                        <option>English</option>
                        <option>Português</option>
                      </select>
                    </Field>

                    <div style={styles.formFooter}>
                      {statusMessage ? <span style={styles.successMessage}>{statusMessage}</span> : <span />}
                      <button type="submit" style={styles.primaryButton}>
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </section>
              ) : activeTab === 'security' ? (
                <section style={styles.formCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>Seguridad de la cuenta</h3>
                      <p style={styles.cardSubtitle}>Cambia tu contraseña y cierra sesiones anteriores.</p>
                    </div>
                    <span style={styles.statusPill}>Sesión protegida</span>
                  </div>

                  <form onSubmit={handlePasswordSubmit} style={styles.profileForm}>
                    <Field label="Contraseña actual">
                      <input
                        value={passwordForm.currentPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                        style={styles.input}
                        type="password"
                        autoComplete="current-password"
                      />
                    </Field>

                    <Field label="Nueva contraseña">
                      <input
                        value={passwordForm.newPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                        style={styles.input}
                        type="password"
                        autoComplete="new-password"
                      />
                    </Field>

                    <Field label="Confirmar nueva contraseña" wide>
                      <input
                        value={passwordForm.confirmPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        style={styles.input}
                        type="password"
                        autoComplete="new-password"
                      />
                    </Field>

                    <div style={styles.formFooter}>
                      {statusMessage ? <span style={styles.successMessage}>{statusMessage}</span> : <span />}
                      <button type="submit" style={styles.primaryButton}>
                        Cambiar contraseña
                      </button>
                    </div>
                  </form>
                </section>
              ) : (
                <PlaceholderPanel activeTab={activeTab} />
              )}
            </div>

            <aside style={styles.sidePanel}>
              <section style={styles.sideCard}>
                <div style={styles.planHeader}>
                  <div>
                    <h3 style={styles.sideTitle}>Plan actual</h3>
                    <strong style={styles.planName}>{profile.planName}</strong>
                  </div>
                  <span style={styles.planIconBadge}>
                    <ShieldIcon size={16} />
                  </span>
                </div>

                <p style={styles.planMeta}>Renovación: {profile.renewalDate}</p>
                <div style={styles.planUsageRow}>
                  <span>Monitores: {profile.monitorsUsed} / {profile.monitorsLimit}</span>
                  <strong>{usagePercent}%</strong>
                </div>
                <div style={styles.progressTrack}>
                  <span style={{ ...styles.progressFill, width: `${usagePercent}%` }} />
                </div>

                <button type="button" style={styles.secondaryButton}>
                  Gestionar plan
                </button>
              </section>

              <section style={styles.sideCard}>
                <h3 style={styles.sideTitle}>Resumen</h3>
                <div style={styles.summaryList}>
                  <MetaRow icon={<PhoneIcon size={15} />} label={profile.phone} />
                  <MetaRow icon={<ClockIcon size={15} />} label={profile.timezone} />
                  <MetaRow icon={<GlobeIcon size={15} />} label={profile.language} />
                  <MetaRow icon={<MapPinIcon size={15} />} label={profile.location} />
                </div>
              </section>

              <section style={styles.sideCard}>
                <h3 style={styles.sideTitle}>Acciones rápidas</h3>

                <div style={styles.quickActions}>
                  {filteredQuickActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      style={{
                        ...styles.quickActionButton,
                        ...(action.tone === 'danger' ? styles.quickActionDanger : {}),
                      }}
                      onClick={() => handleQuickAction(action.id)}
                    >
                      <span style={styles.quickActionLabel}>
                        <span
                          style={{
                            ...styles.quickActionIcon,
                            ...(action.tone === 'danger' ? styles.quickActionIconDanger : {}),
                          }}
                        >
                          {action.icon}
                        </span>
                        {action.label}
                      </span>
                      <ChevronRightIcon size={15} />
                    </button>
                  ))}

                  {filteredQuickActions.length === 0 ? (
                    <div style={styles.emptyState}>
                      <SearchIcon size={16} />
                      No hay acciones que coincidan con la búsqueda actual.
                    </div>
                  ) : null}
                </div>
              </section>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}

function PlaceholderPanel({ activeTab }: { activeTab: Exclude<ProfileTab, 'personal'> }) {
  const copy: Record<Exclude<ProfileTab, 'personal'>, { title: string; text: string }> = {
    security: {
      title: 'Seguridad preparada',
      text: 'Esta sección queda lista para conectar cambio de contraseña, políticas de sesión y 2FA.',
    },
    notifications: {
      title: 'Notificaciones preparadas',
      text: 'Aquí podrás conectar preferencias por email, incidencias críticas y resúmenes programados.',
    },
    activity: {
      title: 'Actividad preparada',
      text: 'La vista puede consumir después auditoría, últimos inicios de sesión y acciones del usuario.',
    },
    preferences: {
      title: 'Preferencias preparadas',
      text: 'Este panel queda listo para tema, idioma, formato de fecha y opciones regionales.',
    },
    'api-keys': {
      title: 'API Keys preparadas',
      text: 'La estructura está lista para listar, crear y revocar claves API cuando exista endpoint.',
    },
  };

  const current = copy[activeTab];

  return (
    <section style={styles.placeholderCard}>
      <div style={styles.placeholderIcon}>
        {tabs.find((tab) => tab.key === activeTab)?.icon}
      </div>
      <h3 style={styles.cardTitle}>{current.title}</h3>
      <p style={styles.cardSubtitle}>{current.text}</p>
      <button type="button" style={styles.secondaryButton}>
        Próximamente
      </button>
    </section>
  );
}

function Field({
  children,
  label,
  wide = false,
}: {
  children: ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <label style={{ ...styles.field, ...(wide ? styles.fieldWide : {}) }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetaRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={styles.metaRow}>
      <span style={styles.metaIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  note,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  note: string;
  tone: 'primary' | 'success';
}) {
  const iconStyle =
    tone === 'success'
      ? { background: uiTheme.colors.successSoft, color: uiTheme.colors.success }
      : { background: uiTheme.colors.primarySoft, color: uiTheme.colors.primary };

  return (
    <div style={styles.summaryCard}>
      <span style={{ ...styles.summaryIcon, ...iconStyle }}>{icon}</span>
      <div>
        <p style={styles.summaryTitle}>{title}</p>
        <strong style={styles.summaryValue}>{value}</strong>
        <p style={styles.summaryNote}>{note}</p>
      </div>
    </div>
  );
}

function pickForm(profile: ProfileData): ProfileFormState {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    timezone: profile.timezone,
    language: profile.language,
  };
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getRoleLabel(role: string) {
  const roleMap: Record<string, string> = {
    OWNER: 'Administrador',
    ADMIN: 'Editor',
    VIEWER: 'Solo lectura',
  };

  return roleMap[role] ?? role;
}

function getRoleDescription(role: string) {
  const roleMap: Record<string, string> = {
    OWNER: 'Acceso completo a la plataforma',
    ADMIN: 'Gestión operativa y de contenidos',
    VIEWER: 'Acceso de solo lectura',
  };

  return roleMap[role] ?? 'Permisos personalizados del usuario';
}

const styles: Record<string, CSSProperties> = {
  main: pageMain,
  breadcrumbLink: {
    color: uiTheme.colors.muted,
    textDecoration: 'none',
  },
  breadcrumbCurrent: {
    color: uiTheme.colors.primary,
    fontWeight: 600,
  },
  loadingCard: {
    ...surfaceCard,
    padding: 24,
  },
  heroCard: {
    ...surfaceCard,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 22,
    padding: 28,
    marginBottom: 18,
  },
  heroLeft: {
    flex: '999 1 520px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 24,
  },
  heroRight: {
    flex: '1 1 320px',
    display: 'grid',
    gap: 16,
    alignContent: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: 160,
    height: 160,
    flexShrink: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
    color: uiTheme.colors.primary,
    fontSize: 56,
    fontWeight: 700,
    letterSpacing: '-0.03em',
  },
  avatarEditButton: {
    ...secondaryButtonBase,
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 42,
    height: 42,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    color: uiTheme.colors.primary,
    background: uiTheme.colors.surface,
    boxShadow: uiTheme.shadows.card,
  },
  identityBlock: {
    display: 'grid',
    gap: 18,
    minWidth: 0,
  },
  identityHeader: {
    display: 'grid',
    gap: 10,
  },
  profileName: {
    margin: 0,
    fontSize: 40,
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: '-0.03em',
  },
  roleBadge: {
    ...badgeBase,
    width: 'fit-content',
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
  },
  identityMeta: {
    display: 'grid',
    gap: 12,
    color: uiTheme.colors.muted,
    fontSize: 15,
  },
  metaRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    color: uiTheme.colors.muted,
  },
  metaIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.primary,
    flexShrink: 0,
  },
  summaryCard: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr',
    gap: 14,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
  },
  summaryTitle: {
    margin: '0 0 4px',
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  summaryValue: {
    display: 'block',
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  summaryNote: {
    margin: '5px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  tabsBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    paddingBottom: 12,
  },
  tabButton: {
    border: '0',
    background: 'transparent',
    color: uiTheme.colors.muted,
    minHeight: 44,
    padding: '0 12px',
    borderRadius: uiTheme.radii.sm,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 9,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  tabButtonActive: {
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    boxShadow: `inset 0 -2px 0 ${uiTheme.colors.primary}`,
  },
  contentWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'flex-start',
  },
  contentMain: {
    flex: '999 1 720px',
  },
  sidePanel: {
    flex: '1 1 320px',
    display: 'grid',
    gap: 18,
    alignContent: 'start',
  },
  formCard: {
    ...surfaceCard,
    padding: 24,
  },
  placeholderCard: {
    ...surfaceCard,
    padding: 28,
    display: 'grid',
    gap: 14,
    justifyItems: 'start',
  },
  placeholderIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    display: 'grid',
    placeItems: 'center',
  },
  cardHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 22,
    alignItems: 'flex-start',
  },
  cardTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  cardSubtitle: {
    margin: '6px 0 0',
    color: uiTheme.colors.muted,
    fontSize: 14,
    lineHeight: 1.55,
  },
  statusPill: {
    ...badgeBase,
    background: uiTheme.colors.successSoft,
    color: uiTheme.colors.success,
  },
  profileForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 18,
  },
  field: {
    display: 'grid',
    gap: 8,
    color: uiTheme.colors.text,
    fontSize: 13,
    fontWeight: 600,
  },
  fieldWide: {
    gridColumn: '1 / -1',
  },
  input: {
    ...inputBase,
    width: '100%',
    boxSizing: 'border-box',
  },
  formFooter: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  successMessage: {
    color: uiTheme.colors.success,
    fontSize: 13,
    fontWeight: 600,
  },
  primaryButton: {
    ...primaryButtonBase,
    minHeight: 44,
    padding: '0 18px',
    borderRadius: uiTheme.radii.sm,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  sideCard: {
    ...surfaceCard,
    padding: 20,
    display: 'grid',
    gap: 14,
  },
  sideTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
  },
  planName: {
    display: 'block',
    marginTop: 8,
    color: uiTheme.colors.primary,
    fontSize: 24,
    lineHeight: 1.1,
  },
  planIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
  },
  planMeta: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  planUsageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    fontSize: 14,
    color: uiTheme.colors.text,
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    background: uiTheme.colors.surfaceSoft,
    overflow: 'hidden',
  },
  progressFill: {
    display: 'block',
    height: '100%',
    borderRadius: 999,
    background: 'linear-gradient(90deg, #6d28d9 0%, #8b5cf6 100%)',
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 42,
    borderRadius: uiTheme.radii.sm,
    cursor: 'pointer',
    fontWeight: 600,
    padding: '0 14px',
  },
  summaryList: {
    display: 'grid',
    gap: 12,
  },
  quickActions: {
    display: 'grid',
    gap: 4,
  },
  quickActionButton: {
    border: 0,
    background: 'transparent',
    color: uiTheme.colors.text,
    minHeight: 50,
    padding: '0 2px',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  quickActionDanger: {
    color: uiTheme.colors.danger,
  },
  quickActionLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    fontWeight: 600,
    fontSize: 14,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    flexShrink: 0,
  },
  quickActionIconDanger: {
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
  },
  emptyState: {
    padding: '18px 0 6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
};
