import { useMemo } from 'react';
import MapGL, { Source, Layer, Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Flag } from 'lucide-react';
import type { TelemetriaPunto } from '../../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Props {
  puntos: TelemetriaPunto[];
  height?: number;
}

/**
 * Pinta la ruta GPS de un viaje de telemetría sobre Mapbox. El trazo se colorea
 * por velocidad (azul lento → rojo rápido) usando una expresión de interpolación
 * de Mapbox sobre la propiedad `velocidad` de cada segmento.
 */
export const TelemetryRouteMap = ({ puntos, height = 360 }: Props) => {
  const gpsPoints = useMemo(
    () =>
      puntos.filter(
        (p): p is TelemetriaPunto & { latitude: number; longitude: number } =>
          p.latitude != null && p.longitude != null,
      ),
    [puntos],
  );

  const geojson = useMemo(() => {
    // Una Feature LineString por segmento, con la velocidad como propiedad
    // para poder colorear el trazo según la rapidez en ese tramo.
    const features = [];
    for (let i = 1; i < gpsPoints.length; i++) {
      const prev = gpsPoints[i - 1];
      const curr = gpsPoints[i];
      features.push({
        type: 'Feature' as const,
        properties: { velocidad: curr.velocidad ?? 0 },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [prev.longitude, prev.latitude],
            [curr.longitude, curr.latitude],
          ],
        },
      });
    }
    return { type: 'FeatureCollection' as const, features };
  }, [gpsPoints]);

  const bounds = useMemo(() => {
    if (gpsPoints.length === 0) return null;
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;
    for (const p of gpsPoints) {
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
    }
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const span = Math.max(maxLng - minLng, maxLat - minLat, 0.005);
    const zoom = Math.max(8, Math.min(15, 9.5 - Math.log2(span + 0.01)));
    return { centerLng, centerLat, zoom };
  }, [gpsPoints]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="bg-fog rounded-[18px] flex items-center justify-center" style={{ height }}>
        <p className="font-text text-graphite" style={{ fontSize: 13 }}>
          Configura VITE_MAPBOX_TOKEN para ver la ruta.
        </p>
      </div>
    );
  }

  if (gpsPoints.length < 2 || !bounds) {
    return (
      <div className="bg-fog rounded-[18px] flex items-center justify-center" style={{ height }}>
        <p className="font-text text-graphite" style={{ fontSize: 13 }}>
          Este viaje no tiene datos GPS suficientes para trazar la ruta.
        </p>
      </div>
    );
  }

  const start = gpsPoints[0];
  const end = gpsPoints[gpsPoints.length - 1];

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid var(--color-silver-mist, #e5e5ea)',
        height,
        position: 'relative',
        background: '#f5f5f7',
      }}
    >
      <MapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: bounds.centerLng,
          latitude: bounds.centerLat,
          zoom: bounds.zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
      >
        <Source id="trip-route" type="geojson" data={geojson}>
          <Layer
            id="trip-route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-width': 4,
              'line-opacity': 0.9,
              // Gradiente por velocidad: 0 km/h azul, 60 ámbar, 120+ rojo
              'line-color': [
                'interpolate',
                ['linear'],
                ['get', 'velocidad'],
                0,
                '#0a84ff',
                60,
                '#ff9500',
                120,
                '#ff3b30',
              ],
            }}
          />
        </Source>

        <Marker longitude={start.longitude} latitude={start.latitude} anchor="center">
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#1a9e3f',
              border: '3px solid #fff',
              boxShadow: '0 2px 8px rgba(0,0,0,.25)',
            }}
            title="Inicio"
          />
        </Marker>

        <Marker longitude={end.longitude} latitude={end.latitude} anchor="bottom">
          <Flag
            className="h-7 w-7"
            color="#d70015"
            fill="#d70015"
            strokeWidth={1.5}
            stroke="#fff"
          />
        </Marker>
      </MapGL>

      <div
        aria-hidden
        className="flex items-center gap-1.5"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(255,255,255,.92)',
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--color-ink)',
          fontWeight: 600,
          backdropFilter: 'blur(4px)',
        }}
      >
        <MapPin className="h-3 w-3" strokeWidth={2} /> Ruta del viaje
      </div>

      {/* Leyenda de velocidad */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          background: 'rgba(255,255,255,.92)',
          padding: '8px 12px',
          borderRadius: 12,
          backdropFilter: 'blur(4px)',
        }}
      >
        <div
          style={{
            width: 120,
            height: 6,
            borderRadius: 3,
            background: 'linear-gradient(90deg, #0a84ff, #ff9500, #ff3b30)',
          }}
        />
        <div
          className="flex justify-between font-mono"
          style={{ fontSize: 9, color: 'var(--color-graphite)', marginTop: 4 }}
        >
          <span>0</span>
          <span>60</span>
          <span>120+ km/h</span>
        </div>
      </div>
    </div>
  );
};
