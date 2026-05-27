import { useMemo } from 'react';
import { MapPin, Flag, Bed, Utensils, Landmark, Ticket, Bus, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { TripActivityCard } from './TripActivityCard';
import type { Trip, TripActivity, TripActivityType, CreateTripActivityInput } from '../../types';

interface Props {
  trip: Trip;
  bookings: TripActivity[];
  onAddBooking: () => void;
  onDeleteBooking: (id: string) => Promise<void>;
  onSaveBooking?: (id: string, patch: Partial<CreateTripActivityInput>) => Promise<void>;
  userId?: string | null;
  vehicleId?: string | null;
}

const TYPE_ICON: Record<TripActivityType, LucideIcon> = {
  lodging: Bed,
  restaurant: Utensils,
  museum: Landmark,
  activity: Ticket,
  ticket: Ticket,
  transport: Bus,
  other: MapPin,
};

const fmtDay = (iso?: string) =>
  iso ? format(parseISO(iso), "d MMM 'de' yyyy", { locale: es }) : null;

interface TimelineNodeProps {
  icon: LucideIcon;
  ringColor: string;
  fillColor: string;
  isLast?: boolean;
  children: React.ReactNode;
}

const TimelineNode = ({
  icon: Icon,
  ringColor,
  fillColor,
  isLast,
  children,
}: TimelineNodeProps) => (
  <div style={{ position: 'relative', paddingLeft: 56, paddingBottom: isLast ? 0 : 24 }}>
    {/* Connector line */}
    {!isLast && (
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 19,
          top: 40,
          bottom: 0,
          width: 2,
          background: 'var(--color-silver-mist)',
          borderRadius: 999,
        }}
      />
    )}
    {/* Node */}
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 40,
        height: 40,
        borderRadius: 999,
        background: fillColor,
        border: `2px solid ${ringColor}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} style={{ color: ringColor }} />
    </span>
    {children}
  </div>
);

const MilestoneCard = ({
  label,
  place,
  date,
  accent,
}: {
  label: string;
  place?: string;
  date?: string;
  accent: string;
}) => (
  <div
    style={{
      padding: '6px 0 4px',
    }}
  >
    <span
      className="font-mono uppercase"
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '.18em',
        color: accent,
      }}
    >
      {label}
    </span>
    <p
      className="text-ink"
      style={{
        fontFamily: 'Inter, var(--font-sf-pro-display)',
        fontWeight: 600,
        fontSize: 18,
        letterSpacing: '-0.3px',
        marginTop: 4,
      }}
    >
      {place ?? 'Por definir'}
    </p>
    {date && (
      <p className="text-graphite font-mono" style={{ fontSize: 12, marginTop: 2 }}>
        {date}
      </p>
    )}
  </div>
);

export const TripTimeline = ({
  trip,
  bookings,
  onAddBooking,
  onDeleteBooking,
  onSaveBooking,
  userId,
  vehicleId,
}: Props) => {
  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => {
        const da = a.start_datetime ? Date.parse(a.start_datetime) : Number.MAX_SAFE_INTEGER;
        const db = b.start_datetime ? Date.parse(b.start_datetime) : Number.MAX_SAFE_INTEGER;
        return da - db;
      }),
    [bookings],
  );

  const startDate = fmtDay(trip.start_date ?? trip.start_datetime);
  const endDate = fmtDay(trip.end_date ?? trip.end_datetime);
  const hasEnd = Boolean(endDate || trip.end_location);

  return (
    <div
      className="bg-snow"
      style={{
        border: '1px solid var(--color-silver-mist)',
        borderRadius: 24,
        padding: '24px 26px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <span
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 11, letterSpacing: '.16em' }}
        >
          § Itinerario
        </span>
        <span className="font-mono text-mist" style={{ fontSize: 11 }}>
          {sortedBookings.length} {sortedBookings.length === 1 ? 'parada' : 'paradas'}
        </span>
      </div>

      {/* Salida */}
      <TimelineNode icon={Flag} ringColor="#0071e3" fillColor="rgba(0,113,227,0.10)">
        <MilestoneCard
          label="Salida"
          place={trip.start_location ?? 'Origen por definir'}
          date={startDate ?? undefined}
          accent="#0071e3"
        />
      </TimelineNode>

      {/* Reservas */}
      {sortedBookings.map((b) => {
        const Icon = TYPE_ICON[b.type] ?? MapPin;
        return (
          <TimelineNode
            key={b.id}
            icon={Icon}
            ringColor="var(--color-ink)"
            fillColor="var(--color-snow)"
          >
            <TripActivityCard
              activity={b}
              onDelete={onDeleteBooking}
              onSave={onSaveBooking}
              userId={userId}
              vehicleId={vehicleId}
            />
          </TimelineNode>
        );
      })}

      {/* Add booking */}
      <TimelineNode icon={Plus} ringColor="#a1a1a6" fillColor="var(--color-fog)">
        <button
          type="button"
          onClick={onAddBooking}
          className="w-full transition-colors hover:bg-fog text-left"
          style={{
            background: 'var(--surface-card)',
            border: '1.5px dashed var(--color-silver-mist)',
            borderRadius: 18,
            padding: '16px 18px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-graphite)',
            cursor: 'pointer',
          }}
        >
          + Añadir parada (alojamiento, actividad, restaurante…)
        </button>
      </TimelineNode>

      {/* Llegada */}
      {hasEnd && (
        <TimelineNode icon={Flag} ringColor="#1cb05c" fillColor="rgba(28,176,92,0.10)" isLast>
          <MilestoneCard
            label="Llegada"
            place={trip.end_location}
            date={endDate ?? undefined}
            accent="#1cb05c"
          />
        </TimelineNode>
      )}
    </div>
  );
};
