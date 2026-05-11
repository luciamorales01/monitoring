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
  useThemePreference,
  type ThemePreference,
} from "../../theme/themePreferences";
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
} from "../../shared/uiIcons";

type ProfileTab = "personal" | "security" | "notifications" | "appearance";

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

const tabs: Array<{ key: ProfileTab; label: string }> = [
  { key: "personal", label: "Informacion personal" },
  { key: "security", label: "Seguridad" },
  { key: "notifications", label: "Notificaciones" },
  { key: "appearance", label: "Apariencia" },
];

const themeOptions: Array<{
  id: ThemePreference;
  title: string;
  text: string;
}> = [
  {
    id: "light",
    title: "Claro",
    text: "Interfaz luminosa para entornos con mucha luz.",
  },
  {
    id: "dark",
    title: "Oscuro",
    text: "Menos brillo y mejor foco en sesiones largas.",
  },
  {
    id: "system",
    title: "Segun el dispositivo",
    text: "Respeta el modo configurado en el sistema.",
  },
];

const emptyProfile: ProfileData = {
  name: "Usuario",
  role: "Sin rol",
  roleDescription: "Sesion no cargada",
  email: "",
  phone: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid",
  language: "Espanol",
  memberSince: "No disponible",
  lastAccess: "Sesion actual",
  location: "No disponible",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { preference, resolvedTheme, setPreference } = useThemePreference();
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
        lastAccess: "Sesion actual",
        location: `Organizacion ${currentUser.organizationId}`,
      };

      setProfile(nextProfile);
      setForm(pickForm(nextProfile));
      setStatusMessage("");
    } catch {
      setProfile(emptyProfile);
      setForm(pickForm(emptyProfile));
      setStatusMessage(
        "No se pudo cargar el perfil. Vuelve a iniciar sesion si el problema continua.",
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
        label: "Cambiar contrasena",
        tone: "default" as const,
      },
      {
        id: "logout",
        icon: <LogOutIcon size={16} />,
        label: "Cerrar sesion",
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
          // Cerrar sesion local aunque el token ya estuviera caducado.
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
      setStatusMessage("La nueva contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatusMessage("Las contrasenas no coinciden.");
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      tokenStorage.clear();
      setStatusMessage("Contrasena actualizada. Vuelve a iniciar sesion.");
      window.setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "No se pudo cambiar la contrasena.",
      );
    }
  };

  return (
    <main style={styles.main}>
      <style>{profileInteractionStyles}</style>

      <AppTopbar
        title="Mi perfil"
        breadcrumb={
          <>
            <Link to="/profile" style={styles.breadcrumbLink}>
              Mi perfil
            </Link>
            <ChevronRightIcon size={14} />
            <span style={styles.breadcrumbCurrent}>
              {getCurrentTabLabel(activeTab)}
            </span>
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
        <div style={styles.pageGrid} className="profile-page-grid">
          <section style={styles.heroCard} className="profile-surface profile-hero">
            <div style={styles.heroLeft}>
              <div style={styles.avatarWrap}>
                <div style={styles.avatar}>{getInitials(profile.name)}</div>
                <button
                  type="button"
                  style={styles.avatarEditButton}
                  aria-label="Editar avatar"
                  className="profile-iconButton"
                >
                  <SettingsIcon size={14} />
                </button>
              </div>

              <div style={styles.identityBlock}>
                <div style={styles.identityHeader}>
                  <div style={styles.identityKicker}>
                    <span style={styles.eyebrow}>Cuenta</span>
                    <span style={styles.statusChip}>Perfil autenticado</span>
                  </div>

                  <h2 style={styles.profileName}>{profile.name}</h2>
                  <p style={styles.profileRoleDescription}>{profile.roleDescription}</p>
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
                title="Ultimo acceso"
                value={profile.lastAccess}
                note={profile.location}
                tone="primary"
              />
            </div>
          </section>

          <nav
            style={styles.tabsBar}
            aria-label="Secciones de perfil"
            className="profile-tabs"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  style={{
                    ...styles.tabButton,
                    ...(isActive ? styles.tabButtonActive : {}),
                  }}
                  onClick={() => setActiveTab(tab.key)}
                  onMouseDown={(event) => event.preventDefault()}
                  className={isActive ? "profile-tab profile-tab--active" : "profile-tab"}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <section style={styles.contentWrap}>
            <div style={styles.contentMain}>
              {activeTab === "personal" ? (
                <SectionCard
                  title="Informacion personal"
                  subtitle="Actualiza tu informacion personal y de contacto."
                  badge="Lista de perfil"
                >
                  <form onSubmit={handleSave} style={styles.profileForm}>
                    <Field label="Nombre completo">
                      <input
                        value={form.name}
                        onChange={handleFormChange("name")}
                        style={styles.input}
                        className="profile-input"
                        placeholder="Nombre y apellidos"
                      />
                    </Field>

                    <Field label="Correo electronico">
                      <input
                        value={form.email}
                        onChange={handleFormChange("email")}
                        style={styles.input}
                        className="profile-input"
                        placeholder="correo@ejemplo.com"
                        type="email"
                      />
                    </Field>

                    <Field label="Telefono">
                      <input
                        value={form.phone}
                        onChange={handleFormChange("phone")}
                        style={styles.input}
                        className="profile-input"
                        placeholder="+34 600 000 000"
                      />
                    </Field>

                    <Field label="Zona horaria">
                      <select
                        value={form.timezone}
                        onChange={handleFormChange("timezone")}
                        style={styles.input}
                        className="profile-input"
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
                        className="profile-input"
                      >
                        <option>Espanol</option>
                        <option>English</option>
                        <option>Portugues</option>
                      </select>
                    </Field>

                    <div style={styles.formFooter}>
                      {statusMessage ? (
                        <span style={styles.successMessage}>{statusMessage}</span>
                      ) : (
                        <span style={styles.footerHint}>
                          Los cambios se aplican solo en la vista hasta conectar el backend.
                        </span>
                      )}
                      <button
                        type="submit"
                        style={styles.primaryButton}
                        className="profile-primaryButton"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </SectionCard>
              ) : activeTab === "security" ? (
                <SectionCard
                  title="Seguridad de la cuenta"
                  subtitle="Cambia tu contrasena y cierra la sesion actual."
                  badge="Sesion protegida"
                >
                  <div style={styles.noticeBanner}>
                    <ShieldIcon size={16} />
                    <span>Conviene usar una clave unica y renovar el acceso tras cualquier cambio sensible.</span>
                  </div>

                  <form onSubmit={handlePasswordSubmit} style={styles.profileForm}>
                    <Field label="Contrasena actual">
                      <input
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            currentPassword: event.target.value,
                          }))
                        }
                        style={styles.input}
                        className="profile-input"
                        type="password"
                        autoComplete="current-password"
                      />
                    </Field>

                    <Field label="Nueva contrasena">
                      <input
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            newPassword: event.target.value,
                          }))
                        }
                        style={styles.input}
                        className="profile-input"
                        type="password"
                        autoComplete="new-password"
                      />
                    </Field>

                    <Field label="Confirmar nueva contrasena" wide>
                      <input
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                        style={styles.input}
                        className="profile-input"
                        type="password"
                        autoComplete="new-password"
                      />
                    </Field>

                    <div style={styles.formFooter}>
                      {statusMessage ? (
                        <span style={styles.successMessage}>{statusMessage}</span>
                      ) : (
                        <span style={styles.footerHint}>
                          Debe tener al menos 6 caracteres y coincidir con la confirmacion.
                        </span>
                      )}
                      <div style={styles.formActions}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          className="profile-secondaryButton"
                          onClick={() => setActiveTab("personal")}
                        >
                          Volver
                        </button>
                        <button
                          type="submit"
                          style={styles.primaryButton}
                          className="profile-primaryButton"
                        >
                          Actualizar contrasena
                        </button>
                      </div>
                    </div>
                  </form>
                </SectionCard>
              ) : activeTab === "notifications" ? (
                <SectionCard
                  title="Notificaciones"
                  subtitle="Configura que avisos quieres recibir desde la plataforma."
                  badge="Preferencias personales"
                >
                  <form onSubmit={handleNotificationSubmit} style={styles.notificationForm}>
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
                      title="Informes periodicos por email"
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
                      title="Solo incidencias criticas"
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
                        <span style={styles.successMessage}>{statusMessage}</span>
                      ) : (
                        <span style={styles.footerHint}>
                          Los avisos se aplican solo en la vista hasta conectar el endpoint.
                        </span>
                      )}
                      <button
                        type="submit"
                        style={styles.primaryButton}
                        className="profile-primaryButton"
                      >
                        Guardar preferencias
                      </button>
                    </div>
                  </form>
                </SectionCard>
              ) : (
                <SectionCard
                  title="Apariencia"
                  subtitle="Ajusta el modo visual sin cambiar el diseño general de la aplicacion."
                  badge="Preferencia local"
                >
                  <div style={styles.themeHeader}>
                    <div style={styles.themePreview}>
                      <span style={styles.themePreviewLabel}>Modo actual</span>
                      <strong>{resolvedTheme === "dark" ? "oscuro" : "claro"}</strong>
                    </div>
                    <p style={styles.themeHint}>
                      El cambio afecta solo a tu experiencia local y se guarda en el navegador.
                    </p>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Modo de color"
                    style={styles.themeOptions}
                  >
                    {themeOptions.map((option) => {
                      const isSelected = preference === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          style={{
                            ...styles.themeOption,
                            ...(isSelected ? styles.themeOptionActive : {}),
                          }}
                          className={
                            isSelected
                              ? "profile-themeOption profile-themeOption--active"
                              : "profile-themeOption"
                          }
                          onClick={() => setPreference(option.id)}
                        >
                          <strong>{option.title}</strong>
                          <span>{option.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>
              )}
            </div>

            <aside style={styles.sidePanel}>
              <section style={styles.sideCard} className="profile-surface">
                <div style={styles.sideHeader}>
                  <div>
                    <h3 style={styles.sideTitle}>Resumen</h3>
                    <p style={styles.sideSubtitle}>Datos clave del perfil y contexto local.</p>
                  </div>
                  <span style={styles.statusChip}>Live</span>
                </div>

                <div style={styles.summaryList}>
                  <MetaRow
                    icon={<PhoneIcon size={15} />}
                    label={profile.phone || "Telefono no configurado"}
                  />
                  <MetaRow icon={<ClockIcon size={15} />} label={profile.timezone} />
                  <MetaRow icon={<GlobeIcon size={15} />} label={profile.language} />
                  <MetaRow icon={<MapPinIcon size={15} />} label={profile.location} />
                </div>
              </section>

              <section style={styles.sideCard} className="profile-surface">
                <div style={styles.sideHeader}>
                  <div>
                    <h3 style={styles.sideTitle}>Acciones rapidas</h3>
                    <p style={styles.sideSubtitle}>
                      Busca arriba para filtrar atajos de cuenta.
                    </p>
                  </div>
                  <span style={styles.searchBadge}>
                    <SearchIcon size={13} />
                    {filteredQuickActions.length}
                  </span>
                </div>

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
                      className={
                        action.tone === "danger"
                          ? "profile-action profile-action--danger"
                          : "profile-action"
                      }
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
                      No hay acciones que coincidan con la busqueda actual.
                    </div>
                  ) : null}
                </div>
              </section>
            </aside>
          </section>
        </div>
      )}
    </main>
  );
}

