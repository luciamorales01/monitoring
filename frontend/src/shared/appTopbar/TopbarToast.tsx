import { appTopbarStyles as styles } from '../AppTopbar.styles';
import { topbarNotificationTypeLabels } from '../AppTopbar.utils';
import type { NotificationEvent } from '../notificationApi';
import { BellIcon } from '../uiIcons';

type TopbarToastProps = {
  notification: NotificationEvent | null;
  onClick: (notification: NotificationEvent) => void;
};

export default function TopbarToast({
  notification,
  onClick,
}: TopbarToastProps) {
  if (!notification) return null;

  return (
    <button
      type="button"
      style={styles.toast}
      onClick={() => onClick(notification)}
    >
      <span
        style={
          notification.type === 'MONITOR_DOWN'
            ? styles.toastIconDanger
            : styles.toastIconSuccess
        }
      >
        <BellIcon size={15} />
      </span>
      <span>
        <strong>{topbarNotificationTypeLabels[notification.type]}</strong>
        <small>{notification.monitor?.name ?? 'Monitor'} · abrir detalle</small>
      </span>
    </button>
  );
}
