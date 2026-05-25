import { useMemo, useState } from 'react';
import { Sparkles, Wallet, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingCard } from './BookingCard';
import { TripChecklist } from './TripChecklist';
import { TripStatusBadge } from './TripStatusBadge';
import { ConfirmTripModal } from './ConfirmTripModal';
import type { Trip, TripBooking, TripChecklistItem, TripBookingType } from '../../types';
import { BOOKING_TYPE_LABEL } from '../../utils/bookingTheme';

interface Props {
  trip: Trip;
  bookings: TripBooking[];
  checklist: TripChecklistItem[];
  onAddBooking: () => void;
  onDeleteBooking: (id: string) => Promise<void>;
  onAddChecklist: (text: string) => Promise<void>;
  onToggleChecklist: (id: string, done: boolean) => Promise<void>;
  onDeleteChecklist: (id: string) => Promise<void>;
  onConfirm: (keepBookingIds: string[]) => Promise<void>;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy', { locale: es });

export const TripPlanningBoard = ({
  trip,
  bookings,
  checklist,
  onAddBooking,
  onDeleteBooking,
  onAddChecklist,
  onToggleChecklist,
  onDeleteChecklist,
  onConfirm,
}: Props) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<TripBookingType, TripBooking[]>();
    bookings.forEach((b) => {
      const arr = map.get(b.type) ?? [];
      arr.push(b);
      map.set(b.type, arr);
    });
    return map;
  }, [bookings]);

  const totalEstimate = useMemo(() => bookings.reduce((s, b) => s + (b.price ?? 0), 0), [bookings]);
  const budget = trip.estimated_budget ?? 0;
  const overBudget = budget > 0 && totalEstimate > budget;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div
        className="bg-snow"
        style={{
          border: '1px solid var(--color-silver-mist)',
          borderLeft: '3px solid #febb02',
          borderRadius: 18,
          padding: '24px 28px',
        }}
      >
        <div className="flex items-start justify-between flex-wrap" style={{ gap: 14 }}>
          <div>
            <TripStatusBadge status="planning" />
            <h2
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: '-0.8px',
                lineHeight: 1.1,
                margin: '10px 0 4px',
              }}
            >
              {trip.title ?? trip.end_location ?? 'Nuevo viaje'}
            </h2>
            <p className="text-graphite" style={{ fontSize: 14 }}>
              {trip.end_location ?? 'Destino por definir'}
            </p>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={bookings.length === 0}
            className="transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #1d1d1f 0%, #2d2d30 100%)',
              color: '#fff',
              borderRadius: 999,
              border: 'none',
              padding: '12px 22px',
              fontWeight: 600,
              fontSize: 14,
              cursor: bookings.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles className="h-4 w-4" />
            Confirmar y lanzar viaje
          </button>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 14, marginTop: 18 }}>
          <div>
            <dt
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 10, letterSpacing: '.16em' }}
            >
              <Calendar className="inline h-3 w-3 mr-1" strokeWidth={1.6} /> Fechas
            </dt>
            <dd className="text-ink" style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
              {trip.start_date && trip.end_date
                ? `${fmtDate(trip.start_date)} → ${fmtDate(trip.end_date)}`
                : trip.start_date
                  ? fmtDate(trip.start_date)
                  : 'Por decidir'}
            </dd>
          </div>
          <div>
            <dt
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 10, letterSpacing: '.16em' }}
            >
              <Wallet className="inline h-3 w-3 mr-1" strokeWidth={1.6} /> Presupuesto
            </dt>
            <dd style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
              {budget > 0 ? (
                <span style={{ color: overBudget ? '#b64400' : 'var(--color-ink)' }}>
                  {fmtMoney(totalEstimate)}
                  <span style={{ color: '#a1a1a6' }}> / {fmtMoney(budget)}</span>
                </span>
              ) : (
                <span className="text-graphite">Sin definir</span>
              )}
            </dd>
          </div>
          <div>
            <dt
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 10, letterSpacing: '.16em' }}
            >
              Ideas guardadas
            </dt>
            <dd className="text-ink" style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
              {bookings.length} {bookings.length === 1 ? 'propuesta' : 'propuestas'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Grupos de candidatos */}
      {[...grouped.entries()].map(([type, list]) => (
        <section
          key={type}
          className="bg-snow"
          style={{
            border: '1px solid var(--color-silver-mist)',
            borderRadius: 18,
            padding: '20px 24px',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 11, letterSpacing: '.16em' }}
            >
              §{' '}
              {type === 'lodging'
                ? 'Alojamientos en la mira'
                : `${BOOKING_TYPE_LABEL[type]} en estudio`}
            </span>
            <span className="font-mono text-graphite" style={{ fontSize: 11 }}>
              {list.length} {list.length === 1 ? 'opción' : 'opciones'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginTop: 14 }}>
            {list.map((b) => (
              <BookingCard key={b.id} booking={b} onDelete={onDeleteBooking} />
            ))}
          </div>
        </section>
      ))}

      <button
        onClick={onAddBooking}
        className="w-full transition-colors hover:bg-fog"
        style={{
          background: '#fff',
          border: '1.5px dashed var(--color-silver-mist)',
          borderRadius: 18,
          padding: '18px',
          fontSize: 14,
          fontWeight: 500,
          color: '#707070',
          cursor: 'pointer',
        }}
      >
        ＋ Añadir candidato (alojamiento, actividad…)
      </button>

      <TripChecklist
        items={checklist}
        onAdd={onAddChecklist}
        onToggle={onToggleChecklist}
        onDelete={onDeleteChecklist}
      />

      {showConfirm && (
        <ConfirmTripModal
          bookings={bookings}
          onClose={() => setShowConfirm(false)}
          onConfirm={async (ids) => {
            await onConfirm(ids);
            setShowConfirm(false);
          }}
        />
      )}
    </div>
  );
};
