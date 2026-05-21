import type { Mechanic } from '../types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Haversine — distancia en km entre dos puntos
const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildAddress = (tags: Record<string, any>): string | undefined => {
  const parts = [
    [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
    tags['addr:postcode'],
    tags['addr:city'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
};

export const mechanicsService = {
  /**
   * Busca talleres mecánicos cerca de un punto vía OpenStreetMap Overpass API.
   * radiusKm por defecto 15 km. Devuelve ordenados por distancia.
   */
  async findNearby(lat: number, lng: number, radiusKm = 15): Promise<Mechanic[]> {
    const radius = Math.round(radiusKm * 1000);
    const query = `
      [out:json][timeout:25];
      (
        node["shop"="car_repair"](around:${radius},${lat},${lng});
        way["shop"="car_repair"](around:${radius},${lat},${lng});
        node["shop"="tyres"](around:${radius},${lat},${lng});
        way["shop"="tyres"](around:${radius},${lat},${lng});
      );
      out center tags;
    `;

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error('No se pudo consultar OpenStreetMap');

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements: any[] = json.elements ?? [];

    const mechanics: Mechanic[] = elements
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (elLat == null || elLng == null) return null;
        const tags = el.tags ?? {};
        return {
          id: `${el.type}/${el.id}`,
          name: tags.name ?? 'Taller sin nombre',
          lat: elLat,
          lng: elLng,
          address: buildAddress(tags),
          phone: tags.phone ?? tags['contact:phone'],
          website: tags.website ?? tags['contact:website'],
          brand: tags.brand,
          openingHours: tags.opening_hours,
          distanceKm: distanceKm(lat, lng, elLat, elLng),
        } as Mechanic;
      })
      .filter((m): m is Mechanic => m !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return mechanics;
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
