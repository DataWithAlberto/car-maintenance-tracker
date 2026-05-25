import { supabase } from './supabase';
import type { GalleryImage } from './gallery.service';
import type { Trip, TripAlbum } from '../types';

/* Un "álbum" es la agregación virtual de todas las fotos de galería con
 * trip_id = trip.id. No hay tabla separada — se calcula en cliente. */
export const albumsService = {
  /** Lista todos los viajes accesibles y los enriquece con conteo+portada. */
  async listForUser(userId: string): Promise<TripAlbum[]> {
    const { data: trips, error: tripsErr } = await supabase
      .from('trips')
      .select('*, waypoints:trip_waypoints(*)')
      .order('created_at', { ascending: false });
    if (tripsErr) throw tripsErr;

    const tripList = (trips ?? []) as Trip[];
    if (tripList.length === 0) return [];

    const tripIds = tripList.map((t) => t.id);
    const { data: photos, error: photosErr } = await supabase
      .from('galeria_imagenes')
      .select('id, trip_id, public_url, created_at, taken_at')
      .in('trip_id', tripIds)
      .order('created_at', { ascending: false });
    if (photosErr) throw photosErr;

    type PhotoRow = Pick<GalleryImage, 'id' | 'trip_id' | 'public_url' | 'created_at' | 'taken_at'>;
    const byTrip = new Map<string, PhotoRow[]>();
    for (const p of (photos ?? []) as PhotoRow[]) {
      if (!p.trip_id) continue;
      const bucket = byTrip.get(p.trip_id);
      if (bucket) bucket.push(p);
      else byTrip.set(p.trip_id, [p]);
    }

    void userId; // RLS ya filtra por dueño/colaborador/compartido.

    return tripList.map<TripAlbum>((trip) => {
      const list = byTrip.get(trip.id) ?? [];
      const cover = list[0]?.public_url ?? null;
      const last = list[0]?.taken_at ?? list[0]?.created_at ?? null;
      return {
        trip,
        cover_url: cover,
        photo_count: list.length,
        last_photo_at: last,
      };
    });
  },
};
