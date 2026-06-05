import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FOCUS_RING } from './styles';
import { fmtN } from './format';
import type { VehicleStats } from './useDashboardData';
import type { VehicleWithAccess } from '../../types';

interface FleetGridProps {
  vehicles: VehicleWithAccess[];
  stats: Record<string, VehicleStats>;
  primaryId?: string;
  onSelect: (vehicle: VehicleWithAccess) => void;
}

/**
 * Flota registrada en estilo editorial B&W: lista a todo el ancho separada por
 * líneas negras finas (mismo lenguaje que "Próximos mantenimientos"). Solo se
 * muestra desde el componente padre cuando hay más de un vehículo.
 */
export const FleetGrid = memo(({ vehicles, stats, primaryId, onSelect }: FleetGridProps) => {
  if (vehicles.length === 0) return null;

  return (
    <section aria-label="Flota registrada">
      <h2 className="text-xl font-semibold tracking-tight text-black sm:text-2xl">
        Tu flota
        <span className="ml-2 text-base font-normal text-zinc-400">{vehicles.length}</span>
      </h2>

      <div className="mt-5 border-t border-black">
        {vehicles.map((v) => {
          const s = stats[v.id];
          const alertCount = s?.alerts.length ?? 0;
          const isPrimary = v.id === primaryId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v)}
              className={cn(
                FOCUS_RING,
                'flex w-full items-center justify-between gap-4 border-b border-black py-4 text-left',
                'transition-colors duration-150 hover:bg-zinc-50',
              )}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium text-black">
                    {v.brand} {v.model}
                  </span>
                  {isPrimary && (
                    <span className="rounded-full border border-black px-2 py-0.5 text-[10px] uppercase tracking-wide text-black">
                      Principal
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-zinc-500">
                  {fmtN(v.current_km)} km
                  {alertCount > 0 && ` · ${alertCount} alerta${alertCount === 1 ? '' : 's'}`}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-black" strokeWidth={1.6} />
            </button>
          );
        })}
      </div>
    </section>
  );
});
FleetGrid.displayName = 'FleetGrid';
