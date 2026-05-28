import { useEffect, useState } from 'react';
import MapGL, { Source, Layer, Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Coord {
  lat: number;
  lng: number;
  label?: string | null;
}

interface Props {
  origin: Coord | null;
  destination: Coord | null;
}

/* Mapa estilizado del trayecto origen → destino con efecto de trazo animado.
 * Si no hay coordenadas o token, no se renderiza. */
export const SurpriseRouteMap = ({ origin, destination }: Props) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!origin || !destination) return;
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / 2500);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [origin, destination]);

  if (!MAPBOX_TOKEN || !origin || !destination) return null;

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const currentLng = lerp(origin.lng, destination.lng, progress);
  const currentLat = lerp(origin.lat, destination.lat, progress);

  const minLng = Math.min(origin.lng, destination.lng);
  const maxLng = Math.max(origin.lng, destination.lng);
  const minLat = Math.min(origin.lat, destination.lat);
  const maxLat = Math.max(origin.lat, destination.lat);
  const padding = 0.4;
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const span = Math.max(maxLng - minLng, maxLat - minLat) + padding;
  const zoom = Math.max(4, Math.min(11, 8.5 - Math.log2(span + 0.1)));

  return (
    <section className="max-w-3xl mx-auto" style={{ padding: '0 24px 8px', marginBottom: 24 }}>
      <div
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid var(--color-silver-mist, #e5e5ea)',
          height: 320,
          position: 'relative',
          background: '#f5f5f7',
        }}
      >
        <MapGL
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: centerLng, latitude: centerLat, zoom }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          attributionControl={false}
          interactive={false}
        >
          <Source
            id="route-line"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [origin.lng, origin.lat],
                  [currentLng, currentLat],
                ],
              },
            }}
          >
            <Layer
              id="route-line-layer"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': '#FF5A5F',
                'line-width': 3.5,
                'line-opacity': 0.9,
              }}
            />
          </Source>

          <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#1d1d1f',
                border: '3px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,.2)',
              }}
            />
          </Marker>

          <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: `scale(${0.7 + progress * 0.3})`,
                transition: 'transform .3s ease',
              }}
            >
              <div
                style={{
                  background: '#FF5A5F',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.04em',
                  whiteSpace: 'nowrap',
                  marginBottom: 4,
                  opacity: progress > 0.95 ? 1 : 0,
                  transition: 'opacity .3s ease',
                  boxShadow: '0 4px 12px rgba(255,90,95,.4)',
                }}
              >
                {destination.label ?? 'Destino'}
              </div>
              <MapPin
                className="h-7 w-7"
                color="#FF5A5F"
                fill="#FF5A5F"
                strokeWidth={2}
                stroke="#fff"
              />
            </div>
          </Marker>
        </MapGL>

        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(255,255,255,.92)',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: '#FF5A5F',
            fontWeight: 600,
            backdropFilter: 'blur(4px)',
          }}
        >
          ✦ El viaje
        </div>
      </div>
    </section>
  );
};
