import { ExternalLink, MapPin, Star, Calendar, Hash, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TripBooking } from '../../types';
import { getBookingTheme, BOOKING_TYPE_LABEL } from '../../utils/bookingTheme';

interface BookingCardProps {
  booking: TripBooking;
  onDelete?: (id: string) => void;
}

const fmtMoney = (n: number, c = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: c }).format(n);

const fmtDate = (iso: string) => format(parseISO(iso), 'd MMM · HH:mm', { locale: es });

export const BookingCard = ({ booking, onDelete }: BookingCardProps) => {
  const t = getBookingTheme(booking.provider);
  const isLodging = booking.type === 'lodging';
  const rating = booking.metadata?.rating;

  return (
    <article
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderLeft: `3px solid ${t.accent}`,
        borderRadius: t.radius,
        fontFamily: t.fontFamily,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        transition: 'transform .15s ease, box-shadow .15s ease',
      }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center" style={{ gap: 8 }}>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: '.16em', color: t.textMuted }}
          >
            {BOOKING_TYPE_LABEL[booking.type]}
          </span>

          <span
            style={{
              padding: '3px 8px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.04em',
              color:
                t.badgeShape === 'rounded'
                  ? t.accent
                  : t.onAccent === '#ffffff'
                    ? '#fff'
                    : t.accent,
              background: t.badgeShape === 'rounded' ? 'transparent' : t.accent,
              border: t.badgeShape === 'rounded' ? `1px solid ${t.accent}` : 'none',
              borderRadius: t.badgeShape === 'pill' ? 999 : t.badgeShape === 'square' ? 3 : 999,
              textTransform: 'uppercase',
            }}
          >
            {t.label}
          </span>
        </div>

        {onDelete && (
          <button
            type="button"
            aria-label="Eliminar reserva"
            onClick={() => onDelete(booking.id)}
            className="text-graphite hover:text-[#b64400] transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.6} />
          </button>
        )}
      </header>

      <div className="flex items-start justify-between gap-3">
        <h3
          style={{
            fontFamily: t.fontFamily,
            fontWeight: booking.provider === 'airbnb' ? 600 : 700,
            fontSize: 18,
            lineHeight: 1.25,
            color: t.textPrimary,
            letterSpacing: booking.provider === 'airbnb' ? 0 : '-0.2px',
            margin: 0,
          }}
        >
          {booking.title}
        </h3>

        {rating != null &&
          isLodging &&
          (booking.provider === 'booking' ? (
            <span
              style={{
                background: t.accent,
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                padding: '4px 8px',
                borderRadius: 4,
                borderTopRightRadius: 0,
                minWidth: 36,
                textAlign: 'center',
              }}
            >
              {rating.toFixed(1)}
            </span>
          ) : (
            <span className="flex items-center" style={{ gap: 4, color: t.textPrimary }}>
              <Star className="h-3.5 w-3.5" fill={t.accent} stroke={t.accent} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{rating.toFixed(2)}</span>
            </span>
          ))}
      </div>

      <dl className="flex flex-wrap" style={{ gap: '6px 16px', color: t.textMuted, fontSize: 13 }}>
        {booking.metadata?.address && (
          <div className="flex items-center" style={{ gap: 6 }}>
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.6} />
            <span>{booking.metadata.address}</span>
          </div>
        )}
        <div className="flex items-center" style={{ gap: 6 }}>
          <Calendar className="h-3.5 w-3.5" strokeWidth={1.6} />
          <span>
            {fmtDate(booking.start_datetime)}
            {booking.end_datetime && ` → ${fmtDate(booking.end_datetime)}`}
          </span>
        </div>
        {booking.confirmation_code && (
          <div className="flex items-center" style={{ gap: 6 }}>
            <Hash className="h-3.5 w-3.5" strokeWidth={1.6} />
            <span className="font-mono" style={{ fontSize: 12 }}>
              {booking.confirmation_code}
            </span>
          </div>
        )}
      </dl>

      <footer
        className="flex items-center justify-between"
        style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, marginTop: 4 }}
      >
        {booking.price != null ? (
          <span style={{ color: t.textPrimary, fontWeight: 700, fontSize: 16 }}>
            {fmtMoney(booking.price, booking.currency ?? 'EUR')}
          </span>
        ) : (
          <span />
        )}

        {booking.booking_url && (
          <a
            href={booking.booking_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center transition-opacity hover:opacity-85"
            style={{
              gap: 6,
              background: booking.provider === 'booking' ? t.onAccent : t.accent,
              color: booking.provider === 'booking' ? t.accent : t.onAccent,
              padding: '8px 14px',
              borderRadius: t.badgeShape === 'rounded' ? 999 : 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Ver reserva
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        )}
      </footer>
    </article>
  );
};
