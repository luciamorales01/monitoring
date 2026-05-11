import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { changePassword, getMe, logout } from "../auth/authApi";
import AppTopbar from "../../shared/AppTopbar";
import LoadingState from "../../shared/LoadingState";
import { tokenStorage } from "../../shared/tokenStorage";
import {
  badgeBase,
  inputBase,
  pageMain,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from "../../theme/commonStyles";
import {
  BellIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
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
} from "../../shared/uiIcons";

type ProfileTab = "personal" | "security" | "notifications";

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
};

type ProfileFormState = Pick<
  ProfileData,
  "name" | "email" | "phone" | "timezone" | "language"
>;

type NotificationFormState = {
  incidentEmails: boolean;
  reportEmails: boolean;
  criticalOnly: boolean;
};

const tabs: Array<{ key: ProfileTab; label: string; icon: ReactNode }> = [
  {
    key: "personal",
    label: "Información personal",
    icon: <UsersIcon size={16} />,
  },
  { key: "security", label: "Seguridad", icon: <ShieldIcon size={16} /> },
  {
    key: "notifications",
    label: "Notificaciones",
    icon: <BellIcon size={16} />,
  },
];

const emptyProfile: ProfileData = {
  name: "Usuario",
  role: "Sin rol",
  roleDescription: "Sesión no cargada",
  email: "",
  phone: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid",
  language: "Español",
  memberSince: "No disponible",
  lastAccess: "Sesión actual",
  location: "No disponible",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [form, setForm] = useState<ProfileFormState>(pickForm(emptyProfile));
  const [notifications, setNotifications] = useState<NotificationFormState>({
    incidentEmails: true,
    reportEmails: false,
    criticalOnly: true,
  });
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getMe();
      const nextProfile: ProfileData = {
        ...emptyProfile,
        name: currentUser.name,
        email: currentUser.email,
        role: getRoleLabel(currentUser.role),
        roleDescription: getRoleDescription(currentUser.role),
        memberSince: "Cuenta activa",
        lastAccess: "Sesión actual",
        location: `Organización ${currentUser.organizationId}`,
      };

      setProfile(nextProfile);
      setForm(pickForm(nextProfile));
      setStatusMessage("");
    } catch {
      setProfile(emptyProfile);
      setForm(pickForm(emptyProfile));
      setStatusMessage(
        "No se pudo cargar el perfil. Vuelve a iniciar sesión si el problema continúa.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const filteredQuickActions = useMemo(() => {
    const actions = [
      {
        id: "password",
        icon: <LockIcon size={16} />,
        label: "Cambiar contraseña",
        tone: "default" as const,
      },
      {
        id: "logout",
        icon: <LogOutIcon size={16} />,
        label: "Cerrar sesión",
        tone: "danger" as const,
      },
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
      "Cambios aplicados en la vista actual. Para guardarlos en base de datos falta conectar PATCH /users/me.",
    );
  };

  const handleNotificationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(
      "Preferencias aplicadas en la vista actual. Para persistirlas falta conectar el endpoint de notificaciones del usuario.",
    );
  };

  const handleQuickAction = async (actionId: string) => {
    if (actionId === "logout") {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          await logout(refreshToken);
        } catch {
          // Cerrar sesión local aunque el token ya estuviera caducado.
        }
      }
      tokenStorage.clear();
      navigate("/login", { replace: true });
      return;
    }

    if (actionId === "password") {
      setActiveTab("security");
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");

    if (passwordForm.newPassword.length < 6) {
      setStatusMessage("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatusMessage("Las contraseñas no coinciden.");
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      tokenStorage.clear();
      setStatusMessage("Contraseña actualizada. Vuelve a iniciar sesión.");
      window.setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setStatusMessage(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar la contraseña.",
      );
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
                <button
                  type="button"
                  style={styles.avatarEditButton}
                  aria-label="Editar avatar"
                >
                  <SettingsIcon size={14} />
                </button>
              </div>

              <div style={styles.identityBlock}>
                <div style={styles.identityHeader}>
                  <h2 style={styles.profileName}>{profile.name}</h2>
                  <span style={styles.roleBadge}>{profile.role}</span>
                </div>

                <div style={styles.identityMeta}>
                  <MetaRow
                    icon={<MailIcon size={15} />}
                    label={profile.email || "Email no disponible"}
                  />
                  <MetaRow
                    icon={<CalendarIcon size={15} />}
                    label={`Miembro desde ${profile.memberSince}`}
                  />
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
                note={profile.location}
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
              {activeTab === "personal" ? (
                <section style={styles.formCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>Información personal</h3>
                      <p style={styles.cardSubtitle}>
                        Actualiza tu información personal y de contacto.
                      </p>
                    </div>

                    <span style={styles.statusPill}>Perfil autenticado</span>
                  </div>

                  <form onSubmit={handleSave} style={styles.profileForm}>
                    <Field label="Nombre completo">
                      <input
                        value={form.name}
                        onChange={handleFormChange("name")}
                        style={styles.input}
                        placeholder="Nombre y apellidos"
                      />
                    </Field>

                    <Field label="Correo electrónico">
                      <input
                        value={form.email}
                        onChange={handleFormChange("email")}
                        style={styles.input}
                        placeholder="correo@ejemplo.com"
                        type="email"
                      />
                    </Field>

                    <Field label="Teléfono">
                      <input
                        value={form.phone}
                        onChange={handleFormChange("phone")}
                        style={styles.input}
                        placeholder="+34 600 000 000"
                      />
                    </Field>

                    <Field label="Zona horaria">
                      <select
                        value={form.timezone}
                        onChange={handleFormChange("timezone")}
                        style={styles.input}
                      >
                        <option value="Europe/Madrid">Europe/Madrid</option>
                        <option value="Europe/Lisbon">Europe/Lisbon</option>
                        <option value="Europe/London">Europe/London</option>
                      </select>
                    </Field>

                    <Field label="Idioma" wide>
                      <select
                        value={form.language}
                        onChange={handleFormChange("language")}
                        style={styles.input}
                      >
                        <option>Español</option>
                        <option>English</option>
                        <option>Português</option>
                      </select>
                    </Field>

                    <div style={styles.formFooter}>
                      {statusMessage ? (
                        <span style={styles.successMessage}>
                          {statusMessage}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button type="submit" style={styles.primaryButton}>
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </section>
              ) : activeTab === "security" ? (
                <section style={styles.formCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>Seguridad de la cuenta</h3>
                      <p style={styles.cardSubtitle}>
                        Cambia tu contraseña y cierra la sesión actual.
                      </p>
                    </div>
                    <span style={styles.statusPill}>Sesión protegida</span>
                  </div>

                  <form
                    onSubmit={handlePasswordSubmit}
                    style={styles.profileForm}
                  >
                    <Field label="Contraseña actual">
                      <input
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            currentPassword: event.target.value,
                          }))
                        }
                        style={styles.input}
                        type="password"
                        autoComplete="current-password"
                      />
                    </Field>

                    <Field label="Nueva contraseña">
                      <input
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            newPassword: event.target.value,
                          }))
                        }
                        style={styles.input}
                        type="password"
                        autoComplete="new-password"
                      />
                    </Field>

                    <Field label="Confirmar nueva contraseña" wide>
                      <input
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                        style={styles.input}
                        type="password"
                        autoComplete="new-password"
                      />
                    </Field>

                    <div style={styles.formFooter}>
                      {statusMessage ? (
                        <span style={styles.successMessage}>
                          {statusMessage}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button type="submit" style={styles.primaryButton}>
                        Cambiar contraseña
                      </button>
                    </div>
                  </form>
                </section>
              ) : (
                <section style={styles.formCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>Notificaciones</h3>
                      <p style={styles.cardSubtitle}>
                        Configura qué avisos quieres recibir desde la
                        plataforma.
                      </p>
                    </div>
                    <span style={styles.statusPill}>
                      Preferencias personales
                    </span>
                  </div>

                  <form
                    onSubmit={handleNotificationSubmit}
                    style={styles.notificationForm}
                  >
                    <SwitchRow
                      icon={<BellIcon size={16} />}
                      title="Alertas de incidencias por email"
                      description="Recibe un aviso cuando una web de tus secciones tenga una incidencia."
                      checked={notifications.incidentEmails}
                      onChange={(checked) =>
                        setNotifications((current) => ({
                          ...current,
                          incidentEmails: checked,
                        }))
                      }
                    />
                    <SwitchRow
                      icon={<MailIcon size={16} />}
                      title="Informes periódicos por email"
                      description="Recibe resúmenes programados con el estado de tus monitores."
                      checked={notifications.reportEmails}
                      onChange={(checked) =>
                        setNotifications((current) => ({
                          ...current,
                          reportEmails: checked,
                        }))
                      }
                    />
                    <SwitchRow
                      icon={<ShieldIcon size={16} />}
                      title="Solo incidencias críticas"
                      description="Reduce ruido y recibe solo eventos importantes."
                      checked={notifications.criticalOnly}
                      onChange={(checked) =>
                        setNotifications((current) => ({
                          ...current,
                          criticalOnly: checked,
                        }))
                      }
                    />

                    <div style={styles.formFooter}>
                      {statusMessage ? (
                        <span style={styles.successMessage}>
                          {statusMessage}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button type="submit" style={styles.primaryButton}>
                        Guardar preferencias
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </div>

            <aside style={styles.sidePanel}>
              <section style={styles.sideCard}>
                <h3 style={styles.sideTitle}>Resumen</h3>
                <div style={styles.summaryList}>
                  <MetaRow
                    icon={<PhoneIcon size={15} />}
                    label={profile.phone || "Teléfono no configurado"}
                  />
                  <MetaRow
                    icon={<ClockIcon size={15} />}
                    label={profile.timezone}
                  />
                  <MetaRow
                    icon={<GlobeIcon size={15} />}
                    label={profile.language}
                  />
                  <MetaRow
                    icon={<MapPinIcon size={15} />}
                    label={profile.location}
                  />
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
                        ...(action.tone === "danger"
                          ? styles.quickActionDanger
                          : {}),
                      }}
                      onClick={() => handleQuickAction(action.id)}
                    >
                      <span style={styles.quickActionLabel}>
                        <span
                          style={{
                            ...styles.quickActionIcon,
                            ...(action.tone === "danger"
                              ? styles.quickActionIconDanger
                              : {}),
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

function SwitchRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={styles.switchRow}>
      <span style={styles.switchIcon}>{icon}</span>
      <span style={styles.switchText}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={styles.switchInput}
      />
    </label>
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
  tone: "primary" | "success";
}) {
  const iconStyle =
    tone === "success"
      ? {
          background: uiTheme.colors.successSoft,
          color: uiTheme.colors.success,
        }
      : {
          background: uiTheme.colors.primarySoft,
          color: uiTheme.colors.primary,
        };

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
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getRoleLabel(role: string) {
  const roleMap: Record<string, string> = {
    OWNER: "Administrador",
    ADMIN: "Editor",
    VIEWER: "Solo lectura",
  };

  return roleMap[role] ?? role;
}

function getRoleDescription(role: string) {
  const roleMap: Record<string, string> = {
    OWNER: "Acceso completo a la plataforma",
    ADMIN: "Gestión operativa y de contenidos",
    VIEWER: "Acceso de solo lectura",
  };

  return roleMap[role] ?? "Permisos personalizados del usuario";
}

const styles: Record<string, CSSProperties> = {
  main: {
    ...pageMain,
    backgroundImage:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.07), transparent 30%), linear-gradient(225deg, rgba(15, 23, 42, 0.045), transparent 28%)",
  },
  breadcrumbLink: {
    color: uiTheme.colors.muted,
    textDecoration: "none",
  },
  breadcrumbCurrent: {
    color: uiTheme.colors.primary,
    fontWeight: 600,
  },
  loadingCard: {
    ...surfaceCard,
    padding: 24,
    borderRadius: 20,
  },
  heroCard: {
    ...surfaceCard,
    display: "flex",
    flexWrap: "wrap",
    gap: 22,
    padding: 28,
    marginBottom: 18,
    borderRadius: 22,
  },
  heroLeft: {
    flex: "999 1 520px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 24,
  },
  heroRight: {
    flex: "1 1 320px",
    display: "grid",
    gap: 16,
    alignContent: "center",
  },
  avatarWrap: {
    position: "relative",
    width: 160,
    height: 160,
    flexShrink: 0,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: `linear-gradient(145deg, ${uiTheme.colors.surfaceSoft} 0%, ${uiTheme.colors.surface} 100%)`,
    border: `1px solid ${uiTheme.colors.border}`,
    color: uiTheme.colors.primary,
    fontSize: 56,
    fontWeight: 700,
    letterSpacing: "0em",
  },
  avatarEditButton: {
    ...secondaryButtonBase,
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 42,
    height: 42,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    color: uiTheme.colors.primary,
    background: uiTheme.colors.surface,
    boxShadow: uiTheme.shadows.card,
  },
  identityBlock: {
    display: "grid",
    gap: 18,
    minWidth: 0,
  },
  identityHeader: {
    display: "grid",
    gap: 10,
  },
  profileName: {
    margin: 0,
    fontSize: 40,
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: "0em",
  },
  roleBadge: {
    ...badgeBase,
    width: "fit-content",
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
  },
  identityMeta: {
    display: "grid",
    gap: 12,
    color: uiTheme.colors.muted,
    fontSize: 15,
  },
  metaRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: uiTheme.colors.muted,
  },
  metaIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.primary,
    flexShrink: 0,
  },
  summaryCard: {
    display: "grid",
    gridTemplateColumns: "52px 1fr",
    gap: 14,
    alignItems: "center",
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
  },
  summaryTitle: {
    margin: "0 0 4px",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  summaryValue: {
    display: "block",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  summaryNote: {
    margin: "5px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  tabsBar: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginBottom: 24,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },

  tabButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "0 0 12px",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: uiTheme.colors.muted,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 140ms ease",
  },

  tabButtonActive: {
    color: uiTheme.colors.primary,
    borderBottomColor: uiTheme.colors.primary,
  },
  contentWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    alignItems: "flex-start",
  },
  contentMain: {
    flex: "999 1 720px",
  },
  sidePanel: {
    flex: "1 1 320px",
    display: "grid",
    gap: 18,
    alignContent: "start",
  },
  formCard: {
    ...surfaceCard,
    padding: 24,
    borderRadius: 20,
  },
  cardHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 22,
    alignItems: "flex-start",
  },
  cardTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "0em",
  },
  cardSubtitle: {
    margin: "6px 0 0",
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
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 18,
  },
  notificationForm: {
    display: "grid",
    gap: 12,
  },
  field: {
    display: "grid",
    gap: 8,
    color: uiTheme.colors.text,
    fontSize: 13,
    fontWeight: 600,
  },
  fieldWide: {
    gridColumn: "1 / -1",
  },
  input: {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
  },
  formFooter: {
    gridColumn: "1 / -1",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
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
    padding: "0 18px",
    borderRadius: 14,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  sideCard: {
    ...surfaceCard,
    padding: 20,
    display: "grid",
    gap: 14,
    borderRadius: 20,
  },
  sideTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0em",
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 42,
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 600,
    padding: "0 14px",
  },
  summaryList: {
    display: "grid",
    gap: 12,
  },
  quickActions: {
    display: "grid",
    gap: 4,
  },
  quickActionButton: {
    border: 0,
    background: "transparent",
    color: uiTheme.colors.text,
    minHeight: 50,
    padding: "0 2px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    textAlign: "left",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  quickActionDanger: {
    color: uiTheme.colors.danger,
  },
  quickActionLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    fontWeight: 600,
    fontSize: 14,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    flexShrink: 0,
  },
  quickActionIconDanger: {
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
  },
  emptyState: {
    padding: "18px 0 6px",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  switchRow: {
    display: "grid",
    gridTemplateColumns: "42px 1fr auto",
    gap: 14,
    alignItems: "center",
    padding: "14px 0",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
    cursor: "pointer",
  },
  switchIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
  },
  switchText: {
    display: "grid",
    gap: 4,
  },
  switchInput: {
    width: 20,
    height: 20,
    accentColor: uiTheme.colors.primary,
  },
};
