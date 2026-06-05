import { memo } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CARD, CARD_HOVER, EYEBROW, FOCUS_RING } from './styles';
import { fmtN } from './format';
import type { VehicleStats } from './useDashboardData';
import type { VehicleWithAccess } from '../../types';

interface FleetGridProps {
  vehicles: VehicleWithAccess[];
  stats: Record<string, VehicleStats>;
  primaryId?: string;
  onSelect: (vehicle: VehicleWithAccess) => void;
}

/** Rejilla de toda la flota registrada. Cada tarjeta selecciona el vehículo. */
export const FleetGrid = memo(({ vehicles, stats, primaryId, onSelect }: FleetGridProps) => {
  if (vehicles.length === 0) return null;

  return (
    <section aria-label="Flota registrada">
      <div className="flex items-baseline justify-between gap-4">
        <span className={EYEBROW}>
          Flota · {vehicles.length} vehículo{vehicles.length === 1 ? '' : 's'}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
          Clic para seleccionar
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <FleetCard
            key={v.id}
            vehicle={v}
            stats={stats[v.id]}
            isPrimary={v.id === primaryId}
            onSelect={() => onSelect(v)}
          />
        ))}
      </div>
    </section>
  );
});
FleetGrid.displayName = 'FleetGrid';

const FleetCard = ({
  vehicle,
  stats,
  isPrimary,
  onSelect,
}: {
  vehicle: VehicleWithAccess;
  stats?: VehicleStats;
  isPrimary: boolean;
  onSelect: () => void;
}) => {
  const alertCount = stats?.alerts.length ?? 0;
  const recordCount = stats?.records.length ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        CARD,
        CARD_HOVER,
        FOCUS_RING,
        'flex flex-col gap-4 p-5 text-left',
        isPrimary && 'border-sky-400/50 bg-sky-500/[0.06]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold tracking-tight text-white">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            {vehicle.year}
            {vehicle.fuel_type && ` · ${vehicle.fuel_type}`}
            {vehicle.license_plate && ` · ${vehicle.license_plate}`}
          </p>
        </div>
        {alertCount > 0 ? (
          <span
            aria-label={`${alertCount} alerta${alertCount === 1 ? '' : 's'}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300"
          >
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            {alertCount}
          </span>
        ) : (
          <span
            aria-label="Sin alertas"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Km</div>
          <div className="mt-1 font-display text-lg font-semibold tabular-nums text-white">
            {fmtN(vehicle.current_km)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
            Servicios
          </div>
          <div className="mt-1 font-display text-lg font-semibold tabular-nums text-white">
            {recordCount}
          </div>
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
        {isPrimary ? '✓ Vehículo principal' : 'Seleccionar'}
      </p>
    </button>
  );
};
