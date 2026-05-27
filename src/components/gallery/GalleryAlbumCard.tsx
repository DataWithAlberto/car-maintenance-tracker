import { Images, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TripAlbum } from '../../types';
import { TripStatusBadge } from '../trips/TripStatusBadge';

interface Props {
  album: TripAlbum;
  onOpen: (album: TripAlbum) => void;
}

const fmtRange = (start?: string, end?: string): string | null => {
  if (!start && !end) return null;
  const fmt = (iso: string) => format(parseISO(iso), "d MMM ''yy", { locale: es });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt((start ?? end) as string);
};

export const GalleryAlbumCard = ({ album, onOpen }: Props) => {
  const { trip, cover_url, photo_count } = album;
  const range = fmtRange(
    trip.start_date ?? trip.start_datetime,
    trip.end_date ?? trip.end_datetime,
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(album)}
      className="group focus-ring"
      style={{
        textAlign: 'left',
        background: 'var(--surface-card)',
        border: '1px solid var(--color-silver-mist)',
        borderRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div
        style={{
          aspectRatio: '4 / 3',
          background: cover_url
            ? `center / cover no-repeat url(${cover_url})`
            : 'linear-gradient(135deg, var(--color-fog) 0%, var(--color-silver-mist) 100%)',
          position: 'relative',
        }}
      >
        {!cover_url && (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ color: 'var(--color-graphite)' }}
          >
            <Images className="w-10 h-10" strokeWidth={1.2} />
          </div>
        )}
        <span
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
          }}
        >
          <TripStatusBadge status={trip.status} />
        </span>
        <span
          className="font-mono"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: 'rgba(0,0,0,.6)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            letterSpacing: '.06em',
          }}
        >
          <Images className="w-3 h-3" strokeWidth={2} />
          {photo_count}
        </span>
      </div>

      <div style={{ padding: '16px 18px 18px', display: 'grid', gap: 6 }}>
        <h3
          className="text-ink"
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          {trip.title ?? trip.end_location ?? 'Viaje sin título'}
        </h3>

        {trip.end_location && (
          <span className="text-graphite inline-flex items-center" style={{ gap: 5, fontSize: 13 }}>
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.6} />
            {trip.end_location}
          </span>
        )}

        {range && (
          <span
            className="font-mono text-graphite"
            style={{ fontSize: 11, letterSpacing: '.06em' }}
          >
            {range}
          </span>
        )}
      </div>
    </button>
  );
};
