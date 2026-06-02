import { supabase } from './supabase';
import type { TelemetriaPunto, ViajeTelemetria, ViajeTelemetriaStats } from '../types';

/**
 * Acceso a los viajes de telemetría ingeridos automáticamente desde OBDLink
 * (Dropbox → Supabase, ver `api/webhook.py`). Estos viajes traen ruta GPS
 * completa y los PIDs muestreados a ~1 Hz, a diferencia de las lecturas BLE
 * en vivo de `obd2_readings`.
 */
export const telemetriaService = {
  /** Lista los viajes de un vehículo, del más reciente al más antiguo. */
  async getViajes(vehicleId: string, limit = 50): Promise<ViajeTelemetria[]> {
    try {
      const { data, error } = await supabase
        .from('viajes_telemetria')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('fecha', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error fetching viajes telemetría:', err);
      return [];
    }
  },

  /** Recupera todos los puntos de un viaje, ordenados por timestamp relativo. */
  async getPuntos(viajeId: string): Promise<TelemetriaPunto[]> {
    try {
      const { data, error } = await supabase
        .from('telemetria_puntos')
        .select('*')
        .eq('viaje_id', viajeId)
        .order('timestamp_ms', { ascending: true });

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error fetching puntos telemetría:', err);
      return [];
    }
  },

  /** Borra un viaje y sus puntos (cascade en la FK). */
  async deleteViaje(viajeId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('viajes_telemetria').delete().eq('id', viajeId);
      if (error) throw error;
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error deleting viaje telemetría:', err);
      return false;
    }
  },

  /**
   * Calcula estadísticas del viaje a partir de sus puntos. La distancia se
   * deriva de las coordenadas GPS con la fórmula de Haversine si el viaje no
   * trae `distancia_km` precalculada.
   */
  computeStats(viaje: ViajeTelemetria, puntos: TelemetriaPunto[]): ViajeTelemetriaStats {
    const velocidades = puntos.map((p) => p.velocidad).filter((v): v is number => v != null);
    const rpms = puntos.map((p) => p.rpm).filter((v): v is number => v != null);
    const temps = puntos.map((p) => p.temp_refrigerante).filter((v): v is number => v != null);

    const gpsPoints = puntos.filter(
      (p): p is TelemetriaPunto & { latitude: number; longitude: number } =>
        p.latitude != null && p.longitude != null,
    );

    let distanciaKm = viaje.distancia_km ?? 0;
    if (!distanciaKm && gpsPoints.length > 1) {
      for (let i = 1; i < gpsPoints.length; i++) {
        distanciaKm += haversineKm(gpsPoints[i - 1], gpsPoints[i]);
      }
    }

    const duracionSeg =
      viaje.duracion_seg ??
      (puntos.length > 1
        ? Math.round((puntos[puntos.length - 1].timestamp_ms - puntos[0].timestamp_ms) / 1000)
        : 0);

    return {
      puntos: puntos.length,
      distanciaKm: Math.round(distanciaKm * 10) / 10,
      duracionSeg,
      velocidadMax: velocidades.length ? Math.max(...velocidades) : null,
      velocidadMedia: velocidades.length
        ? Math.round(velocidades.reduce((a, b) => a + b, 0) / velocidades.length)
        : null,
      rpmMax: rpms.length ? Math.max(...rpms) : null,
      tempRefrigeranteMax: temps.length ? Math.max(...temps) : null,
    };
  },
};

/** Distancia Haversine en km entre dos coordenadas. */
function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
