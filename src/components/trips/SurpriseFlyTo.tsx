import { useRef, useState, useCallback, useEffect } from 'react';
import MapGL, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { tripsService } from '../../services/trips.service';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Coord {
  lat: number;
  lng: number;
  label?: string | null;
}

interface Props {
  destination: Coord | null;
  origin?: Coord | null;
  /** Nombres para geocodificar si no hay coordenadas guardadas. */
  destinationName?: string | null;
  originName?: string | null;
}

/* Zoom cinematográfico: arranca viendo el mundo y hace flyTo en picado hasta
 * la ciudad. Al aterrizar aparece el pin + el nombre, y si hay origen se
 * traza la ruta. El botón "Volar al destino" relanza la animación.
 * Si el viaje no tiene coordenadas guardadas, geocodifica el nombre. */
export const SurpriseFlyTo = ({ destination, origin, destinationName, originName }: Props) => {
  const mapRef = useRef<MapRef | null>(null);
  const [landed, setLanded] = useState(false);
  const [flying, setFlying] = useState(false);

  // Coordenadas resueltas: usa las guardadas o geocodifica el nombre
  const [destCoord, setDestCoord] = useState<Coord | null>(destination);
  const [originCoord, setOriginCoord] = useState<Coord | null>(origin ?? null);

  useEffect(() => {
    let cancelled = false;
    if (destination) {
      setDestCoord(destination);
    } else if (destinationName) {
      tripsService.geocodePlace(destinationName).then((c) => {
        if (!cancelled && c) setDestCoord({ ...c, label: destinationName });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [destination, destinationName]);

  useEffect(() => {
    let cancelled = false;
    if (origin) {
      setOriginCoord(origin);
    } else if (originName) {
      tripsService.geocodePlace(originName).then((c) => {
        if (!cancelled && c) setOriginCoord({ ...c, label: originName });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [origin, originName]);

  const runFlight = useCallback(() => {
    const map = mapRef.current;
    if (!map || !destCoord) return;
    setLanded(false);
    setFlying(true);

    // 1) Reposiciona en vista "mundo" sin animar
    map.jumpTo({ center: [10, 25], zoom: 1.4, pitch: 0, bearing: 0 });

    // 2) Tras una pausa breve, vuela en picado hasta la ciudad
    window.setTimeout(() => {
      map.flyTo({
        center: [destCoord.lng, destCoord.lat],
        zoom: 12,
        pitch: 55,
        bearing: -20,
        duration: 6000,
        curve: 1.8, // arco alto = sale "al espacio" y vuelve a bajar
        essential: true,
      });
    }, 700);
  }, [destCoord]);

  const handleLoad = useCallback(() => {
    // Lanza la secuencia automáticamente al montar (si ya hay coords)
    if (destCoord) runFlight();
  }, [runFlight, destCoord]);

  // Si las coords llegan después del onLoad (geocoding async), lanza el vuelo
  useEffect(() => {
    if (destCoord && mapRef.current && !landed && !flying) {
      runFlight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destCoord]);

  const handleMoveEnd = useCallback(() => {
    if (flying) {
      setFlying(false);
      setLanded(true);
    }
  }, [flying]);

  if (!MAPBOX_TOKEN || (!destCoord && !destinationName)) return null;

  const routeGeoJSON =
    originCoord && destCoord && landed
      ? {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [originCoord.lng, originCoord.lat],
              [destCoord.lng, destCoord.lat],
            ],
          },
        }
      : null;

  return (
    <section className="max-w-3xl mx-auto" style={{ padding: '8px 24px 8px', marginBottom: 24 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid var(--color-silver-mist, #e5e5ea)',
          height: 380,
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
          onLoad={handleLoad}
          onMoveEnd={handleMoveEnd}
        >
          {routeGeoJSON && (
            <Source id="flyto-route" type="geojson" data={routeGeoJSON}>
              <Layer
                id="flyto-route-line"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{ 'line-color': '#FF5A5F', 'line-width': 3, 'line-opacity': 0.9 }}
              />
            </Source>
          )}

          {originCoord && landed && (
            <Marker longitude={originCoord.lng} latitude={originCoord.lat} anchor="center">
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid #1d1d1f',
                  boxShadow: '0 2px 8px rgba(0,0,0,.4)',
                }}
              />
            </Marker>
          )}

          {landed && destCoord && (
            <Marker longitude={destCoord.lng} latitude={destCoord.lat} anchor="bottom">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  animation: 'pin-drop .6s cubic-bezier(.16,.84,.36,1) both',
                }}
              >
                {destCoord.label && (
                  <div
                    style={{
                      background: '#FF5A5F',
                      color: '#fff',
                      padding: '5px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '.02em',
                      whiteSpace: 'nowrap',
                      marginBottom: 5,
                      boxShadow: '0 6px 18px rgba(255,90,95,.5)',
                    }}
                  >
                    {destCoord.label}
                  </div>
                )}
                <MapPin
                  className="h-9 w-9"
                  color="#FF5A5F"
                  fill="#FF5A5F"
                  strokeWidth={2}
                  stroke="#fff"
                />
              </div>
            </Marker>
          )}
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
          {flying ? '✈ Despegando…' : `✦ ${destCoord?.label ?? destinationName ?? 'Destino'}`}
        </div>

        {/* Botón para repetir el vuelo */}
        {landed && (
          <button
            type="button"
            onClick={runFlight}
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
            ↻ Volar otra vez
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
