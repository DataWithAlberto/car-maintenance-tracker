import { supabase } from './supabase';
import type {
  Trip,
  CreateTripInput,
  CreateDraftTripInput,
  TripWaypoint,
  TripVisibility,
  SurpriseConfig,
  PublicTripResponse,
} from '../types';

export const tripsService = {
  async getByVehicle(vehicleId: string): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*, waypoints:trip_waypoints(*)')
      .eq('vehicle_id', vehicleId)
      .order('start_datetime', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Trip | null> {
    const { data, error } = await supabase
      .from('trips')
      .select('*, waypoints:trip_waypoints(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(vehicleId: string, userId: string, input: CreateTripInput): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .insert({ ...input, vehicle_id: vehicleId, created_by: userId, status: 'completed' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createDraft(vehicleId: string, userId: string, input: CreateDraftTripInput): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        ...input,
        vehicle_id: vehicleId,
        created_by: userId,
        status: 'planning',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async confirmTrip(tripId: string, keepBookingIds: string[]): Promise<Trip> {
    const { data, error } = await supabase.rpc('confirm_trip', {
      p_trip_id: tripId,
      p_keep_ids: keepBookingIds,
    });
    if (error) throw error;
    return data as Trip;
  },

  async markCompleted(tripId: string): Promise<void> {
    const { error } = await supabase.from('trips').update({ status: 'completed' }).eq('id', tripId);
    if (error) throw error;
  },

  async update(id: string, input: Partial<Trip>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Toggle binario público/privado. Conserva 'collaborative' si ya lo era y
   *  el caller pide ON; solo el caso explícito OFF fuerza 'private'. */
  async setPublic(id: string, isPublic: boolean, current?: TripVisibility): Promise<Trip> {
    let next: TripVisibility;
    if (!isPublic) next = 'private';
    else next = current === 'collaborative' ? 'collaborative' : 'public_link';
    return this.setVisibility(id, next);
  },

  async setVisibility(id: string, visibility: TripVisibility): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update({ visibility })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setSurprise(id: string, enabled: boolean, config?: SurpriseConfig | null): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update({
        is_surprise: enabled,
        surprise_config: enabled ? (config ?? {}) : null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPublicByToken(token: string): Promise<PublicTripResponse> {
    const { data, error } = await supabase.rpc('get_public_trip', { p_token: token });
    if (error) throw error;
    return data as PublicTripResponse;
  },

  async addSurpriseReaction(token: string, emoji: string): Promise<void> {
    const { error } = await supabase.rpc('add_surprise_reaction', {
      p_token: token,
      p_emoji: emoji,
    });
    if (error) throw error;
  },

  async markSurpriseOpened(token: string): Promise<void> {
    const { error } = await supabase.rpc('mark_surprise_opened', { p_token: token });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error, count } = await supabase.from('trips').delete({ count: 'exact' }).eq('id', id);
    if (error) throw error;
    if (count === 0) {
      throw new Error('No se pudo eliminar: el viaje no existe o no tienes permisos.');
    }
  },

  async addWaypoint(
    tripId: string,
    waypoint: Omit<TripWaypoint, 'id' | 'trip_id' | 'created_at'>,
  ): Promise<TripWaypoint> {
    const { data, error } = await supabase
      .from('trip_waypoints')
      .insert({ ...waypoint, trip_id: tripId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteWaypoint(id: string): Promise<void> {
    const { error } = await supabase.from('trip_waypoints').delete().eq('id', id);
    if (error) throw error;
  },

  async fetchForecast(
    lat: number,
    lng: number,
    targetIso: string,
  ): Promise<{
    condition: string;
    icon: string;
    temp: number;
    temp_min: number;
    temp_max: number;
    wind_kmh: number;
    pop: number;
    note: 'forecast' | 'climate';
  } | null> {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) return null;
    const targetTs = Date.parse(targetIso);
    if (Number.isNaN(targetTs)) return null;
    const diffDays = (targetTs - Date.now()) / 86_400_000;
    // Forecast 5d/3h sólo cubre los próximos ~5 días
    if (diffDays > 5 || diffDays < -0.1) {
      return {
        condition: 'climate',
        icon: '01d',
        temp: 0,
        temp_min: 0,
        temp_max: 0,
        wind_kmh: 0,
        pop: 0,
        note: 'climate',
      };
    }
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=es`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      const list = Array.isArray(json.list) ? json.list : [];
      if (list.length === 0) return null;
      // Selecciona el slot más cercano al target
      const closest = list.reduce(
        (best: { d: number; item: unknown } | null, item: { dt: number }) => {
          const d = Math.abs(item.dt * 1000 - targetTs);
          if (!best || d < best.d) return { d, item };
          return best;
        },
        null,
      );
      if (!closest) return null;
      const it = closest.item as {
        main: { temp: number; temp_min: number; temp_max: number };
        weather: { main: string; description: string; icon: string }[];
        wind: { speed: number };
        pop?: number;
      };
      return {
        condition: it.weather?.[0]?.description ?? it.weather?.[0]?.main ?? '',
        icon: it.weather?.[0]?.icon ?? '01d',
        temp: Math.round(it.main.temp),
        temp_min: Math.round(it.main.temp_min),
        temp_max: Math.round(it.main.temp_max),
        wind_kmh: Math.round((it.wind?.speed ?? 0) * 3.6),
        pop: Math.round((it.pop ?? 0) * 100),
        note: 'forecast',
      };
    } catch {
      return null;
    }
  },

  async fetchDirections(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<{ distance_km: number; duration_min: number } | null> {
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) return null;
    try {
      const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=simplified&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const route = json.routes?.[0];
      if (!route) return null;
      return {
        distance_km: Math.round(route.distance / 1000),
        duration_min: Math.round(route.duration / 60),
      };
    } catch {
      return null;
    }
  },

  async fetchWeather(lat: number, lng: number): Promise<Partial<CreateTripInput> | null> {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) return null;
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      return {
        weather_condition: json.weather?.[0]?.main ?? undefined,
        weather_temp: json.main?.temp ?? undefined,
        weather_humidity: json.main?.humidity ?? undefined,
        weather_wind_speed:
          json.wind?.speed != null ? Math.round(json.wind.speed * 3.6) : undefined,
      };
    } catch {
      return null;
    }
  },

  exportCSV(trips: Trip[]): void {
    const headers = [
      'Título',
      'Inicio',
      'Fin',
      'Fecha inicio',
      'Fecha fin',
      'Km inicio',
      'Km fin',
      'Km total',
      'Combustible (L)',
      'Velocidad media (km/h)',
      'Tiempo conducción (min)',
      'Altitud máx (m)',
      'Clima',
      'Temp (°C)',
      'Notas',
    ];
    const rows = trips.map((t) => [
      t.title ?? '',
      t.start_location,
      t.end_location,
      t.start_datetime,
      t.end_datetime ?? '',
      t.start_km,
      t.end_km ?? '',
      t.total_km ?? '',
      t.fuel_consumed ?? '',
      t.avg_speed ?? '',
      t.driving_time_minutes ?? '',
      t.max_altitude ?? '',
      t.weather_condition ?? '',
      t.weather_temp ?? '',
      (t.notes ?? '').replace(/,/g, ';'),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'viajes.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  exportGPX(trip: Trip): void {
    const wpts = (trip.waypoints ?? [])
      .map(
        (w) =>
          `  <wpt lat="${w.lat}" lon="${w.lng}"><name>${w.name ?? 'Punto'}</name>${w.description ? `<desc>${w.description}</desc>` : ''}</wpt>`,
      )
      .join('\n');

    const startRte =
      trip.start_lat != null && trip.start_lng != null
        ? `  <rtept lat="${trip.start_lat}" lon="${trip.start_lng}"><name>${trip.start_location}</name></rtept>\n`
        : '';
    const endRte =
      trip.end_lat != null && trip.end_lng != null
        ? `  <rtept lat="${trip.end_lat}" lon="${trip.end_lng}"><name>${trip.end_location}</name></rtept>\n`
        : '';

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FocusHub" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${trip.title ?? `${trip.start_location} → ${trip.end_location}`}</name><time>${trip.start_datetime}</time></metadata>
${wpts}
  <rte>
    <name>${trip.start_location} → ${trip.end_location}</name>
${startRte}${endRte}  </rte>
</gpx>`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viaje-${trip.id.slice(0, 8)}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
