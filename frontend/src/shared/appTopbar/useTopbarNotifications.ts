import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationsAsRead,
  type NotificationEvent,
} from '../notificationApi';

function toSafeNotifications(data: NotificationEvent[]) {
  return Array.isArray(data) ? data : [];
}

export function useTopbarNotifications() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [toast, setToast] = useState<NotificationEvent | null>(null);
  const knownNotificationIds = useRef<Set<number>>(new Set());
  const initializedNotifications = useRef(false);

  const syncNotifications = useCallback((
    nextNotifications: NotificationEvent[],
    showToast: boolean,
  ) => {
    if (showToast && initializedNotifications.current) {
      const newestUnread = nextNotifications.find(
        (item) => !knownNotificationIds.current.has(item.id),
      );

      if (newestUnread) {
        setToast(newestUnread);
      }
    }

    knownNotificationIds.current = new Set(
      nextNotifications.map((item) => item.id),
    );
    initializedNotifications.current = true;
    setNotifications(nextNotifications);
  }, []);

  const loadNotifications = useCallback(async (
    showToast = false,
    options?: {
      clearOnError?: boolean;
      isCancelled?: () => boolean;
    },
  ) => {
    try {
      const data = await getNotifications({ limit: 8 });

      if (options?.isCancelled?.()) {
        return;
      }

      syncNotifications(toSafeNotifications(data), showToast);
    } catch {
      if (options?.isCancelled?.()) {
        return;
      }

      if (options?.clearOnError ?? true) {
        setNotifications([]);
      }
    }
  }, [syncNotifications]);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    void loadNotifications(false, { isCancelled });

    const intervalId = window.setInterval(() => {
      void loadNotifications(true, { isCancelled });
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 5500);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const markNotificationAsRead = async (notificationId: number) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item,
      ),
    );

    try {
      await markNotificationsAsRead([notificationId]);
    } catch {
      await loadNotifications(false);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );

    try {
      await markAllNotificationsAsRead();
    } catch {
      await loadNotifications(false);
    }
  };

  return {
    notifications,
    toast,
    unreadCount,
    markAllAsRead,
    markNotificationAsRead,
  };
}