function SectionCard({
  children,
  title,
  subtitle,
  badge,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <section style={styles.formCard} className="profile-surface profile-sectionCard">
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.cardTitle}>{title}</h3>
          <p style={styles.cardSubtitle}>{subtitle}</p>
        </div>

        <span style={styles.statusChip}>{badge}</span>
      </div>

      {children}
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
    <label
      style={{ ...styles.field, ...(wide ? styles.fieldWide : {}) }}
      className="profile-field"
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetaRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={styles.metaRow} className="profile-metaRow">
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
    <label style={styles.switchRow} className="profile-switchRow">
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
    <div style={styles.summaryCard} className="profile-summaryCard">
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
    ADMIN: "Gestion operativa y de contenidos",
    VIEWER: "Acceso de solo lectura",
  };

  return roleMap[role] ?? "Permisos personalizados del usuario";
}

function getCurrentTabLabel(tab: ProfileTab) {
  const currentTab = tabs.find((item) => item.key === tab);
  return currentTab?.label ?? "Mi perfil";
}

const profileInteractionStyles = `
  .profile-surface {
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .profile-surface:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    border-color: rgba(37, 99, 235, 0.18);
  }

  .profile-tab {
    transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .profile-tab:hover {
    color: ${uiTheme.colors.text};
    transform: translateY(-1px);
    background: rgba(37, 99, 235, 0.04);
  }

  .profile-tab--active {
    box-shadow: inset 0 -1px 0 ${uiTheme.colors.primary};
  }

  .profile-input {
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .profile-input:focus-visible {
    outline: none;
    border-color: ${uiTheme.colors.primary};
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
  }

  .profile-primaryButton,
  .profile-secondaryButton,
  .profile-iconButton,
  .profile-action,
  .profile-themeOption {
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
  }

  .profile-primaryButton:hover,
  .profile-secondaryButton:hover,
  .profile-iconButton:hover,
  .profile-action:hover,
  .profile-themeOption:hover {
    transform: translateY(-1px);
  }

  .profile-tab:focus-visible,
  .profile-primaryButton:focus-visible,
  .profile-secondaryButton:focus-visible,
  .profile-iconButton:focus-visible,
  .profile-action:focus-visible,
  .profile-themeOption:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
  }

  .profile-primaryButton:hover {
    box-shadow: 0 12px 28px rgba(37, 99, 235, 0.24);
  }

  .profile-secondaryButton:hover {
    border-color: ${uiTheme.colors.primary};
    color: ${uiTheme.colors.primary};
    background: ${uiTheme.colors.primarySoft};
  }

  .profile-iconButton:hover {
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  }

  .profile-action:hover {
    background: rgba(37, 99, 235, 0.04);
    border-color: rgba(37, 99, 235, 0.12);
    color: ${uiTheme.colors.text};
  }

  .profile-action--danger:hover {
    background: ${uiTheme.colors.dangerSoft};
    color: ${uiTheme.colors.danger};
    border-color: rgba(220, 38, 38, 0.18);
  }

  .profile-themeOption:hover,
  .profile-themeOption--active {
    border-color: ${uiTheme.colors.primary};
    box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
  }

  .profile-field:focus-within {
    color: ${uiTheme.colors.primary};
  }

  .profile-metaRow:hover {
    color: ${uiTheme.colors.text};
  }

  .profile-switchRow:hover {
    background: ${uiTheme.colors.surfaceSoft};
  }

  @media (max-width: 1120px) {
    .profile-page-grid {
      grid-template-columns: 1fr;
    }

    .profile-hero {
      grid-template-columns: 1fr;
    }

    .profile-tabs {
      overflow-x: auto;
      padding-bottom: 2px;
    }
  }

  @media (max-width: 760px) {
    .profile-sectionCard {
      padding: 20px !important;
    }

    .profile-field {
      grid-column: 1 / -1 !important;
    }
  }
`;

