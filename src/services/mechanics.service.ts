import type { Mechanic } from '../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const SEARCH_URL = 'https://api.mapbox.com/search/searchbox/v1/category';
// Categorías Mapbox que cubren talleres mecánicos y de neumáticos
const CATEGORIES = ['auto_repair', 'tire_repair'];

// Haversine — distancia en km entre dos puntos
const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMechanic = (f: any, lat: number, lng: number): Mechanic | null => {
  const coords = f.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [fLng, fLat] = coords;
  const props = f.properties ?? {};
  return {
    id: props.mapbox_id ?? `${fLat},${fLng}`,
    name: props.name ?? props.name_preferred ?? 'Taller sin nombre',
    lat: fLat,
    lng: fLng,
    address: props.full_address ?? props.place_formatted ?? props.address,
    phone: props.metadata?.phone ?? props.phone,
    website: props.metadata?.website,
    brand: Array.isArray(props.brand) ? props.brand[0] : props.brand,
    openingHours: props.metadata?.open_hours?.display,
    distanceKm: distanceKm(lat, lng, fLat, fLng),
  };
};

export const mechanicsService = {
  /**
   * Busca talleres mecánicos cerca de un punto vía Mapbox Search Box API.
   * Combina las categorías auto_repair y tire_repair, deduplica y ordena por distancia.
   */
  async findNearby(lat: number, lng: number, radiusKm = 15): Promise<Mechanic[]> {
    if (!MAPBOX_TOKEN) {
      throw new Error('Falta VITE_MAPBOX_TOKEN. Añádelo en Vercel o .env.local.');
    }

    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      proximity: `${lng},${lat}`,
      limit: '25',
      language: 'es',
    });

    const responses = await Promise.all(
      CATEGORIES.map((cat) =>
        fetch(`${SEARCH_URL}/${cat}?${params}`).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message ?? `Mapbox HTTP ${res.status}`);
          }
          return res.json();
        }),
      ),
    );

    const seen = new Set<string>();
    const mechanics: Mechanic[] = [];
    for (const json of responses) {
      for (const feature of json.features ?? []) {
        const m = toMechanic(feature, lat, lng);
        if (!m || seen.has(m.id) || m.distanceKm > radiusKm) continue;
        seen.add(m.id);
        mechanics.push(m);
      }
    }

    return mechanics.sort((a, b) => a.distanceKm - b.distanceKm);
  },

  /** Geolocalización del navegador. Lanza error si el usuario la deniega. */
  getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada por el navegador'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('No se pudo obtener tu ubicación')),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  },
};
