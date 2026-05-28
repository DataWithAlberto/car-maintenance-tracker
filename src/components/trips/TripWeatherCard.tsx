import { useEffect, useState } from 'react';
import { CloudSun, Loader2, AlertCircle } from 'lucide-react';
import { tripsService } from '../../services/trips.service';

interface Props {
  lat: number | null | undefined;
  lng: number | null | undefined;
  date: string | null | undefined;
  destination?: string | null;
}

type Forecast = Awaited<ReturnType<typeof tripsService.fetchForecast>>;

const iconUrl = (code: string) => `https://openweathermap.org/img/wn/${code}@2x.png`;

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const TripWeatherCard = ({ lat, lng, date, destination }: Props) => {
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat == null || lng == null || !date) return;
    setLoading(true);
    setError(null);
    tripsService
      .fetchForecast(lat, lng, date)
      .then((d) => {
        if (!d) setError('Sin pronóstico disponible. ¿Has configurado VITE_OPENWEATHER_API_KEY?');
        else setData(d);
      })
      .catch(() => setError('No se pudo cargar el pronóstico'))
      .finally(() => setLoading(false));
  }, [lat, lng, date]);

  if (lat == null || lng == null || !date) return null;

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
          § Pronóstico {destination ? `· ${destination}` : ''}
        </span>
        <CloudSun className="h-4 w-4 text-graphite" />
      </div>

      {loading && (
        <div className="flex items-center" style={{ gap: 8, color: '#707070', fontSize: 13 }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Consultando OpenWeather…
        </div>
      )}

      {error && (
        <div
          className="flex items-start"
          style={{ gap: 8, color: '#a64400', fontSize: 12, fontStyle: 'italic' }}
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
          {error}
        </div>
      )}

      {data?.note === 'climate' && (
        <p className="text-graphite" style={{ fontSize: 12, fontStyle: 'italic', margin: 0 }}>
          Faltan más de 5 días para el viaje. El pronóstico se actualizará cuando esté más cerca.
        </p>
      )}

      {data && data.note === 'forecast' && (
        <div className="flex items-center" style={{ gap: 14 }}>
          <img
            src={iconUrl(data.icon)}
            alt={data.condition}
            width={64}
            height={64}
            style={{ marginLeft: -8 }}
          />
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: '-0.5px',
                color: 'var(--color-ink)',
                lineHeight: 1,
              }}
            >
              {data.temp}°
              <span style={{ fontSize: 13, color: '#a1a1a6', marginLeft: 6 }}>
                {data.temp_min}° / {data.temp_max}°
              </span>
            </p>
            <p
              className="text-graphite"
              style={{ fontSize: 13, margin: '6px 0 0', textTransform: 'capitalize' }}
            >
              {cap(data.condition)}
            </p>
          </div>
          <div className="flex flex-col items-end" style={{ gap: 4 }}>
            <span
              className="font-mono"
              style={{ fontSize: 11, color: '#707070', letterSpacing: '.06em' }}
            >
              💨 {data.wind_kmh} km/h
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 11, color: '#707070', letterSpacing: '.06em' }}
            >
              💧 {data.pop}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
