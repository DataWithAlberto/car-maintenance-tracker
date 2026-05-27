import type { PrestamoMovimiento } from '../types';

/**
 * Cliente de sync entre la app y la hoja de Google Sheets vía Apps Script.
 *
 * El Apps Script publicado expone:
 *   GET  ?secret=…           → { rows: [...] }
 *   POST { secret, rows[] }  → { applied, kept, merged: [...] }
 *
 * El contrato es last-write-wins por `updated_at`. La configuración (URL +
 * secret) se persiste por dispositivo en localStorage — cada usuario solo
 * tiene que pegarla una vez en /prestamo.
 */

const STORAGE_KEY = 'focushub:prestamo-sync';
const LAST_SYNC_KEY = 'focushub:prestamo-last-sync';

export interface PrestamoSyncConfig {
  url: string;
  secret: string;
}

export const prestamoSyncStorage = {
  load(): PrestamoSyncConfig | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PrestamoSyncConfig;
      if (!parsed.url || !parsed.secret) return null;
      return parsed;
    } catch {
      return null;
    }
  },
  save(config: PrestamoSyncConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  },
  getLastSync(): string | null {
    return localStorage.getItem(LAST_SYNC_KEY);
  },
  setLastSync(iso: string) {
    localStorage.setItem(LAST_SYNC_KEY, iso);
  },
};

interface SheetRow {
  id: string;
  fecha: string;
  usuario: string;
  importe: number;
  updated_at: string;
  deleted_at: string | null;
}

const toSheetRow = (m: PrestamoMovimiento): SheetRow => ({
  id: m.id,
  fecha: m.fecha,
  usuario: m.usuario,
  importe: m.importe,
  updated_at: m.updated_at,
  deleted_at: m.deleted_at,
});

const fromSheetRow = (r: SheetRow, vehicleId: string): PrestamoMovimiento => ({
  id: r.id,
  vehicle_id: vehicleId,
  fecha: typeof r.fecha === 'string' ? r.fecha.slice(0, 10) : r.fecha,
  usuario: r.usuario as PrestamoMovimiento['usuario'],
  importe: Number(r.importe),
  // El Sheet no almacena `nota` — se preserva localmente en el hook si existe.
  nota: null,
  created_at: r.updated_at,
  updated_at: r.updated_at,
  deleted_at: r.deleted_at,
});

export const prestamoSyncService = {
  isConfigured(): boolean {
    return prestamoSyncStorage.load() != null;
  },

  /** Lee todas las filas del Sheet (incluidas las marcadas como borradas). */
  async pull(vehicleId: string): Promise<PrestamoMovimiento[]> {
    const cfg = prestamoSyncStorage.load();
    if (!cfg) throw new Error('Sync no configurado');
    const url = `${cfg.url}?secret=${encodeURIComponent(cfg.secret)}`;
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error(`Sheet GET falló: ${res.status}`);
    const data = (await res.json()) as { rows: SheetRow[] };
    return (data.rows ?? []).map((r) => fromSheetRow(r, vehicleId));
  },

  /**
   * Push de un lote de movimientos al Sheet.
   * Devuelve `kept` con las filas en las que la versión del Sheet es más
   * reciente: la app debe pisar su copia local con esos valores.
   */
  async push(
    movimientos: PrestamoMovimiento[],
    vehicleId: string,
  ): Promise<{ applied: string[]; kept: PrestamoMovimiento[]; merged: PrestamoMovimiento[] }> {
    const cfg = prestamoSyncStorage.load();
    if (!cfg) throw new Error('Sync no configurado');
    const body = JSON.stringify({
      secret: cfg.secret,
      rows: movimientos.map(toSheetRow),
    });
    const res = await fetch(cfg.url, {
      method: 'POST',
      // Apps Script no acepta preflight CORS con application/json — text/plain
      // hace que la petición sea «simple» y pasa sin OPTIONS.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`Sheet POST falló: ${res.status}`);
    const data = (await res.json()) as {
      applied: string[];
      kept: SheetRow[];
      merged: SheetRow[];
    };
    return {
      applied: data.applied ?? [],
      kept: (data.kept ?? []).map((r) => fromSheetRow(r, vehicleId)),
      merged: (data.merged ?? []).map((r) => fromSheetRow(r, vehicleId)),
    };
  },

  /**
   * Reconcilia dos listas (local Supabase y remota Sheet) aplicando
   * last-write-wins por `updated_at`. No toca ninguno de los dos lados —
   * devuelve las operaciones que el llamador debe aplicar.
   *
   * Casos:
   *   - id solo en remoto → upsertLocal (la app debe insertarlo en Supabase)
   *   - id solo en local  → toRemote (la app debe enviarlo al Sheet)
   *   - id en ambos:
   *       remoto.updated_at > local.updated_at → upsertLocal
   *       local.updated_at > remoto.updated_at → toRemote
   *       iguales → no-op
   */
  reconcile(
    local: PrestamoMovimiento[],
    remote: PrestamoMovimiento[],
  ): {
    upsertLocal: PrestamoMovimiento[];
    toRemote: PrestamoMovimiento[];
  } {
    const upsertLocal: PrestamoMovimiento[] = [];
    const toRemote: PrestamoMovimiento[] = [];
    const localById = new Map(local.map((m) => [m.id, m]));
    const remoteById = new Map(remote.map((m) => [m.id, m]));

    for (const r of remote) {
      const l = localById.get(r.id);
      if (!l) {
        upsertLocal.push(r);
        continue;
      }
      const rT = Date.parse(r.updated_at);
      const lT = Date.parse(l.updated_at);
      if (rT > lT) upsertLocal.push(r);
      else if (lT > rT) toRemote.push(l);
    }

    for (const l of local) {
      if (!remoteById.has(l.id)) toRemote.push(l);
    }

    return { upsertLocal, toRemote };
  },
};
