import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { prestamoService } from '../services/prestamo.service';
import { prestamoSyncService, prestamoSyncStorage } from '../services/prestamoSync.service';
import type { PrestamoMovimiento } from '../types';
import toast from 'react-hot-toast';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'unconfigured';

export function usePrestamo(vehicleId?: string) {
  const [movimientos, setMovimientos] = useState<PrestamoMovimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    prestamoSyncService.isConfigured() ? 'idle' : 'unconfigured',
  );
  const [lastSync, setLastSync] = useState<string | null>(prestamoSyncStorage.getLastSync());
  const syncedOnMount = useRef(false);

  // Solo los movimientos no borrados — usar para mostrar al usuario y calcular stats.
  const visibles = useMemo(() => movimientos.filter((m) => !m.deleted_at), [movimientos]);

  const stats = useMemo(() => prestamoService.calcStats(visibles), [visibles]);

  const refresh = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const data = await prestamoService.getAllByVehicle(vehicleId);
      setMovimientos(data);
    } catch {
      toast.error('Error al cargar los movimientos del préstamo');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  /**
   * Sync bidireccional con la Google Sheet. Estrategia:
   *   1. Pull remoto.
   *   2. Local lee TODOS los movimientos (incluidos los borrados, para que el
   *      Sheet refleje los soft-delete).
   *   3. reconcile() devuelve qué insertar en Supabase y qué empujar al Sheet.
   *   4. Aplicamos upsert local + push remoto.
   *   5. Recargamos el estado visible.
   */
  const sync = useCallback(async () => {
    if (!vehicleId) return;
    if (!prestamoSyncService.isConfigured()) {
      setSyncStatus('unconfigured');
      return;
    }
    setSyncStatus('syncing');
    try {
      const [remote, local] = await Promise.all([
        prestamoSyncService.pull(vehicleId),
        prestamoService.getAllByVehicle(vehicleId),
      ]);
      const { upsertLocal, toRemote } = prestamoSyncService.reconcile(local, remote);

      if (upsertLocal.length) {
        const withVehicle = upsertLocal.map((r) => ({ ...r, vehicle_id: vehicleId }));
        await prestamoService.upsert(withVehicle);
      }
      if (toRemote.length) {
        await prestamoSyncService.push(toRemote, vehicleId);
      }

      const fresh = await prestamoService.getAllByVehicle(vehicleId);
      setMovimientos(fresh);
      const now = new Date().toISOString();
      prestamoSyncStorage.setLastSync(now);
      setLastSync(now);
      setSyncStatus('idle');
      if (upsertLocal.length || toRemote.length) {
        toast.success(
          `Sincronizado · ${upsertLocal.length} desde Sheet · ${toRemote.length} al Sheet`,
        );
      }
    } catch (err) {
      console.error('[prestamo:sync] error', err);
      setSyncStatus('error');
      toast.error('Error sincronizando con Google Sheets');
    }
  }, [vehicleId]);

  // Initial load + auto-sync una sola vez por montaje.
  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      await refresh();
      if (cancelled) return;
      if (!syncedOnMount.current && prestamoSyncService.isConfigured()) {
        syncedOnMount.current = true;
        await sync();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, refresh, sync]);

  const pushOne = async (m: PrestamoMovimiento) => {
    if (!vehicleId || !prestamoSyncService.isConfigured()) return;
    try {
      await prestamoSyncService.push([m], vehicleId);
    } catch (err) {
      console.warn('[prestamo:sync] push fallo (sigue en cola para próximo sync)', err);
    }
  };

  const create = async (input: {
    fecha: string;
    importe: number;
    usuario: string;
    descripcion?: string;
  }) => {
    if (!vehicleId) return;
    const m = await prestamoService.create(vehicleId, input);
    setMovimientos((prev) => [m, ...prev]);
    pushOne(m); // fire-and-forget
    return m;
  };

  const remove = async (id: string) => {
    const snapshot = movimientos;
    // Optimistic: marcamos como borrado local antes del fetch
    setMovimientos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m)),
    );
    try {
      const updated = await prestamoService.softDelete(id);
      setMovimientos((prev) => prev.map((m) => (m.id === id ? updated : m)));
      pushOne(updated); // fire-and-forget
    } catch {
      setMovimientos(snapshot);
      throw new Error('No se pudo eliminar el movimiento');
    }
  };

  return {
    movimientos: visibles,
    stats,
    loading,
    syncStatus,
    lastSync,
    create,
    remove,
    refresh,
    sync,
  };
}
