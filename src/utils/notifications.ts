import type { Alert } from '../types';

const SESSION_KEY = 'fh-notified';

export const notificationsSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const notificationPermission = (): NotificationPermission =>
  notificationsSupported() ? Notification.permission : 'denied';

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
};

const alreadyNotified = (): Set<string> => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
};

/** Fires a browser notification for each new high/medium alert, once per session. */
export const sendAlertNotifications = (alerts: Alert[]): void => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;

  const shown = alreadyNotified();
  const pending = alerts.filter(
    (a) => (a.severity === 'high' || a.severity === 'medium') && !shown.has(a.id),
  );
  if (pending.length === 0) return;

  pending.slice(0, 3).forEach((a) => {
    new Notification('FocusHub · Mantenimiento', {
      body: a.description,
      tag: a.id,
    });
    shown.add(a.id);
  });
  if (pending.length > 3) {
    new Notification('FocusHub · Mantenimiento', {
      body: `Y ${pending.length - 3} aviso(s) más requieren tu atención.`,
      tag: 'fh-more',
    });
  }
  pending.forEach((a) => shown.add(a.id));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...shown]));
};
