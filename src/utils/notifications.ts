import { isTauri } from '../services/obd2/transport';
import type { Alert, OBD2Anomaly } from '../types';

const APP = 'FocusHub';
const SESSION_KEY = 'fh-notified';

/**
 * Notificaciones multiplataforma.
 *
 * - **Tauri (app nativa):** WKWebView no expone la Web Notification API, así que
 *   se usa `@tauri-apps/plugin-notification`, que sí lanza avisos del sistema
 *   aunque la ventana esté en segundo plano.
 * - **Navegador:** se usa la Web Notification API de siempre.
 */

export const notificationsSupported = (): boolean =>
  isTauri() || (typeof window !== 'undefined' && 'Notification' in window);

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (isTauri()) {
    const { isPermissionGranted, requestPermission } =
      await import('@tauri-apps/plugin-notification');
    if (await isPermissionGranted()) return 'granted';
    return (await requestPermission()) as NotificationPermission;
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
};

/** ¿Tenemos permiso concedido para notificar ahora mismo? */
const permitted = async (): Promise<boolean> => {
  if (isTauri()) {
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    return isPermissionGranted();
  }
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  );
};

/** Lanza una notificación del sistema (nativa en Tauri, navegador en web). */
const fire = async (title: string, body: string): Promise<void> => {
  if (isTauri()) {
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    sendNotification({ title, body });
    return;
  }
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    new Notification(title, { body });
  }
};

const alreadyNotified = (): Set<string> => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
};

/** Notifica cada aviso de mantenimiento alto/medio nuevo, una vez por sesión. */
export const sendAlertNotifications = async (alerts: Alert[]): Promise<void> => {
  if (!(await permitted())) return;

  const shown = alreadyNotified();
  const pending = alerts.filter(
    (a) => (a.severity === 'high' || a.severity === 'medium') && !shown.has(a.id),
  );
  if (pending.length === 0) return;

  for (const a of pending.slice(0, 3)) {
    await fire(`${APP} · Mantenimiento`, a.description);
  }
  if (pending.length > 3) {
    await fire(
      `${APP} · Mantenimiento`,
      `Y ${pending.length - 3} aviso(s) más requieren tu atención.`,
    );
  }
  pending.forEach((a) => shown.add(a.id));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...shown]));
};

// Evita el spam de la detección en vivo (corre cada 2 s): no repetir el mismo
// tipo de anomalía dentro de la ventana de enfriamiento.
const COOLDOWN_MS = 5 * 60 * 1000;
const anomalyCooldown = new Map<OBD2Anomaly['type'], number>();

/** Notifica anomalías OBD2 (críticas/aviso) evitando repetir el mismo tipo. */
export const sendAnomalyNotifications = async (anomalies: OBD2Anomaly[]): Promise<void> => {
  const relevant = anomalies.filter((a) => a.severity === 'critical' || a.severity === 'warn');
  if (relevant.length === 0 || !(await permitted())) return;

  const now = Date.now();
  for (const a of relevant) {
    if (now - (anomalyCooldown.get(a.type) ?? 0) < COOLDOWN_MS) continue;
    anomalyCooldown.set(a.type, now);
    const icon = a.severity === 'critical' ? '🚨' : '⚠️';
    await fire(`${APP} · OBD2`, `${icon} ${a.message}`);
  }
};
