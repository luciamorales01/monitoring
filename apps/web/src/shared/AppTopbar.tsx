import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tokenStorage } from './tokenStorage';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationsAsRead,
  type NotificationEvent,
} from './notificationApi';
import { BellIcon, PlusIcon, RefreshIcon, SearchIcon, SettingsIcon, UsersIcon } from './uiIcons';
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

const typeLabels: Record<NotificationEvent['type'], string> = {
  MONITOR_DOWN: 'Monitor caído',
  MONITOR_RECOVERED: 'Monitor recuperado',
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
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [toast, setToast] = useState<NotificationEvent | null>(null);
  const knownNotificationIds = useRef<Set<number>>(new Set());
  const initializedNotifications = useRef(false);
  const { isRunning: isRefreshing, run: runRefresh } = useAsyncAction(onRefresh);

  const loadNotifications = async (showToast = false) => {
    const data = await getNotifications({ limit: 8 });
    const safeData = Array.isArray(data) ? data : [];

    if (showToast && initializedNotifications.current) {
      const newestUnread = safeData.find((item) => !knownNotificationIds.current.has(item.id));
      if (newestUnread) setToast(newestUnread);
    }

    knownNotificationIds.current = new Set(safeData.map((item) => item.id));
    initializedNotifications.current = true;
    setNotifications(safeData);
  };

  useEffect(() => {
    let cancelled = false;

    const poll = async (showToast = false) => {
      try {
        const data = await getNotifications({ limit: 8 });
        if (cancelled) return;

        const safeData = Array.isArray(data) ? data : [];
        if (showToast && initializedNotifications.current) {
          const newestUnread = safeData.find((item) => !knownNotificationIds.current.has(item.id));
          if (newestUnread) setToast(newestUnread);
        }

        knownNotificationIds.current = new Set(safeData.map((item) => item.id));
        initializedNotifications.current = true;
        setNotifications(safeData);
      } catch {
        if (!cancelled) setNotifications([]);
      }
    };

    void poll(false);
    const intervalId = window.setInterval(() => void poll(true), 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const closeMenus = () => {
      setNotificationsOpen(false);
      setUserOpen(false);
    };

    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const handleLogout = () => {
    tokenStorage.clear();
    window.localStorage.removeItem('session');
    window.sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleNotificationClick = async (notification: NotificationEvent) => {
    if (!notification.readAt) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      try {
        await markNotificationsAsRead([notification.id]);
      } catch {
        await loadNotifications(false);
      }
    }

    setNotificationsOpen(false);

    if (notification.incidentId) {
      navigate(`/incidents/${notification.incidentId}`);
    } else if (notification.monitorId) {
      navigate(`/monitors/${notification.monitorId}`);
    } else {
      navigate('/notifications');
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    try {
      await markAllNotificationsAsRead();
    } catch {
      await loadNotifications(false);
    }
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
            {unreadCount > 0 ? <span style={styles.bellBadge}>{unreadCount}</span> : null}
          </button>

          {notificationsOpen ? (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <strong>Centro de alertas</strong>
                <Link to="/notifications" style={styles.dropdownLink}>
                  Ver historial
                </Link>
              </div>

              {notifications.length > 0 ? (
                <button type="button" style={styles.markAllButton} onClick={() => void handleMarkAllAsRead()}>
                  Marcar todas como leídas
                </button>
              ) : null}

              {notifications.length === 0 ? (
                <div style={styles.emptyState}>No hay notificaciones recientes.</div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    style={{
                      ...styles.alertItem,
                      ...(!notification.readAt ? styles.alertItemUnread : {}),
                    }}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <span style={notification.type === 'MONITOR_DOWN' ? styles.alertIconDanger : styles.alertIconSuccess}>
                      <BellIcon size={14} />
                    </span>
                    <span style={styles.alertCopy}>
                      <strong>{typeLabels[notification.type]}</strong>
                      <small>{notification.monitor?.name ?? 'Monitor'} · {formatRelativeDate(notification.createdAt)}</small>
                    </span>
                    {!notification.readAt ? <span style={styles.unreadDot} /> : null}
                  </button>
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
                Configuración
              </Link>
              <button type="button" style={styles.userMenuItem} onClick={handleLogout}>
                Cerrar sesión
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

      {toast ? (
        <button
          type="button"
          style={styles.toast}
          onClick={() => void handleNotificationClick(toast)}
        >
          <span style={toast.type === 'MONITOR_DOWN' ? styles.toastIconDanger : styles.toastIconSuccess}>
            <BellIcon size={15} />
          </span>
          <span>
            <strong>{typeLabels[toast.type]}</strong>
            <small>{toast.monitor?.name ?? 'Monitor'} · abrir detalle</small>
          </span>
        </button>
      ) : null}
    </header>
  );
}

function formatRelativeDate(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return 'ahora';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

const styles: Record<string, CSSProperties> = {
  topbar: { ...topbarBase, position: 'relative' },
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
    width: 360,
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
  markAllButton: {
    border: 0,
    background: 'transparent',
    color: uiTheme.colors.primary,
    fontWeight: 700,
    fontSize: 12,
    textAlign: 'left',
    padding: '4px 10px 8px',
    cursor: 'pointer',
  },
  alertItem: {
    width: '100%',
    border: 0,
    background: 'transparent',
    display: 'grid',
    gridTemplateColumns: '30px 1fr 8px',
    gap: 10,
    alignItems: 'center',
    padding: '10px',
    borderRadius: uiTheme.radii.sm,
    textDecoration: 'none',
    color: uiTheme.colors.text,
    cursor: 'pointer',
    textAlign: 'left',
  },
  alertItemUnread: {
    background: uiTheme.colors.primarySoft,
  },
  alertCopy: {
    display: 'grid',
    gap: 3,
    minWidth: 0,
  },
  alertIconDanger: {
    width: 30,
    height: 30,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    color: uiTheme.colors.danger,
    background: uiTheme.colors.dangerSoft,
  },
  alertIconSuccess: {
    width: 30,
    height: 30,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    color: uiTheme.colors.success,
    background: uiTheme.colors.successSoft,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: uiTheme.colors.primary,
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
  toast: {
    ...surfaceCard,
    position: 'fixed',
    right: 24,
    bottom: 24,
    zIndex: 100,
    width: 330,
    border: 0,
    display: 'grid',
    gridTemplateColumns: '34px 1fr',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    cursor: 'pointer',
    textAlign: 'left',
    color: uiTheme.colors.text,
  },
  toastIconDanger: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    color: uiTheme.colors.danger,
    background: uiTheme.colors.dangerSoft,
  },
  toastIconSuccess: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    color: uiTheme.colors.success,
    background: uiTheme.colors.successSoft,
  },
};
