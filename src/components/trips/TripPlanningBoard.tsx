import { useMemo, useState } from 'react';
import { Sparkles, Calendar, Printer } from 'lucide-react';
import { printItinerary } from '../../utils/printItinerary';
import { TripWeatherCard } from './TripWeatherCard';
import { TripDistanceCard } from './TripDistanceCard';
import { TripAISuggestionsButton } from './TripAISuggestionsButton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { TripTimeline } from './TripTimeline';
import { TripChecklist } from './TripChecklist';
import { TripBudgetCard } from './TripBudgetCard';
import { TripStatusPills } from './TripStatusPills';
import { TripVehicleSummaryCard } from './TripVehicleSummaryCard';
import { TripOBD2SnapshotCard } from './TripOBD2SnapshotCard';
import { TripStatusBadge } from './TripStatusBadge';
import { ConfirmTripModal } from './ConfirmTripModal';
import type {
  Trip,
  TripActivity,
  TripChecklistItem,
  CreateTripActivityInput,
  Vehicle,
} from '../../types';

interface Props {
  trip: Trip;
  bookings: TripActivity[];
  checklist: TripChecklistItem[];
  onAddBooking: () => void;
  onAddSuggestion?: (data: CreateTripActivityInput) => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
  onSaveBooking?: (id: string, patch: Partial<CreateTripActivityInput>) => Promise<void>;
  onAddChecklist: (text: string) => Promise<void>;
  onToggleChecklist: (id: string, done: boolean) => Promise<void>;
  onDeleteChecklist: (id: string) => Promise<void>;
  onConfirm: (keepBookingIds: string[]) => Promise<void>;
  userId?: string | null;
  vehicleId?: string | null;
  vehicle?: Vehicle | null;
}

const fmtDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy', { locale: es });

export const TripPlanningBoard = ({
  trip,
  bookings,
  checklist,
  onAddBooking,
  onAddSuggestion,
  onDeleteBooking,
  onSaveBooking,
  onAddChecklist,
  onToggleChecklist,
  onDeleteChecklist,
  onConfirm,
  userId = null,
  vehicleId = null,
  vehicle = null,
}: Props) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const totalEstimate = useMemo(() => bookings.reduce((s, b) => s + (b.price ?? 0), 0), [bookings]);
  const budget = trip.estimated_budget ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="bg-snow"
        style={{
          border: '1px solid var(--color-silver-mist)',
          borderRadius: 24,
          padding: '24px 28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-start justify-between flex-wrap" style={{ gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <TripStatusBadge status="planning" />
            <h2
              className="text-ink"
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: '-0.8px',
                lineHeight: 1.1,
                margin: '12px 0 6px',
              }}
            >
              {trip.title ?? trip.end_location ?? 'Nuevo viaje'}
            </h2>
            <p
              className="text-graphite inline-flex items-center"
              style={{ fontSize: 14, gap: 8, flexWrap: 'wrap' }}
            >
              {trip.end_location && <span>{trip.end_location}</span>}
              {(trip.start_date || trip.end_date) && (
                <>
                  <span className="text-mist">·</span>
                  <span className="inline-flex items-center" style={{ gap: 4 }}>
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.6} />
                    {trip.start_date && trip.end_date
                      ? `${fmtDate(trip.start_date)} → ${fmtDate(trip.end_date)}`
                      : trip.start_date
                        ? fmtDate(trip.start_date)
                        : ''}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
            {onAddSuggestion && (
              <TripAISuggestionsButton
                destination={trip.end_location}
                startDate={trip.start_date ?? trip.start_datetime}
                endDate={trip.end_date ?? trip.end_datetime}
                onAdd={onAddSuggestion}
              />
            )}
            <button
              type="button"
              onClick={() => printItinerary({ trip, activities: bookings, checklist })}
              disabled={bookings.length === 0 && checklist.length === 0}
              className="transition-colors hover:bg-fog disabled:opacity-40"
              style={{
                background: 'var(--surface-card)',
                color: 'var(--color-ink)',
                borderRadius: 999,
                border: '1px solid var(--color-silver-mist)',
                padding: '11px 18px',
                fontWeight: 500,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Printer className="h-4 w-4" />
              Imprimir · PDF
            </button>
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
        </div>
      </div>

      {/* Two-column body: Timeline + Sidebar */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: '1fr',
          gap: 20,
        }}
      >
        <div className="grid lg:grid-cols-[1fr_320px]" style={{ gap: 20, alignItems: 'start' }}>
          {/* Main column */}
          <div className="space-y-5" style={{ minWidth: 0 }}>
            <TripTimeline
              trip={trip}
              bookings={bookings}
              onAddBooking={onAddBooking}
              onDeleteBooking={onDeleteBooking}
              onSaveBooking={onSaveBooking}
              userId={userId}
              vehicleId={vehicleId}
            />

            <TripChecklist
              items={checklist}
              onAdd={onAddChecklist}
              onToggle={onToggleChecklist}
              onDelete={onDeleteChecklist}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky" style={{ top: 16, alignSelf: 'start' }}>
            <TripBudgetCard spent={totalEstimate} budget={budget} itemCount={bookings.length} />
            <TripStatusPills
              status={trip.status}
              isSurprise={trip.is_surprise}
              isPublic={trip.is_public}
            />
            <TripDistanceCard
              startLat={trip.start_lat}
              startLng={trip.start_lng}
              endLat={trip.end_lat}
              endLng={trip.end_lng}
            />
            <TripWeatherCard
              lat={trip.end_lat}
              lng={trip.end_lng}
              date={trip.start_date ?? trip.start_datetime}
              destination={trip.end_location}
            />
            <TripVehicleSummaryCard vehicle={vehicle} />
            <TripOBD2SnapshotCard tripId={trip.id} label="start" />
          </aside>
        </div>
      </div>

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
