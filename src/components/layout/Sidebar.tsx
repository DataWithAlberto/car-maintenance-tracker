import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, Wrench, Receipt, FileText, Settings, Share2, Route, Sparkles, Cpu } from 'lucide-react';
import { useVehicleStore } from '../../store/vehicleStore';
import { cn } from '../../utils/cn';
import { formatKm } from '../../utils/formatters';

const links = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',     code: '01' },
  { to: '/car',        icon: Car,             label: 'Mi coche',      code: '02' },
  { to: '/maintenance',icon: Wrench,          label: 'Mantenimiento', code: '03' },
  { to: '/trips',      icon: Route,           label: 'Viajes',        code: '04' },
  { to: '/mechanics',  icon: Sparkles,        label: 'Talleres IA',   code: '05' },
  { to: '/obd2',       icon: Cpu,             label: 'OBD-II',        code: '06' },
  { to: '/expenses',   icon: Receipt,         label: 'Gastos',        code: '07' },
  { to: '/documents',  icon: FileText,        label: 'Documentos',    code: '08' },
  { to: '/sharing',    icon: Share2,          label: 'Compartir',     code: '09' },
  { to: '/settings',   icon: Settings,        label: 'Ajustes',       code: '10' },
];

export const Sidebar = () => {
  const { selectedVehicle } = useVehicleStore();

  return (
    <aside className="hidden md:flex w-56 lg:w-60 bg-canvas-white border-r border-sky-blueprint/20 flex-col shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)]">

      {/* Active vehicle panel */}
      {selectedVehicle ? (
        <div className="m-3 rounded-card border border-sky-blueprint/25 bg-cloud-white shadow-subtle overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-sky-blueprint/40 to-transparent" />
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="tele-dot" />
              <p className="font-manrope text-caption text-sky-dark/80 tracking-wide">Vehículo activo</p>
            </div>
            <p
              className="font-display text-ink leading-tight truncate"
              style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.1px' }}
            >
              {selectedVehicle.brand} {selectedVehicle.model}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-manrope text-caption text-ink-charcoal/65">{selectedVehicle.year}</span>
              <span className="text-ink-charcoal/35">·</span>
              <span className="font-manrope text-caption text-sky-dark font-medium">
                {formatKm(selectedVehicle.current_km)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="m-3 rounded-card border border-dashed border-sky-blueprint/30 px-3 py-2.5">
          <p className="font-manrope text-caption text-ink-charcoal/60">Sin vehículo seleccionado</p>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-px mt-1">
        {links.map(({ to, icon: Icon, label, code }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'focus-ring group relative flex items-center gap-2.5 px-3 py-2 text-body rounded-card transition-all duration-150',
                isActive
                  ? 'text-ink-black bg-cloud-white border border-sky-blueprint/25 shadow-subtle'
                  : 'text-ink-charcoal hover:text-ink-black hover:bg-cloud-white/70',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-sunset-orange" />
                )}
                <Icon
                  className={cn('h-4 w-4 shrink-0', isActive ? 'text-sky-dark' : 'text-ink-charcoal/65 group-hover:text-ink-charcoal')}
                  strokeWidth={isActive ? 2 : 1.7}
                />
                <span className={cn('flex-1 font-manrope', isActive ? 'font-medium' : 'font-normal')}>{label}</span>
                <span className={cn('font-manrope text-caption tabular-nums', isActive ? 'text-sky-dark/60' : 'text-ink-charcoal/40 group-hover:text-ink-charcoal/60')}>
                  {code}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sky-blueprint/15">
        <p className="font-manrope text-caption text-ink-charcoal/40 leading-relaxed">
          FocusHub · v0.2<br />
          <span className="text-ink-charcoal/30">Sistema de gestión vehicular</span>
        </p>
      </div>
    </aside>
  );
};
