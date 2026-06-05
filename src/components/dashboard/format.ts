// ─── Formato locale-safe para el dashboard ──────────────────────────────────
// es-ES con separador de miles por espacio fino (estética "telemetría").
// Centralizado aquí para que todos los subcomponentes del dashboard usen el
// mismo criterio sin redefinir helpers.

export const fmtN = (n: number): string =>
  Math.round(n).toLocaleString('es-ES').replace(/\./g, ' ');

export const fmtEur = (n: number): string => `${fmtN(n)} €`;

export const fmtMonthDay = (d: Date): string =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase();

export const fmtLongDate = (d: Date): string =>
  d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
