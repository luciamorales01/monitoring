import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { changePassword, logout } from "../auth/authApi";
import AppTopbar from "../../shared/AppTopbar";
import LoadingState from "../../shared/LoadingState";
import PasswordInput from "../../shared/PasswordInput";
import { tokenStorage } from "../../shared/tokenStorage";
import { useThemePreference } from "../../theme/themePreferences";
import {
  BellIcon,
  ChevronRightIcon,
  ClockIcon,
  LockIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  ShieldIcon,
} from "../../shared/uiIcons";
import { getCurrentUser, updateCurrentUser } from "../../shared/userApi";
import { Field, MetaRow, SectionCard, SwitchRow } from "./components/ProfileFormParts";
import { emptyProfile, tabs, themeOptions } from "./profileConstants";
import { profileInteractionStyles, styles } from "./profileStyles";
import type {
  NotificationFormState,
  ProfileData,
  ProfileFormState,
  ProfileTab,
} from "./profileTypes";
import {
  getCurrentTabLabel,
  getInitials,
  getRoleDescription,
  getRoleLabel,
  pickForm,
} from "./profileUtils";

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
      const currentUser = await getCurrentUser();
      const nextProfile: ProfileData = {
        ...emptyProfile,
        name: currentUser.name,
        email: currentUser.email,
        role: getRoleLabel(currentUser.role),
        roleDescription: getRoleDescription(currentUser.role),
        memberSince: "Cuenta activa",
        lastAccess: "Sesion actual",
        location: `Organizacion ${currentUser.organizationId}`,
        phone: currentUser.phone ?? "",
        timezone: currentUser.timezone ?? emptyProfile.timezone,
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
        label: "Cambiar contraseña",
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

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");

    try {
      const updatedUser = await updateCurrentUser({
        name: form.name,
        email: form.email,
        phone: form.phone,
        timezone: form.timezone,
      });

      const nextProfile: ProfileData = {
        ...profile,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone ?? "",
        timezone: updatedUser.timezone ?? emptyProfile.timezone,
      };

      setProfile(nextProfile);
      setForm(pickForm(nextProfile));
      setStatusMessage("Cambios guardados correctamente.");
    } catch (err) {
      setStatusMessage(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los cambios.",
      );
    }
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
      setStatusMessage("Contraseña actualizada. Vuelve a iniciar sesion.");
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
          <section
            style={styles.heroCard}
            className="profile-surface profile-hero"
          >
            <div style={styles.heroLeft}>
              <div style={styles.avatarWrap}>
                <div style={styles.avatar}>{getInitials(profile.name)}</div>
              </div>

              <div style={styles.identityBlock}>
                <div style={styles.identityHeader}>
                  <div style={styles.identityKicker}>
                    <span style={styles.eyebrow}>Cuenta</span>
                    <span style={styles.statusChip}>Perfil autenticado</span>
                  </div>

                  <h2 style={styles.profileName}>{profile.name}</h2>
                  <p style={styles.profileRoleDescription}>
                    {profile.roleDescription}
                  </p>
                </div>

                <div style={styles.identityMeta}>
                  <MetaRow
                    icon={<MailIcon size={15} />}
                    label={profile.email || "Email no disponible"}
                  />
                </div>
              </div>
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
                  className={
                    isActive ? "profile-tab profile-tab--active" : "profile-tab"
                  }
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

                    <div style={styles.formFooter}>
                      {statusMessage ? (
                        <span style={styles.successMessage}>
                          {statusMessage}
                        </span>
                      ) : (
                        <span style={styles.footerHint}>
                          Los cambios se aplican solo en la vista hasta conectar
                          el backend.
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
                  subtitle="Cambia tu contraseña y cierra la sesion actual."
                  badge="Sesion protegida"
                >
                  <div style={styles.noticeBanner}>
                    <ShieldIcon size={16} />
                    <span>
                      Conviene usar una clave unica y renovar el acceso tras
                      cualquier cambio sensible.
                    </span>
                  </div>

                  <form
                    onSubmit={handlePasswordSubmit}
                    style={styles.profileForm}
                  >
                    <Field label="Contraseña actual">
                      <PasswordInput
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            currentPassword: event.target.value,
                          }))
                        }
                        containerStyle={styles.passwordInputWrap}
                        containerClassName="profile-passwordWrap"
                        inputStyle={styles.passwordInput}
                        inputClassName="profile-input profile-passwordInput"
                        autoComplete="current-password"
                      />
                    </Field>

                    <Field label="Nueva contraseña">
                      <PasswordInput
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            newPassword: event.target.value,
                          }))
                        }
                        containerStyle={styles.passwordInputWrap}
                        containerClassName="profile-passwordWrap"
                        inputStyle={styles.passwordInput}
                        inputClassName="profile-input profile-passwordInput"
                        autoComplete="new-password"
                      />
                    </Field>

                    <Field label="Confirmar nueva contraseña" wide>
                      <PasswordInput
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                        containerStyle={styles.passwordInputWrap}
                        containerClassName="profile-passwordWrap"
                        inputStyle={styles.passwordInput}
                        inputClassName="profile-input profile-passwordInput"
                        autoComplete="new-password"
                      />
                    </Field>

                    <div style={styles.formFooter}>
                      {statusMessage ? (
                        <span style={styles.successMessage}>
                          {statusMessage}
                        </span>
                      ) : (
                        <span style={styles.footerHint}>
                          Debe tener al menos 6 caracteres y coincidir con la
                          confirmacion.
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
                          Actualizar contraseña
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
                        <span style={styles.successMessage}>
                          {statusMessage}
                        </span>
                      ) : (
                        <span style={styles.footerHint}>
                          Los avisos se aplican solo en la vista hasta conectar
                          el endpoint.
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
                      <strong>
                        {resolvedTheme === "dark" ? "oscuro" : "claro"}
                      </strong>
                    </div>
                    <p style={styles.themeHint}>
                      El cambio afecta solo a tu experiencia local y se guarda
                      en el navegador.
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
                    <p style={styles.sideSubtitle}>
                      Datos clave del perfil y contexto local.
                    </p>
                  </div>
                </div>

                <div style={styles.summaryList}>
                  <MetaRow
                    icon={<PhoneIcon size={15} />}
                    label={profile.phone || "Telefono no configurado"}
                  />
                  <MetaRow
                    icon={<ClockIcon size={15} />}
                    label={profile.timezone}
                  />
                  <MetaRow
                    icon={<MapPinIcon size={15} />}
                    label={profile.location}
                  />
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
