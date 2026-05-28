import { useEffect, useState } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import { tripsService } from '../../services/trips.service';

interface Props {
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
}

export const TripDistanceCard = ({ startLat, startLng, endLat, endLng }: Props) => {
  const [data, setData] = useState<{ distance_km: number; duration_min: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const hasCoords = startLat != null && startLng != null && endLat != null && endLng != null;

  useEffect(() => {
    if (!hasCoords) return;
    setLoading(true);
    tripsService
      .fetchDirections(startLat!, startLng!, endLat!, endLng!)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startLat, startLng, endLat, endLng, hasCoords]);

  if (!hasCoords) return null;

  const fmtDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  };

  return (
    <div
      style={{
        background: 'var(--surface-card, #fff)',
        border: '1px solid var(--color-silver-mist)',
        borderRadius: 14,
        padding: '14px 18px',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 10, letterSpacing: '.18em' }}
        >
          § Trayecto en coche
        </span>
        <Navigation className="h-4 w-4 text-graphite" />
      </div>

      {loading && (
        <div className="flex items-center" style={{ gap: 8, color: '#707070', fontSize: 13 }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Calculando ruta…
        </div>
      )}

      {data && !loading && (
        <div className="flex items-baseline" style={{ gap: 20, flexWrap: 'wrap' }}>
          <div>
            <span
              className="tabular-nums"
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: '-0.5px',
                color: 'var(--color-ink)',
              }}
            >
              {data.distance_km}
            </span>
            <span style={{ fontSize: 13, color: '#a1a1a6', marginLeft: 5 }}>km</span>
          </div>
          <div>
            <span
              className="tabular-nums"
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: '-0.3px',
                color: 'var(--color-ink)',
              }}
            >
              {fmtDuration(data.duration_min)}
            </span>
            <span
              className="text-graphite"
              style={{ fontSize: 11, marginLeft: 6, fontStyle: 'italic' }}
            >
              sin tráfico
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
