import { memo } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { HealthRing } from './HealthRing';
import { EYEBROW, FOCUS_RING } from './styles';
import { fmtN } from './format';
import type { VehicleWithAccess } from '../../types';

interface VehicleSpotlightProps {
  vehicle: VehicleWithAccess;
  alertCount: number;
  healthScore: number;
  healthCopy: string;
  onOpen: () => void;
}

/**
 * Tarjeta destacada del vehículo principal: imagen + identidad + anillo de
 * salud + kilometraje. Es el elemento de mayor jerarquía visual del grid de
 * estado. Toda la tarjeta es clicable (botón) hacia el detalle del coche.
 */
export const VehicleSpotlight = memo(
  ({ vehicle, alertCount, healthScore, healthCopy, onOpen }: VehicleSpotlightProps) => (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir ${vehicle.brand} ${vehicle.model}`}
      className={cn(
        FOCUS_RING,
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 text-left',
        'bg-gradient-to-br from-sky-600/25 via-indigo-700/15 to-slate-900',
        'p-5 transition-colors duration-200 hover:border-sky-400/40 sm:p-6',
      )}
    >
      {/* Halo decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className={EYEBROW}>Vehículo principal</span>
          <h2 className="mt-1.5 truncate font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {vehicle.brand} {vehicle.model}
          </h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">
            {vehicle.year}
            {vehicle.fuel_type && ` · ${vehicle.fuel_type}`}
            {vehicle.license_plate && ` · ${vehicle.license_plate}`}
          </p>
        </div>
        {alertCount > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
            {alertCount}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            OK
          </span>
        )}
      </div>

      {/* Imagen del vehículo */}
      <div className="relative my-4 flex flex-1 items-center justify-center">
        <img
          src="/ford-focus.png"
          alt={`${vehicle.brand} ${vehicle.model}`}
          loading="lazy"
          className="max-h-44 w-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      <div className="relative flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <div className="flex items-center gap-4">
          <HealthRing score={healthScore} size={68} stroke={7} />
          <div>
            <div className="font-display text-xl font-bold tabular-nums text-white">
              {fmtN(vehicle.current_km)}{' '}
              <span className="text-sm font-normal text-slate-400">km</span>
            </div>
            <p className="text-xs text-slate-400">Estado: {healthCopy}</p>
          </div>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-transform duration-200 group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
    </button>
  ),
);
VehicleSpotlight.displayName = 'VehicleSpotlight';
