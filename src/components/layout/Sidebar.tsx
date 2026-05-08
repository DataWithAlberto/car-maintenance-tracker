import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, Wrench, Receipt, FileText, Settings, Share2 } from 'lucide-react';
import { useVehicleStore } from '../../store/vehicleStore';
import { cn } from '../../utils/cn';
import { formatKm } from '../../utils/formatters';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',     code: '01' },
  { to: '/car',        icon: Car,             label: 'Mi coche',      code: '02' },
  { to: '/maintenance',icon: Wrench,          label: 'Mantenimiento', code: '03' },
  { to: '/expenses',   icon: Receipt,         label: 'Gastos',        code: '04' },
  { to: '/documents',  icon: FileText,        label: 'Documentos',    code: '05' },
  { to: '/sharing',    icon: Share2,          label: 'Compartir',     code: '06' },
  { to: '/settings',   icon: Settings,        label: 'Ajustes',       code: '07' },
];

export const Sidebar = () => {
  const { selectedVehicle } = useVehicleStore();

  return (
    <aside className="hidden md:flex w-56 lg:w-60 bg-surface border-r border-border flex-col shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)]">

      {/* Active vehicle telemetry panel */}
      {selectedVehicle ? (
        <div className="m-3 rounded-lg border border-border/80 bg-surface-2 overflow-hidden">
          {/* Top strip */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="tele-dot" />
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-ink-charcoal/80">Vehículo activo</p>
            </div>
            <p
              className="text-ink-black font-black uppercase leading-tight truncate"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.04em' }}
            >
              {selectedVehicle.brand} {selectedVehicle.model}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-ink-charcoal/80">{selectedVehicle.year}</span>
              <span className="text-ink-charcoal/65">·</span>
              <span className="text-[10px] font-mono text-accent-400 font-semibold">
                {formatKm(selectedVehicle.current_km)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="m-3 rounded-lg border border-dashed border-border/50 px-3 py-2.5">
          <p className="text-[10px] font-mono text-ink-charcoal/80 uppercase tracking-wider">Sin vehículo</p>
        </div>
      )}

      {/* Divider with label */}
      <div className="flex items-center gap-2 px-4 mb-1">
        <span className="h-px flex-1 bg-border/60" />
        <span className="text-[9px] font-mono text-ink-charcoal/65 uppercase tracking-widest">Nav</span>
        <span className="h-px flex-1 bg-border/60" />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-px">
        {links.map(({ to, icon: Icon, label, code }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-150',
                isActive
                  ? 'text-ink-black bg-surface-2 border border-border/80'
                  : 'text-ink-charcoal hover:text-ink-black hover:bg-surface-2/60',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-accent-500" />
                )}
                <Icon
                  className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent-400' : 'text-ink-charcoal/80 group-hover:text-ink-charcoal')}
                  strokeWidth={isActive ? 2 : 1.7}
                />
                <span className={cn('flex-1 font-medium', isActive ? '' : 'font-normal')}>{label}</span>
                <span className={cn('text-[9px] font-mono tabular-nums', isActive ? 'text-accent-500/60' : 'text-ink-charcoal/65 group-hover:text-ink-charcoal/80')}>
                  {code}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/50">
        <p className="text-[9px] font-mono text-ink-charcoal/65 uppercase tracking-widest leading-relaxed">
          FocusHub · v0.2<br />
          <span className="text-ink-charcoal/45">Sistema de gestión vehicular</span>
        </p>
      </div>
    </aside>
  );
};
