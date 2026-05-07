import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, Wrench, DollarSign, FileText, Settings, Share2 } from 'lucide-react';
import { useVehicleStore } from '../../store/vehicleStore';
import { cn } from '../../utils/cn';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/car', icon: Car, label: 'Mi Coche' },
  { to: '/maintenance', icon: Wrench, label: 'Mantenimiento' },
  { to: '/expenses', icon: DollarSign, label: 'Gastos' },
  { to: '/documents', icon: FileText, label: 'Documentos' },
  { to: '/sharing', icon: Share2, label: 'Compartir' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

export const Sidebar = () => {
  const { selectedVehicle } = useVehicleStore();

  return (
    <aside className="w-16 md:w-56 bg-gray-900 border-r border-gray-800 flex flex-col min-h-[calc(100vh-4rem)] shrink-0">
      {selectedVehicle && (
        <div className="hidden md:block px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Vehículo activo</p>
          <p className="text-white text-sm font-medium truncate">
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <p className="text-gray-400 text-xs">{selectedVehicle.current_km.toLocaleString()} km</p>
        </div>
      )}

      <nav className="flex-1 py-4">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden md:block">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
