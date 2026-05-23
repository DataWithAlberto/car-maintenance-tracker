import { useMemo } from 'react';
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import type { Mechanic } from '../../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface MechanicsMapProps {
  origin: { lat: number; lng: number } | null;
  mechanics: Mechanic[];
  recommendedIds?: string[];
  selectedId?: string;
  onMechanicClick?: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MechanicsMap = ({
  origin,
  mechanics,
  recommendedIds = [],
  selectedId,
  onMechanicClick,
  className = '',
  style,
}: MechanicsMapProps) => {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const initialView = useMemo(() => {
    if (origin) return { longitude: origin.lng, latitude: origin.lat, zoom: 12 };
    // Centro de España por defecto
    return { longitude: -3.70379, latitude: 40.416775, zoom: 5 };
  }, [origin]);

  const hovered = hoverId ? mechanics.find((m) => m.id === hoverId) : null;

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`w-full rounded-card overflow-hidden flex flex-col items-center justify-center gap-2 bg-fog ${className}`}
        style={{ minHeight: 320, padding: 24, textAlign: 'center', ...style }}
      >
        <MapPin size={28} strokeWidth={1.4} style={{ color: '#c7c7cc' }} />
        <p className="font-mono text-graphite" style={{ fontSize: 11, letterSpacing: '.06em' }}>
          Añade VITE_MAPBOX_TOKEN en .env.local
        </p>
        <a
          href="https://account.mapbox.com"
          target="_blank"
          rel="noreferrer"
          className="text-azure"
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          Obtener token gratuito →
        </a>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-card overflow-hidden ${className}`}
      style={{ minHeight: 320, position: 'relative', ...style }}
    >
      <MapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialView}
        style={{ width: '100%', height: '100%', minHeight: 320 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {origin && (
          <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
            <div
              title="Tu ubicación"
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#0071e3',
                border: '3px solid #fff',
                boxShadow: '0 0 0 3px rgba(0,113,227,.3)',
              }}
            />
          </Marker>
        )}

        {mechanics.map((m) => {
          const isRecommended = recommendedIds.includes(m.id);
          const isSelected = m.id === selectedId;
          const color = isRecommended ? '#b64400' : '#1d1d1f';
          const size = isSelected ? 16 : isRecommended ? 14 : 11;
          return (
            <Marker
              key={m.id}
              longitude={m.lng}
              latitude={m.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onMechanicClick?.(m.id);
              }}
            >
              <div
                onMouseEnter={() => setHoverId(m.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: color,
                  border: '2px solid #fff',
                  boxShadow: isSelected ? `0 0 0 3px rgba(182,68,0,0.4)` : 'none',
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                }}
              />
            </Marker>
          );
        })}

        {hovered && (
          <Popup
            longitude={hovered.lng}
            latitude={hovered.lat}
            anchor="bottom"
            offset={14}
            closeButton={false}
            closeOnClick={false}
            className="mechanic-popup"
          >
            <div className="font-text" style={{ fontSize: 12, lineHeight: 1.35 }}>
              <strong>{hovered.name}</strong>
              <br />
              {hovered.distanceKm.toFixed(1)} km
              {hovered.brand ? (
                <>
                  <br />
                  Especialista: {hovered.brand}
                </>
              ) : null}
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
};
