import { memo } from 'react';
import { Car, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { fmtLongDate } from './format';
import { CARD, CARD_HOVER, EYEBROW, FOCUS_RING } from './styles';
import type { VehicleWithAccess } from '../../types';

interface DashboardHeaderProps {
  firstName: string;
  lastSyncLabel: string;
  vehicles: VehicleWithAccess[];
  primary: VehicleWithAccess | null;
  onSelectVehicle: (vehicle: VehicleWithAccess) => void;
  onAddVehicle: () => void;
}

/**
 * Cabecera del dashboard: saludo + fecha actual + estado de sync y un selector
 * rápido de vehículo. Mobile-first: en móvil apila verticalmente, en `md:` se
 * reparte en fila.
 */
export const DashboardHeader = memo(
  ({
    firstName,
    lastSyncLabel,
    vehicles,
    primary,
    onSelectVehicle,
    onAddVehicle,
  }: DashboardHeaderProps) => {
    const today = new Date();

    return (
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span className={cn(EYEBROW, 'inline-flex items-center gap-2')}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Sistema activo · tu garaje
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold leading-none tracking-tight text-white sm:text-4xl md:text-5xl">
            Hola, {firstName}.
          </h1>
          <p className="mt-2 text-sm capitalize text-slate-400">{fmtLongDate(today)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Estado de sincronización */}
          <span
            className={cn(
              CARD,
              'inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300',
            )}
          >
            <RefreshCw className="h-3.5 w-3.5 text-sky-400" strokeWidth={2} />
            Sync · <span className="font-mono text-slate-400">{lastSyncLabel}</span>
          </span>

          {/* Selector rápido de vehículo */}
          {primary && vehicles.length > 0 && (
            <VehicleQuickSelect
              vehicles={vehicles}
              primary={primary}
              onSelectVehicle={onSelectVehicle}
            />
          )}

          <button
            type="button"
            onClick={onAddVehicle}
            className={cn(
              FOCUS_RING,
              'inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white',
              'transition-colors duration-200 hover:bg-sky-400 active:scale-[0.98]',
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Añadir
          </button>
        </div>
      </header>
    );
  },
);
DashboardHeader.displayName = 'DashboardHeader';

/**
 * Selector rápido nativo (sin librerías): usa un `<select>` superpuesto y
 * transparente para máxima accesibilidad y cero JS de dropdown.
 */
const VehicleQuickSelect = ({
  vehicles,
  primary,
  onSelectVehicle,
}: {
  vehicles: VehicleWithAccess[];
  primary: VehicleWithAccess;
  onSelectVehicle: (vehicle: VehicleWithAccess) => void;
}) => (
  <div
    className={cn(
      CARD,
      CARD_HOVER,
      FOCUS_RING,
      'relative inline-flex items-center gap-2 px-3 py-2',
    )}
  >
    <Car className="h-4 w-4 text-slate-400" strokeWidth={1.8} />
    <span className="max-w-[160px] truncate text-sm font-medium text-white">
      {primary.brand} {primary.model}
    </span>
    <ChevronDown className="h-4 w-4 text-slate-500" strokeWidth={2} />
    <select
      aria-label="Seleccionar vehículo"
      value={primary.id}
      onChange={(e) => {
        const v = vehicles.find((veh) => veh.id === e.target.value);
        if (v) onSelectVehicle(v);
      }}
      className="absolute inset-0 cursor-pointer opacity-0"
    >
      {vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {v.brand} {v.model}
          {v.license_plate ? ` · ${v.license_plate}` : ''}
        </option>
      ))}
    </select>
  </div>
);
