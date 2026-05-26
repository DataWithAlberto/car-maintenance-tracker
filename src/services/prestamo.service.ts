import { supabase } from './supabase';
import type { PrestamoMovimiento, PrestamoStats } from '../types';

export const IMPORTE_INICIAL = 17000;

export const prestamoService = {
  async getByVehicle(vehicleId: string): Promise<PrestamoMovimiento[]> {
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
    input: { fecha: string; importe: number; usuario: string; descripcion?: string },
  ): Promise<PrestamoMovimiento> {
    const { data, error } = await supabase
      .from('prestamo_movimientos')
      .insert({ ...input, vehicle_id: vehicleId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('prestamo_movimientos').delete().eq('id', id);
    if (error) throw error;
  },

  calcStats(movimientos: PrestamoMovimiento[]): PrestamoStats {
    let pagadoCelia = 0;
    let pagadoAlberto = 0;
    for (const m of movimientos) {
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
