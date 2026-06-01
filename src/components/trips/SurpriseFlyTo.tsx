import { useRef, useState, useEffect } from 'react';
import MapGL, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { tripsService } from '../../services/trips.service';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Stop {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  /** Nombres de las paradas en orden, ej. ["Gijón","Valladolid","Segovia"]. */
  stops: string[];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/* Tour cinematográfico multi-parada: el mapa satélite arranca en vista mundo
 * y vuela parada a parada, trazando la ruta entre cada una y soltando un pin
 * numerado al llegar. Al final encuadra toda la ruta. */
export const SurpriseFlyTo = ({ stops }: Props) => {
  const mapRef = useRef<MapRef | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const [coords, setCoords] = useState<Stop[]>([]);
  const [reached, setReached] = useState(0); // nº de paradas con pin visible
  const [lineCoords, setLineCoords] = useState<[number, number][]>([]);
  const [activeLeg, setActiveLeg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Posición y rumbo del avión mientras recorre un tramo (null = oculto)
  const [plane, setPlane] = useState<{ lng: number; lat: number; bearing: number } | null>(null);

  // Geocodifica todas las paradas en orden
  useEffect(() => {
    let cancelled = false;
    const clean = stops.map((s) => s.trim()).filter(Boolean);
    if (clean.length === 0) return;
    Promise.all(
      clean.map(async (name) => {
        const c = await tripsService.geocodePlace(name);
        return c ? { ...c, name } : null;
      }),
    ).then((results) => {
      if (cancelled) return;
      setCoords(results.filter((r): r is Stop => r !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [stops]);

  const flyToAsync = (map: MapRef, opts: Parameters<MapRef['flyTo']>[0]) =>
    new Promise<void>((resolve) => {
      const onEnd = () => {
        map.off('moveend', onEnd);
        resolve();
      };
      map.on('moveend', onEnd);
      map.flyTo({ essential: true, ...opts });
    });

  // Anima la polilínea del tramo a→b durante `ms`, extendiendo lineCoords
  const animateLeg = (a: Stop, b: Stop, base: [number, number][], ms: number) =>
    new Promise<void>((resolve) => {
      // Rumbo del avión (grados) hacia el destino del tramo
      const bearing = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / ms);
        const head: [number, number] = [lerp(a.lng, b.lng, p), lerp(a.lat, b.lat, p)];
        setLineCoords([...base, head]);
        setPlane({ lng: head[0], lat: head[1], bearing });
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    });

  const runTour = async () => {
    const map = mapRef.current;
    if (!map || coords.length === 0 || runningRef.current) return;
    runningRef.current = true;
    setDone(false);
    setReached(0);
    setLineCoords([]);
    setActiveLeg(null);
    setPlane(null);

    // Vista mundo
    map.jumpTo({ center: [10, 25], zoom: 1.4, pitch: 0, bearing: 0 });
    await delay(600);

    // Entrada en picado a la 1ª parada
    setActiveLeg(coords[0].name);
    await flyToAsync(map, {
      center: [coords[0].lng, coords[0].lat],
      zoom: coords.length > 1 ? 7.5 : 11,
      pitch: 50,
      bearing: -15,
      duration: 5000,
      curve: 1.7,
    });
    setReached(1);
    setLineCoords([[coords[0].lng, coords[0].lat]]);

    // Tramos siguientes
    const accumulated: [number, number][] = [[coords[0].lng, coords[0].lat]];
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1];
      const b = coords[i];
      setActiveLeg(b.name);
      await delay(400);
      const legMs = 3500;
      // Anima línea + vuela a la vez
      void flyToAsync(map, {
        center: [b.lng, b.lat],
        zoom: 7.5,
        pitch: 50,
        bearing: -15,
        duration: legMs,
        curve: 1.4,
      });
      await animateLeg(a, b, accumulated, legMs);
      accumulated.push([b.lng, b.lat]);
      setLineCoords([...accumulated]);
      setReached(i + 1);
    }

    // Encuadre final de toda la ruta
    await delay(500);
    setActiveLeg(null);
    setPlane(null); // el avión "aterriza", se oculta
    if (coords.length > 1) {
      const lngs = coords.map((c) => c.lng);
      const lats = coords.map((c) => c.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 70, duration: 2200, pitch: 30 },
      );
    }
    setDone(true);
    runningRef.current = false;
  };

  // Lanza el tour cuando el mapa está cargado y las coords listas
  const [mapLoaded, setMapLoaded] = useState(false);
  useEffect(() => {
    if (mapLoaded && coords.length > 0 && !runningRef.current && !done) {
      runTour();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, coords]);

  if (!MAPBOX_TOKEN || stops.filter((s) => s.trim()).length === 0) return null;

  const routeGeoJSON = {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: lineCoords },
  };

  return (
    <section className="max-w-3xl mx-auto" style={{ padding: '8px 24px', marginBottom: 24 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid var(--color-silver-mist, #e5e5ea)',
          height: 400,
          background: '#0b1021',
        }}
      >
        <MapGL
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: 10, latitude: 25, zoom: 1.4 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          attributionControl={false}
          interactive={false}
          onLoad={() => setMapLoaded(true)}
        >
          {lineCoords.length >= 2 && (
            <Source id="tour-route" type="geojson" data={routeGeoJSON}>
              <Layer
                id="tour-route-line"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{ 'line-color': '#FF5A5F', 'line-width': 3.5, 'line-opacity': 0.95 }}
              />
            </Source>
          )}

          {/* Avión recorriendo la estela */}
          {plane && (
            <Marker longitude={plane.lng} latitude={plane.lat} anchor="center">
              <div
                style={{
                  fontSize: 26,
                  lineHeight: 1,
                  transform: `rotate(${plane.bearing - 45}deg)`,
                  filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.5))',
                  willChange: 'transform',
                }}
              >
                ✈️
              </div>
            </Marker>
          )}

          {coords.slice(0, reached).map((stop, i) => (
            <Marker key={i} longitude={stop.lng} latitude={stop.lat} anchor="bottom">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  animation: 'pin-drop .6s cubic-bezier(.16,.84,.36,1) both',
                }}
              >
                <div
                  style={{
                    background: '#FF5A5F',
                    color: '#fff',
                    padding: '4px 11px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '.02em',
                    whiteSpace: 'nowrap',
                    marginBottom: 4,
                    boxShadow: '0 6px 18px rgba(255,90,95,.5)',
                  }}
                >
                  {i + 1}. {stop.name}
                </div>
                <MapPin
                  className="h-8 w-8"
                  color="#FF5A5F"
                  fill="#FF5A5F"
                  strokeWidth={2}
                  stroke="#fff"
                />
              </div>
            </Marker>
          ))}
        </MapGL>

        {/* Etiqueta de fase */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(11,16,33,.7)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            fontWeight: 600,
            backdropFilter: 'blur(4px)',
          }}
        >
          {activeLeg
            ? `✈ Volando a ${activeLeg}…`
            : done
              ? `✦ ${coords.map((c) => c.name).join(' → ')}`
              : '✦ Preparando ruta…'}
        </div>

        {/* Repetir */}
        {done && (
          <button
            type="button"
            onClick={() => {
              setDone(false);
              runTour();
            }}
            className="transition-opacity hover:opacity-85"
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              background: 'rgba(255,255,255,.95)',
              color: '#1d1d1f',
              border: 'none',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,.2)',
            }}
          >
            ↻ Repetir ruta
          </button>
        )}

        <style>{`
          @keyframes pin-drop {
            from { opacity: 0; transform: translateY(-24px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </section>
  );
};
