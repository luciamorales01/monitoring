import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getActiveIncidents, type Incident } from './incidentApi';
import { tokenStorage } from './tokenStorage';
import { AlertTriangleIcon, BellIcon, PlusIcon, RefreshIcon, SearchIcon, SettingsIcon, UsersIcon } from './uiIcons';
import { useAsyncAction } from './useAsyncAction';
import LoadingState from './LoadingState';
import {
  avatarBase,
  iconButtonBase,
  pageSubtitle,
  pageTitle,
  primaryButtonBase,
  surfaceCard,
  topActionsBase,
  topbarBase,
  uiTheme,
} from '../theme/commonStyles';

type TopbarCta = {
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  to?: string;
};

type TopbarUserSummary = {
  initials: string;
  name: string;
  role: string;
};

type AppTopbarProps = {
  breadcrumb?: ReactNode;
  cta?: TopbarCta;
  eyebrow?: ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  showRefreshButton?: boolean;
  showSearch?: boolean;
  subtitle?: string;
  title: string;
  userSummary?: TopbarUserSummary;
};

export default function AppTopbar({
  breadcrumb,
  cta,
  eyebrow,
  onRefresh,
  onSearchChange,
  searchPlaceholder = 'Buscar',
  searchValue = '',
  showRefreshButton = true,
  showSearch = false,
  subtitle,
  title,
  userSummary,
}: AppTopbarProps) {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { isRunning: isRefreshing, run: runRefresh } = useAsyncAction(onRefresh);

  useEffect(() => {
    let cancelled = false;

    const loadIncidents = async () => {
      try {
        const activeIncidents = await getActiveIncidents();
        if (!cancelled) setIncidents(activeIncidents);
      } catch {
        if (!cancelled) setIncidents([]);
      }
    };

    void loadIncidents();
    const intervalId = window.setInterval(loadIncidents, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const closeMenus = () => {
      setNotificationsOpen(false);
      setUserOpen(false);
    };

    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const recentIncidents = useMemo(() => incidents.slice(0, 5), [incidents]);

  const handleLogout = () => {
    tokenStorage.clear();
    window.localStorage.removeItem('session');
    window.sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const ctaContent = (
    <>
      {cta?.icon ?? <PlusIcon size={16} />}
      {cta?.label}
    </>
  );

  return (
    <header style={styles.topbar}>
      <div>
        {eyebrow ? <div style={styles.eyebrow}>{eyebrow}</div> : null}
        <h1 style={styles.title}>{title}</h1>
        {breadcrumb ? <div style={styles.breadcrumb}>{breadcrumb}</div> : null}
        {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
      </div>

      <div style={styles.topActions}>
        {showRefreshButton ? (
          <button
            type="button"
            style={{
              ...styles.iconButton,
              ...(isRefreshing ? styles.iconButtonLoading : {}),
            }}
            onClick={() => void runRefresh()}
            disabled={isRefreshing}
            title="Refrescar"
          >
            {isRefreshing ? <LoadingState variant="button" label="Refrescando" /> : <RefreshIcon size={16} />}
          </button>
        ) : null}

        {showSearch ? (
          <label style={styles.searchField}>
            <span style={styles.searchIcon}>
              <SearchIcon size={16} />
            </span>
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={searchPlaceholder}
              style={styles.searchInput}
            />
          </label>
        ) : null}

        <div style={styles.menuRoot} onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            style={styles.bell}
            onClick={() => {
              setNotificationsOpen((current) => !current);
              setUserOpen(false);
            }}
            aria-expanded={notificationsOpen}
            title="Notificaciones"
          >
            <BellIcon size={16} />
            {incidents.length > 0 ? (
              <span style={styles.bellBadge}>{incidents.length}</span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <strong>Alertas recientes</strong>
                <Link to="/incidents" style={styles.dropdownLink}>
                  Ver todas
                </Link>
              </div>

              {recentIncidents.length === 0 ? (
                <div style={styles.emptyState}>No hay alertas activas.</div>
              ) : (
                recentIncidents.map((incident) => (
                  <Link
                    key={incident.id}
                    to={`/incidents/${incident.id}`}
                    style={styles.alertItem}
                  >
                    <span style={styles.alertIcon}>
                      <AlertTriangleIcon size={14} />
                    </span>
                    <span>
                      <strong>{incident.title}</strong>
                      <small>{incident.monitor?.name ?? 'Monitor'}</small>
                    </span>
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div style={styles.menuRoot} onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            style={userSummary ? styles.userButton : styles.avatarButton}
            onClick={() => {
              setUserOpen((current) => !current);
              setNotificationsOpen(false);
            }}
            aria-expanded={userOpen}
            title="Usuario"
          >
            {userSummary ? (
              <>
                <span style={styles.userAvatar}>{userSummary.initials}</span>
                <span style={styles.userCopy}>
                  <strong style={styles.userName}>{userSummary.name}</strong>
                  <small style={styles.userRole}>{userSummary.role}</small>
                </span>
              </>
            ) : (
              'AS'
            )}
          </button>

          {userOpen ? (
            <div style={styles.userDropdown}>
              <Link to="/profile" style={styles.userMenuItem}>
                <UsersIcon size={15} />
                Perfil
              </Link>
              <Link to="/settings" style={styles.userMenuItem}>
                <SettingsIcon size={15} />
                Configuracion
              </Link>
              <button type="button" style={styles.userMenuItem} onClick={handleLogout}>
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>

        {cta ? (
          cta.to ? (
            <Link to={cta.to} style={styles.primaryButton}>
              {ctaContent}
            </Link>
          ) : (
            <button type="button" style={styles.primaryButton} onClick={cta.onClick}>
              {ctaContent}
            </button>
          )
        ) : null}
      </div>
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  topbar: topbarBase,
  topActions: topActionsBase,
  title: pageTitle,
  subtitle: pageSubtitle,
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    color: uiTheme.colors.muted,
    fontSize: 13,
    fontWeight: 500,
  },
  iconButton: {
    ...iconButtonBase,
    position: 'relative',
  },
  iconButtonLoading: {
    background: uiTheme.colors.primary,
    color: '#fff',
    borderColor: uiTheme.colors.primary,
    cursor: 'wait',
  },
  menuRoot: {
    position: 'relative',
  },
  bell: {
    ...iconButtonBase,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    background: uiTheme.colors.danger,
    color: '#fff',
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    display: 'grid',
    placeItems: 'center',
    fontSize: 10,
    padding: '0 5px',
    boxSizing: 'border-box',
    fontWeight: 700,
  },
  avatarButton: {
    ...avatarBase,
    width: 38,
    height: 38,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
  },
  userButton: {
    border: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surface,
    color: uiTheme.colors.text,
    borderRadius: uiTheme.radii.pill,
    minHeight: 46,
    padding: '5px 8px 5px 6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    boxShadow: uiTheme.shadows.card,
  },
  userAvatar: {
    ...avatarBase,
    width: 34,
    height: 34,
    fontSize: 12,
    flexShrink: 0,
  },
  userCopy: {
    display: 'grid',
    textAlign: 'left',
    gap: 2,
    minWidth: 0,
  },
  userName: {
    fontSize: 13,
    lineHeight: 1.1,
  },
  userRole: {
    color: uiTheme.colors.muted,
    fontSize: 11,
    lineHeight: 1.1,
  },
  searchField: {
    minWidth: 220,
    height: 40,
    display: 'grid',
    gridTemplateColumns: '34px 1fr',
    alignItems: 'center',
    border: `1px solid ${uiTheme.colors.borderStrong}`,
    borderRadius: uiTheme.radii.pill,
    background: uiTheme.colors.surface,
    overflow: 'hidden',
    boxShadow: uiTheme.shadows.card,
  },
  searchIcon: {
    display: 'grid',
    placeItems: 'center',
    color: uiTheme.colors.muted,
  },
  searchInput: {
    border: 0,
    outline: 'none',
    background: 'transparent',
    color: uiTheme.colors.text,
    fontSize: 13,
    fontFamily: 'inherit',
    padding: '0 14px 0 0',
  },
  primaryButton: {
    ...primaryButtonBase,
    textDecoration: 'none',
    padding: '0 16px',
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  dropdown: {
    ...surfaceCard,
    position: 'absolute',
    top: 46,
    right: 0,
    zIndex: 40,
    width: 320,
    padding: 8,
    display: 'grid',
    gap: 4,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 10px 10px',
    fontSize: 13,
  },
  dropdownLink: {
    color: uiTheme.colors.primary,
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 600,
  },
  alertItem: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr',
    gap: 10,
    alignItems: 'center',
    padding: '10px',
    borderRadius: uiTheme.radii.sm,
    textDecoration: 'none',
    color: uiTheme.colors.text,
  },
  alertIcon: {
    width: 28,
    height: 28,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    color: uiTheme.colors.danger,
    background: uiTheme.colors.dangerSoft,
  },
  emptyState: {
    padding: 18,
    color: uiTheme.colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  userDropdown: {
    ...surfaceCard,
    position: 'absolute',
    top: 46,
    right: 0,
    zIndex: 40,
    width: 190,
    padding: 6,
    display: 'grid',
    gap: 4,
  },
  userMenuItem: {
    border: 0,
    background: 'transparent',
    color: uiTheme.colors.text,
    minHeight: 36,
    padding: '0 10px',
    borderRadius: uiTheme.radii.sm,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'left',
    textDecoration: 'none',
  },
};