const styles: Record<string, CSSProperties> = {
  main: {
    ...pageMain,
    overflow: "auto",
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
  pageGrid: {
    display: "grid",
    gap: 18,
  },
  heroCard: {
    ...surfaceCard,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, 0.9fr)",
    gap: 22,
    padding: 28,
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(248,250,252,0.94))",
    position: "relative",
    overflow: "hidden",
  },
  heroLeft: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 24,
    minWidth: 0,
  },
  heroRight: {
    display: "grid",
    gap: 14,
    alignContent: "center",
  },
  avatarWrap: {
    position: "relative",
    width: 156,
    height: 156,
    flexShrink: 0,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(239,246,255,0.95) 100%)",
    border: `1px solid ${uiTheme.colors.border}`,
    color: uiTheme.colors.primary,
    fontSize: 54,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  },
  avatarEditButton: {
    ...secondaryButtonBase,
    position: "absolute",
    right: 8,
    bottom: 8,
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
  identityKicker: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  eyebrow: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  profileName: {
    margin: 0,
    fontSize: 38,
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: "-0.04em",
  },
  profileRoleDescription: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 620,
  },
  statusChip: {
    ...badgeBase,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    border: `1px solid rgba(37, 99, 235, 0.1)`,
    boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
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
    width: "fit-content",
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
    padding: 16,
    borderRadius: 20,
    background: uiTheme.colors.surface,
    border: `1px solid ${uiTheme.colors.border}`,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
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
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  summaryNote: {
    margin: "5px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.45,
  },
  tabsBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderRadius: 18,
    border: `1px solid ${uiTheme.colors.border}`,
    background: "rgba(255,255,255,0.72)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
    width: "fit-content",
    maxWidth: "100%",
  },
  tabButton: {
    border: "none",
    background: "transparent",
    color: uiTheme.colors.muted,
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 16px",
    cursor: "pointer",
    outline: "none",
    boxShadow: "none",
    borderRadius: 14,
    whiteSpace: "nowrap",
  },
  tabButtonActive: {
    border: "none",
    background: uiTheme.colors.surface,
    color: uiTheme.colors.primary,
    fontWeight: 700,
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.06)",
  },
  contentWrap: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.7fr)",
    gap: 18,
    alignItems: "start",
  },
  contentMain: {
    minWidth: 0,
  },
  sidePanel: {
    display: "grid",
    gap: 18,
    alignContent: "start",
    minWidth: 0,
  },
  formCard: {
    ...surfaceCard,
    padding: 26,
    borderRadius: 24,
    background: "rgba(255,255,255,0.86)",
  },
  cardHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  cardTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  cardSubtitle: {
    margin: "6px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 560,
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
    fontWeight: 700,
  },
  fieldWide: {
    gridColumn: "1 / -1",
  },
  input: {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    height: 46,
    background: uiTheme.colors.surface,
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
  formActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  successMessage: {
    color: uiTheme.colors.success,
    fontSize: 13,
    fontWeight: 600,
  },
  footerHint: {
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  noticeBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 16,
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.text,
    fontSize: 13,
    marginBottom: 18,
  },
  themeHeader: {
    display: "grid",
    gap: 10,
    marginBottom: 18,
  },
  themePreview: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  },
  themePreviewLabel: {
    color: uiTheme.colors.muted,
    fontSize: 13,
    fontWeight: 600,
  },
  themeHint: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 12,
    lineHeight: 1.55,
  },
  themeOptions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  themeOption: {
    display: "grid",
    gap: 6,
    width: "100%",
    border: `1px solid ${uiTheme.colors.border}`,
    borderRadius: 18,
    background: uiTheme.colors.surface,
    color: uiTheme.colors.text,
    padding: 16,
    textAlign: "left",
    cursor: "pointer",
    minHeight: 116,
    alignContent: "start",
  },
  themeOptionActive: {
    borderColor: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    boxShadow: `0 0 0 1px ${uiTheme.colors.primary} inset, 0 10px 24px rgba(37, 99, 235, 0.12)`,
  },
  primaryButton: {
    ...primaryButtonBase,
    minHeight: 46,
    padding: "0 18px",
    borderRadius: 14,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  sideCard: {
    ...surfaceCard,
    padding: 22,
    borderRadius: 24,
    background: "rgba(255,255,255,0.86)",
  },
  sideHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  sideTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  sideSubtitle: {
    margin: "6px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  searchBadge: {
    ...badgeBase,
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.muted,
    border: `1px solid ${uiTheme.colors.border}`,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 46,
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
    gap: 8,
  },
  quickActionButton: {
    border: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surface,
    color: uiTheme.colors.text,
    minHeight: 56,
    padding: "0 16px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    textAlign: "left",
    borderRadius: 16,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.03)",
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
    padding: "12px 2px 2px",
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
    padding: "16px 0",
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
    color: uiTheme.colors.text,
  },
  switchInput: {
    width: 20,
    height: 20,
    accentColor: uiTheme.colors.primary,
  },
};
