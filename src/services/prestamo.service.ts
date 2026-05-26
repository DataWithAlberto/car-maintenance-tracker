import { supabase } from './supabase';
import type { PrestamoMovimiento, PrestamoStats } from '../types';

export const IMPORTE_INICIAL = 17000;

export const prestamoService = {
  /** Devuelve movimientos NO borrados (deleted_at IS NULL). */
  async getByVehicle(vehicleId: string): Promise<PrestamoMovimiento[]> {
    const { data, error } = await supabase
      .from('prestamo_movimientos')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .is('deleted_at', null)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Devuelve TODOS los movimientos (incluidos los borrados). Para sync. */
  async getAllByVehicle(vehicleId: string): Promise<PrestamoMovimiento[]> {
    const { data, error } = await supabase
      .from('prestamo_movimientos')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    vehicleId: string,
    input: { fecha: string; importe: number; usuario: string },
  ): Promise<PrestamoMovimiento> {
    const { data, error } = await supabase
      .from('prestamo_movimientos')
      .insert({ ...input, vehicle_id: vehicleId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Upsert por id, respetando last-write-wins por updated_at.
   * El trigger en Supabase se encarga de NO sobrescribir registros con
   * `updated_at` más reciente (ver migración SQL).
   */
  async upsert(rows: PrestamoMovimiento[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from('prestamo_movimientos')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },

  /**
   * Soft delete: marca deleted_at = NOW() y bumpea updated_at para que el
   * sync propague la eliminación al Sheet vía last-write-wins.
   */
  async softDelete(id: string): Promise<PrestamoMovimiento> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('prestamo_movimientos')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  calcStats(movimientos: PrestamoMovimiento[]): PrestamoStats {
    let pagadoCelia = 0;
    let pagadoAlberto = 0;
    for (const m of movimientos) {
      if (m.deleted_at) continue;
      if (m.usuario === 'Celia') pagadoCelia += m.importe;
      else pagadoAlberto += m.importe;
    }
    const totalPagado = pagadoCelia + pagadoAlberto;
    const saldoPendiente = Math.max(0, IMPORTE_INICIAL - totalPagado);
    return {
      importeInicial: IMPORTE_INICIAL,
      totalPagado,
      saldoPendiente,
      pagadoCelia,
      pagadoAlberto,
      pctCelia: IMPORTE_INICIAL > 0 ? (pagadoCelia / IMPORTE_INICIAL) * 100 : 0,
      pctAlberto: IMPORTE_INICIAL > 0 ? (pagadoAlberto / IMPORTE_INICIAL) * 100 : 0,
    };
  },
};
