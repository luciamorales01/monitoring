import { Link } from 'react-router-dom';
import { appTopbarStyles as styles } from '../AppTopbar.styles';
import { formatTopbarRelativeDate, topbarNotificationTypeLabels } from '../AppTopbar.utils';
import type { NotificationEvent } from '../notificationApi';
import { BellIcon } from '../uiIcons';

type TopbarNotificationsMenuProps = {
  isOpen: boolean;
  notifications: NotificationEvent[];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: NotificationEvent) => void;
  onToggle: () => void;
};

export default function TopbarNotificationsMenu({
  isOpen,
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onNotificationClick,
  onToggle,
}: TopbarNotificationsMenuProps) {
  return (
    <div style={styles.menuRoot} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        style={styles.bell}
        onClick={onToggle}
        aria-expanded={isOpen}
        title="Notificaciones"
      >
        <BellIcon size={16} />
        {unreadCount > 0 ? (
          <span style={styles.bellBadge}>{unreadCount}</span>
        ) : null}
      </button>

      {isOpen ? (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <strong>Centro de alertas</strong>
            <Link to="/incidents" style={styles.dropdownLink}>
              Ver incidencias
            </Link>
          </div>

          {notifications.length > 0 ? (
            <button
              type="button"
              style={styles.markAllButton}
              onClick={onMarkAllAsRead}
            >
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
                onClick={() => onNotificationClick(notification)}
              >
                <span
                  style={
                    notification.type === 'MONITOR_DOWN'
                      ? styles.alertIconDanger
                      : styles.alertIconSuccess
                  }
                >
                  <BellIcon size={14} />
                </span>
                <span style={styles.alertCopy}>
                  <strong>
                    {topbarNotificationTypeLabels[notification.type]}
                  </strong>
                  <small>
                    {notification.monitor?.name ?? 'Monitor'} ·{' '}
                    {formatTopbarRelativeDate(notification.createdAt)}
                  </small>
                </span>
                {!notification.readAt ? <span style={styles.unreadDot} /> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
