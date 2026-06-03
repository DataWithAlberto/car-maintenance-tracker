import {
  X,
  Route as RouteIcon,
  Fuel,
  Clock,
  Gauge,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Trip } from '../../types';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface Props {
  trip: Trip;
  onClose: () => void;
}

const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const fmtDuration = (min?: number) => {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
};

/* Página de recuerdo: vista editorial de un viaje completado.
 * Mapa estático de Mapbox + stats grandes + álbum si hay fotos. */
export const TripSummaryModal = ({ trip, onClose }: Props) => {
  useEscapeKey(onClose);
  const dateRange =
    trip.start_datetime && trip.end_datetime
      ? `${format(parseISO(trip.start_datetime), 'd MMM', { locale: es })} → ${format(parseISO(trip.end_datetime), 'd MMM yyyy', { locale: es })}`
      : trip.start_datetime
        ? format(parseISO(trip.start_datetime), "d 'de' MMMM yyyy", { locale: es })
        : '';

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const mapUrl =
    MAPBOX_TOKEN && trip.start_lat && trip.end_lat
      ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/path-3+FF5A5F-1(${[
          [trip.start_lng, trip.start_lat],
          [trip.end_lng, trip.end_lat],
        ]
          .map((c) => c.join(','))
          .join(';')})/auto/1200x500@2x?access_token=${MAPBOX_TOKEN}`
      : null;

  const kpis = [
    {
      label: 'Distancia',
      value: trip.total_km ? nf0.format(trip.total_km) : '—',
      unit: 'km',
      icon: <RouteIcon className="h-4 w-4" />,
    },
    {
      label: 'Duración al volante',
      value: fmtDuration(trip.driving_time_minutes),
      unit: '',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: 'Velocidad media',
      value: trip.avg_speed ? nf0.format(trip.avg_speed) : '—',
      unit: 'km/h',
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      label: 'Combustible',
      value: trip.fuel_consumed ? nf1.format(trip.fuel_consumed) : '—',
      unit: 'L',
      icon: <Fuel className="h-4 w-4" />,
    },
  ];

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 9000,
        padding: '40px 16px',
        overflowY: 'auto',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 24,
          maxWidth: 900,
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,.24)',
          overflow: 'hidden',
        }}
      >
        {/* Hero: mapa o gradiente */}
        <div style={{ position: 'relative', height: 240, background: '#fafafa' }}>
          {mapUrl ? (
            <img
              src={mapUrl}
              alt="Mapa del recorrido"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background:
                  'linear-gradient(135deg, rgba(255,90,95,.15) 0%, rgba(255,90,95,.05) 100%)',
              }}
            />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(255,255,255,.95)',
              border: 'none',
              borderRadius: 999,
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Editorial header */}
        <div style={{ padding: '28px 32px 0' }}>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              letterSpacing: '.22em',
              color: '#FF5A5F',
              fontWeight: 600,
            }}
          >
            ✦ Recuerdo del viaje · {dateRange}
          </span>
          <h2
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(36px, 5vw, 56px)',
              letterSpacing: '-1.5px',
              lineHeight: 1,
              margin: '14px 0 8px',
              background: 'linear-gradient(135deg, #1d1d1f 0%, #FF5A5F 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {trip.title ?? trip.end_location ?? 'Viaje'}
          </h2>
          <p
            className="text-graphite flex items-center"
            style={{ fontSize: 14, gap: 6, margin: 0 }}
          >
            <MapPin className="h-3.5 w-3.5" />
            {trip.start_location ?? '—'} → {trip.end_location ?? '—'}
          </p>
        </div>

        {/* KPI grid */}
        <div
          style={{
            padding: '24px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
          }}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                border: '1px solid var(--color-silver-mist, #e5e5ea)',
                borderRadius: 14,
                padding: '16px 18px',
              }}
            >
              <div className="flex items-center text-graphite" style={{ gap: 6, marginBottom: 6 }}>
                {k.icon}
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 10, letterSpacing: '.18em' }}
                >
                  {k.label}
                </span>
              </div>
              <p style={{ margin: 0 }}>
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: 'Inter, var(--font-sf-pro-display)',
                    fontWeight: 700,
                    fontSize: 28,
                    letterSpacing: '-0.5px',
                    color: 'var(--color-ink)',
                  }}
                >
                  {k.value}
                </span>
                {k.unit && (
                  <span style={{ fontSize: 13, color: '#a1a1a6', marginLeft: 5 }}>{k.unit}</span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Notas + footer */}
        {trip.notes && (
          <div style={{ padding: '0 32px 24px' }}>
            <span
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 10, letterSpacing: '.18em' }}
            >
              § Notas
            </span>
            <p
              className="text-ink"
              style={{
                fontSize: 15,
                lineHeight: 1.5,
                marginTop: 6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {trip.notes}
            </p>
          </div>
        )}

        <div
          style={{
            padding: '16px 32px 28px',
            borderTop: '1px solid var(--color-silver-mist, #e5e5ea)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span
            className="font-mono text-graphite flex items-center"
            style={{ fontSize: 11, letterSpacing: '.08em', gap: 6 }}
          >
            <ImageIcon className="h-3 w-3" />
            Las fotos del viaje viven en la Galería · filtra por viaje
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--color-ink, #1d1d1f)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
