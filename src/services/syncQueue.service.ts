import { supabase } from './supabase';
import type { LiveData } from './obd2.service';
import type { OBD2Anomaly, OBD2Reading } from '../types';

/**
 * Cola de sincronización para escrituras OBD2 que fallaron por problemas de
 * red. Persiste en localStorage y reintenta en background con backoff
 * exponencial cuando vuelve la conectividad o se llama explícitamente.
 *
 * Diseñada para escenarios típicos de uso: el usuario conduce con el coche
 * en zona sin cobertura → seguimos leyendo OBD2 y guardando en la cola →
 * al volver a la red se vacía la cola en orden cronológico.
 */

export type SyncItem =
  | {
      kind: 'reading';
      id: string;
      vehicle_id: string;
      payload: LiveData;
      timestamp: number;
      attempts: number;
    }
  | {
      kind: 'anomaly';
      id: string;
      vehicle_id: string;
      payload: OBD2Anomaly;
      timestamp: number;
      attempts: number;
    };

const STORAGE_KEY = 'fh-sync-queue';
const MAX_QUEUE_SIZE = 5000;
const MAX_ATTEMPTS = 6;
/** Backoff base en ms. Total tras 6 intentos: ~6.3 min. */
const BACKOFF_BASE_MS = 2000;

type Listener = (count: number) => void;

class SyncQueueService {
  private listeners = new Set<Listener>();
  private syncing = false;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private nextRunAt = 0;

  // ─── Storage ──────────────────────────────────────────────────────────────

  private read(): SyncItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(items: SyncItem[]): void {
    try {
      const capped = items.slice(-MAX_QUEUE_SIZE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[syncQueue] localStorage write failed', err);
      }
    }
    this.notify();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  get count(): number {
    return this.read().length;
  }

  get isSyncing(): boolean {
    return this.syncing;
  }

  /** Suscribirse al cambio de tamaño de cola para mostrar badge en UI. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.count);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const c = this.read().length;
    for (const l of this.listeners) l(c);
  }

  /** Encola una lectura para reintento posterior. */
  enqueueReading(vehicleId: string, payload: LiveData): void {
    const items = this.read();
    items.push({
      kind: 'reading',
      id: crypto.randomUUID(),
      vehicle_id: vehicleId,
      payload,
      timestamp: Date.now(),
      attempts: 0,
    });
    this.write(items);
  }

  /** Encola una anomalía para reintento posterior. */
  enqueueAnomaly(vehicleId: string, payload: OBD2Anomaly): void {
    const items = this.read();
    items.push({
      kind: 'anomaly',
      id: crypto.randomUUID(),
      vehicle_id: vehicleId,
      payload,
      timestamp: Date.now(),
      attempts: 0,
    });
    this.write(items);
  }

  /** Vacía la cola completamente (usar con cuidado, descarta datos). */
  clear(): void {
    this.write([]);
  }

  // ─── Sync loop ────────────────────────────────────────────────────────────

  /**
   * Procesa la cola intentando reenviar cada item.
   * Si un item supera MAX_ATTEMPTS se descarta para no bloquear los demás.
   */
  async sync(): Promise<{ sent: number; remaining: number; dropped: number }> {
    if (this.syncing) return { sent: 0, remaining: this.count, dropped: 0 };
    if (Date.now() < this.nextRunAt) {
      return { sent: 0, remaining: this.count, dropped: 0 };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { sent: 0, remaining: this.count, dropped: 0 };
    }

    this.syncing = true;
    let sent = 0;
    let dropped = 0;
    try {
      const items = this.read();
      const remaining: SyncItem[] = [];
      let failures = 0;

      for (const item of items) {
        if (item.attempts >= MAX_ATTEMPTS) {
          dropped++;
          if (import.meta.env.DEV) {
            console.warn('[syncQueue] discarding item over max attempts', item);
          }
          continue;
        }
        const ok = await this.send(item);
        if (ok) {
          sent++;
        } else {
          failures++;
          remaining.push({ ...item, attempts: item.attempts + 1 });
          // Si fallan 3 seguidos, paramos esta ronda y reagendamos
          if (failures >= 3) {
            const idx = items.indexOf(item);
            remaining.push(...items.slice(idx + 1));
            break;
          }
        }
      }

      this.write(remaining);

      if (remaining.length > 0) {
        const maxAttempts = Math.max(...remaining.map((r) => r.attempts), 0);
        const wait = BACKOFF_BASE_MS * Math.pow(2, Math.min(maxAttempts, 6));
        this.nextRunAt = Date.now() + wait;
      } else {
        this.nextRunAt = 0;
      }

      return { sent, remaining: remaining.length, dropped };
    } finally {
      this.syncing = false;
    }
  }

  private async send(item: SyncItem): Promise<boolean> {
    try {
      if (item.kind === 'reading') {
        const r = item.payload;
        const row: OBD2Reading = {
          vehicle_id: item.vehicle_id,
          timestamp: item.timestamp,
          rpm: r.rpm,
          speed: r.speed,
          coolant_temp: r.coolantTemp,
          fuel_level: r.fuelLevel,
          odometer: r.odometer,
          oil_pressure: r.oilPressure,
          battery_voltage: r.batteryVoltage,
          engine_load: r.engineLoad,
          timing_advance: r.timingAdvance,
          engine_runtime: r.engineRuntime,
          maf_air_flow: r.mafAirFlow,
          fuel_trim_bank1: r.fuelTrimBank1,
          fuel_rate: r.fuelRate,
          short_term_fuel_trim_1: r.shortTermFuelTrim1,
          long_term_fuel_trim_1: r.longTermFuelTrim1,
          intake_manifold_pressure: r.intakeManifoldPressure,
          absolute_load: r.absoluteLoad,
          relative_throttle_pos: r.relativeThrottlePos,
          ambient_air_temp: r.ambientAirTemp,
          abs_throttle_pos_b: r.absThrottlePosB,
          acc_pedal_pos_d: r.accPedalPosD,
          acc_pedal_pos_e: r.accPedalPosE,
          catalyst_temp_bank1_sensor1: r.catalystTempBank1Sensor1,
          num_emissions_dtc: r.numEmissionsDtc,
        };
        const { error } = await supabase.from('obd2_readings').insert(row);
        return !error;
      }

      if (item.kind === 'anomaly') {
        const { error } = await supabase.from('obd2_anomalies').insert({
          vehicle_id: item.vehicle_id,
          type: item.payload.type,
          severity: item.payload.severity,
          value: item.payload.value,
          threshold: item.payload.threshold,
          message: item.payload.message,
          dismissed: false,
        });
        return !error;
      }

      return false;
    } catch {
      return false;
    }
  }

  // ─── Auto-sync ────────────────────────────────────────────────────────────

  /**
   * Arranca el bucle de sincronización periódica. Idempotente.
   * Cada 30s comprueba si hay items y los manda.
   */
  startAutoSync(intervalMs = 30000): void {
    if (this.syncTimer) return;

    // Sync inmediato si tenemos items pendientes
    if (this.count > 0) {
      void this.sync();
    }

    this.syncTimer = setInterval(() => {
      if (this.count > 0) void this.sync();
    }, intervalMs);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
    }
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
    }
  }

  private onOnline = () => {
    // Reset backoff cuando vuelve la conectividad
    this.nextRunAt = 0;
    if (this.count > 0) void this.sync();
  };
}

export const syncQueueService = new SyncQueueService();
