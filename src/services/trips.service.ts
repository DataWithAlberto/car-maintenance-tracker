import { supabase } from './supabase';
import type { Trip, CreateTripInput, TripWaypoint } from '../types';

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
      .insert({ ...input, vehicle_id: vehicleId, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: Partial<CreateTripInput>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
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
        weather_temp:      json.main?.temp ?? undefined,
        weather_humidity:  json.main?.humidity ?? undefined,
        weather_wind_speed: json.wind?.speed != null ? Math.round(json.wind.speed * 3.6) : undefined,
      };
    } catch {
      return null;
    }
  },

  exportCSV(trips: Trip[]): void {
    const headers = [
      'Título','Inicio','Fin','Fecha inicio','Fecha fin',
      'Km inicio','Km fin','Km total','Combustible (L)',
      'Velocidad media (km/h)','Tiempo conducción (min)',
      'Altitud máx (m)','Clima','Temp (°C)','Notas',
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
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'viajes.csv'; a.click();
    URL.revokeObjectURL(url);
  },

  exportGPX(trip: Trip): void {
    const wpts = (trip.waypoints ?? [])
      .map(
        (w) =>
          `  <wpt lat="${w.lat}" lon="${w.lng}"><name>${w.name ?? 'Punto'}</name>${w.description ? `<desc>${w.description}</desc>` : ''}</wpt>`,
      )
      .join('\n');

    const startRte = trip.start_lat != null && trip.start_lng != null
      ? `  <rtept lat="${trip.start_lat}" lon="${trip.start_lng}"><name>${trip.start_location}</name></rtept>\n`
      : '';
    const endRte = trip.end_lat != null && trip.end_lng != null
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
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `viaje-${trip.id.slice(0, 8)}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
