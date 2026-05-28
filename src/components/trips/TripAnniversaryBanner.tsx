import { Link } from 'react-router-dom';
import { CalendarHeart } from 'lucide-react';
import type { Trip } from '../../types';

interface Props {
  trips: Trip[];
}

const findAnniversary = (trips: Trip[]): { trip: Trip; years: number } | null => {
  const today = new Date();
  const todayM = today.getMonth();
  const todayD = today.getDate();
  const todayY = today.getFullYear();

  for (const t of trips) {
    if (!t.start_datetime) continue;
    const d = new Date(t.start_datetime);
    if (Number.isNaN(d.getTime())) continue;
    const years = todayY - d.getFullYear();
    if (years < 1) continue;
    if (d.getMonth() === todayM && d.getDate() === todayD) {
      return { trip: t, years };
    }
  }
  return null;
};

/* Detecta viajes que cumplen "n años hoy" (mes y día coinciden con hoy).
 * Si hay match, muestra un banner que enlaza al detalle del viaje. */
export const TripAnniversaryBanner = ({ trips }: Props) => {
  const match = findAnniversary(trips);

  if (!match) return null;

  const where = match.trip.end_location ?? match.trip.title ?? 'un viaje';

  return (
    <Link
      to="/viajes"
      style={{
        display: 'block',
        background: 'linear-gradient(135deg, rgba(255,90,95,.08) 0%, rgba(255,90,95,.02) 100%)',
        border: '1px solid rgba(255,90,95,.3)',
        borderLeft: '3px solid #FF5A5F',
        borderRadius: 16,
        padding: '14px 18px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform .2s ease, box-shadow .2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,90,95,.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div className="flex items-start" style={{ gap: 14 }}>
        <div
          style={{
            background: '#FF5A5F',
            color: '#fff',
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CalendarHeart className="h-5 w-5" />
        </div>
        <div style={{ flex: 1 }}>
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '.22em',
              color: '#FF5A5F',
              margin: 0,
              fontWeight: 600,
            }}
          >
            ✦ Hace {match.years === 1 ? '1 año' : `${match.years} años`}
          </p>
          <p
            className="text-ink"
            style={{
              margin: '4px 0 0',
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '-0.2px',
            }}
          >
            Fuiste a <span style={{ color: '#FF5A5F' }}>{where}</span> · hoy.
          </p>
          <p className="text-graphite" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Tira de hemeroteca y echa un vistazo a los recuerdos del viaje.
          </p>
        </div>
      </div>
    </Link>
  );
};
