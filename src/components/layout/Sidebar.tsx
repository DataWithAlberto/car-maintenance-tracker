import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, Wrench, Receipt, FileText, Settings, Share2, Sparkles } from 'lucide-react';
import { useVehicleStore } from '../../store/vehicleStore';
import { cn } from '../../utils/cn';
import { formatKm } from '../../utils/formatters';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/car', icon: Car, label: 'Mi coche' },
  { to: '/maintenance', icon: Wrench, label: 'Mantenimiento' },
  { to: '/expenses', icon: Receipt, label: 'Gastos' },
  { to: '/documents', icon: FileText, label: 'Documentos' },
  { to: '/sharing', icon: Share2, label: 'Compartir' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

export const Sidebar = () => {
  const { selectedVehicle } = useVehicleStore();

  return (
    <aside className="hidden md:flex w-60 lg:w-64 bg-surface/60 backdrop-blur border-r border-border/60 flex-col shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)]">
      {selectedVehicle && (
        <div className="px-4 py-4 m-3 rounded-2xl bg-gradient-to-br from-brand-500/10 via-surface-2 to-accent-500/5 border border-border/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3 w-3 text-accent-400" />
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Vehículo activo</p>
          </div>
          <p className="text-white text-sm font-semibold tracking-tight truncate">
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {selectedVehicle.year} · <span className="text-brand-300 font-medium">{formatKm(selectedVehicle.current_km)}</span>
          </p>
        </div>
      )}

      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all',
                isActive
                  ? 'text-white bg-gradient-to-r from-brand-500/15 to-transparent'
                  : 'text-gray-400 hover:text-white hover:bg-surface-2/70',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-brand-400 to-accent-500" />
                )}
                <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand-300' : 'text-gray-500 group-hover:text-gray-300')} strokeWidth={isActive ? 2.1 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border/60">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          FocusHub · v0.2 · Tu garaje digital
        </p>
      </div>
    </aside>
  );
};
