import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, Wrench, Route, MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils/cn';

const tabs = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Inicio'   },
  { to: '/car',        icon: Car,             label: 'Coche'    },
  { to: '/maintenance',icon: Wrench,          label: 'Servicio' },
  { to: '/trips',      icon: Route,           label: 'Viajes'   },
  { to: '/settings',   icon: MoreHorizontal,  label: 'Más'      },
];

export const BottomNav = () => (
  <nav
    className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-canvas-white/95 border-t border-sky-blueprint/20 pb-safe"
    style={{ backdropFilter: 'blur(12px)' }}
    aria-label="Navegación móvil"
  >
    <ul className="grid grid-cols-5 px-1">
      {tabs.map(({ to, icon: Icon, label }) => (
        <li key={to}>
          <NavLink
            to={to}
            className={({ isActive }) =>
              cn(
                'focus-ring flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-sky-dark' : 'text-ink-charcoal hover:text-ink-black',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'relative h-9 w-9 flex items-center justify-center rounded-xl transition-all',
                    isActive && 'bg-sky-blueprint/15 ring-1 ring-sky-blueprint/30',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
