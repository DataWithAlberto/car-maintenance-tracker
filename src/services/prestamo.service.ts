import { supabase } from './supabase';
import type { PrestamoMovimiento, PrestamoStats, PrestamoUsuario } from '../types';

export const IMPORTE_INICIAL = 17000;

export interface MonthlyBucket {
  key: string;
  label: string;
  Celia: number;
  Alberto: number;
  total: number;
}

export interface PrestamoAdvancedStats {
  avgMonthly: number;
  monthsActive: number;
  monthsRemaining: number | null;
  projectedEndDate: Date | null;
  balanceDelta: number;
  balanceLeader: PrestamoUsuario | null;
  pace: 'ahead' | 'behind' | 'ontrack';
  monthly: MonthlyBucket[];
  lastPaymentDate: string | null;
}

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
    input: { fecha: string; importe: number; usuario: string; nota?: string | null },
  ): Promise<PrestamoMovimiento> {
    const payload = {
      fecha: input.fecha,
      importe: input.importe,
      usuario: input.usuario,
      nota: input.nota?.trim() ? input.nota.trim() : null,
      vehicle_id: vehicleId,
    };
    const { data, error } = await supabase
      .from('prestamo_movimientos')
      .insert(payload)
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

  /**
   * Calcula métricas derivadas: ritmo, fecha estimada de fin, balance entre
   * personas y desglose mensual de los últimos 12 meses. Pensado para vivir
   * en el cliente — no toca Supabase.
   */
  calcAdvancedStats(
    movimientos: PrestamoMovimiento[],
    stats: PrestamoStats,
  ): PrestamoAdvancedStats {
    const live = movimientos.filter((m) => !m.deleted_at);

    // Desglose mensual (últimos 12 meses, incluyendo el actual).
    const now = new Date();
    const monthly: MonthlyBucket[] = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d
        .toLocaleDateString('es-ES', { month: 'short' })
        .replace('.', '')
        .toUpperCase();
      return { key, label, Celia: 0, Alberto: 0, total: 0 };
    });
    const bucketByKey = new Map(monthly.map((m) => [m.key, m]));
    for (const m of live) {
      const d = new Date(m.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      if (m.usuario === 'Celia') bucket.Celia += m.importe;
      else bucket.Alberto += m.importe;
      bucket.total += m.importe;
    }

    // Ritmo: usa los meses transcurridos desde el primer pago real.
    let firstDate: Date | null = null;
    let lastDate: Date | null = null;
    for (const m of live) {
      const d = new Date(m.fecha);
      if (!firstDate || d < firstDate) firstDate = d;
      if (!lastDate || d > lastDate) lastDate = d;
    }
    let monthsActive = 0;
    if (firstDate) {
      const years = now.getFullYear() - firstDate.getFullYear();
      const months = now.getMonth() - firstDate.getMonth();
      monthsActive = Math.max(1, years * 12 + months + 1);
    }
    const avgMonthly = monthsActive > 0 ? stats.totalPagado / monthsActive : 0;

    // Fecha estimada de fin.
    let monthsRemaining: number | null = null;
    let projectedEndDate: Date | null = null;
    if (avgMonthly > 0 && stats.saldoPendiente > 0) {
      monthsRemaining = Math.ceil(stats.saldoPendiente / avgMonthly);
      projectedEndDate = new Date(now.getFullYear(), now.getMonth() + monthsRemaining, 1);
    } else if (stats.saldoPendiente <= 0) {
      monthsRemaining = 0;
      projectedEndDate = lastDate ?? now;
    }

    // Balance entre personas: cuánto más ha aportado quien va por delante.
    const balanceDelta = Math.abs(stats.pagadoCelia - stats.pagadoAlberto);
    const balanceLeader: PrestamoUsuario | null =
      balanceDelta === 0 ? null : stats.pagadoCelia > stats.pagadoAlberto ? 'Celia' : 'Alberto';

    // Ritmo: compara la media móvil de los últimos 3 meses con la media
    // global. >10% por encima = ahead, >10% por debajo = behind.
    const recent = monthly.slice(-3);
    const recentAvg = recent.reduce((s, b) => s + b.total, 0) / Math.max(1, recent.length);
    let pace: 'ahead' | 'behind' | 'ontrack' = 'ontrack';
    if (avgMonthly > 0) {
      const ratio = recentAvg / avgMonthly;
      if (ratio > 1.1) pace = 'ahead';
      else if (ratio < 0.9) pace = 'behind';
    }

    return {
      avgMonthly,
      monthsActive,
      monthsRemaining,
      projectedEndDate,
      balanceDelta,
      balanceLeader,
      pace,
      monthly,
      lastPaymentDate: lastDate?.toISOString() ?? null,
    };
  },
};
