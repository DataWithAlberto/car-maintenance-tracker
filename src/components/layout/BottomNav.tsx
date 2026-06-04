import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Car,
  Wrench,
  Route,
  MoreHorizontal,
  Receipt,
  ShieldCheck,
  FileText,
  CalendarClock,
  CalendarDays,
  Cpu,
  Store,
  Share2,
  Settings,
  Images,
  Landmark,
  PieChart,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { LordIcon } from '../ui/LordIcon';

interface TabDef {
  to: string;
  icon: LucideIcon;
  lordSrc?: string;
  label: string;
}

const MAIN_TABS: TabDef[] = [
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    label: 'Inicio',
    lordSrc: 'https://cdn.lordicon.com/dutqakce.json',
  },
  { to: '/car', icon: Car, label: 'Coche', lordSrc: 'https://cdn.lordicon.com/oeotfwsx.json' },
  {
    to: '/maintenance',
    icon: Wrench,
    label: 'Servicio',
    lordSrc: 'https://cdn.lordicon.com/mudwpdhy.json',
  },
  { to: '/trips', icon: Route, label: 'Viajes', lordSrc: 'https://cdn.lordicon.com/qtzfwijv.json' },
];

const MORE_ITEMS: TabDef[] = [
  {
    to: '/calendario',
    icon: CalendarDays,
    label: 'Calendario',
  },
  {
    to: '/maintenance-plan',
    icon: CalendarClock,
    label: 'Plan predictivo',
    lordSrc: 'https://cdn.lordicon.com/uoljexdg.json',
  },
  {
    to: '/expenses',
    icon: Receipt,
    label: 'Gastos',
    lordSrc: 'https://cdn.lordicon.com/yycecovd.json',
  },
  {
    to: '/insurance',
    icon: ShieldCheck,
    label: 'Seguro',
    lordSrc: 'https://cdn.lordicon.com/yraqammt.json',
  },
  {
    to: '/prestamo',
    icon: Landmark,
    label: 'Préstamo',
  },
  {
    to: '/coste',
    icon: PieChart,
    label: 'Coste total',
  },
  {
    to: '/documents',
    icon: FileText,
    label: 'Documentos',
    lordSrc: 'https://cdn.lordicon.com/jqqjtvlf.json',
  },
  { to: '/obd2', icon: Cpu, label: 'OBD-II', lordSrc: 'https://cdn.lordicon.com/fedbzost.json' },
  {
    to: '/mechanics',
    icon: Store,
    label: 'Talleres',
    lordSrc: 'https://cdn.lordicon.com/vwwysvjs.json',
  },
  {
    to: '/sharing',
    icon: Share2,
    label: 'Compartir',
    lordSrc: 'https://cdn.lordicon.com/fhlrrido.json',
  },
  {
    to: '/galeria',
    icon: Images,
    label: 'Galería',
    lordSrc: 'https://cdn.lordicon.com/zczzhvwa.json',
  },
  {
    to: '/settings',
    icon: Settings,
    label: 'Ajustes',
    lordSrc: 'https://cdn.lordicon.com/asyunleq.json',
  },
];

const MORE_GROUPS = [
  {
    label: 'Agenda',
    items: MORE_ITEMS.filter((item) => ['/calendario', '/maintenance-plan'].includes(item.to)),
  },
  {
    label: 'Finanzas',
    items: MORE_ITEMS.filter((item) =>
      ['/expenses', '/insurance', '/prestamo', '/coste'].includes(item.to),
    ),
  },
  {
    label: 'Herramientas',
    items: MORE_ITEMS.filter((item) =>
      ['/documents', '/obd2', '/mechanics', '/sharing', '/galeria', '/settings'].includes(item.to),
    ),
  },
];

export const BottomNav = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* ─── "Más" sheet ───────────────────────────────────────────────────── */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-more-pages"
            className="liquid-glass md:hidden fixed inset-x-0 z-50 pb-safe"
            style={{
              bottom: 'calc(max(16px, env(safe-area-inset-bottom)) + 80px)',
              left: 16,
              right: 16,
              borderRadius: 28,
              maxHeight: 'min(68vh, 620px)',
              overflowY: 'auto',
            }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span
                className="font-mono uppercase text-graphite"
                style={{ fontSize: 10, letterSpacing: '0.14em' }}
              >
                Más páginas
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú de más páginas"
                className="liquid-glass-secondary h-7 w-7 flex items-center justify-center rounded-full"
              >
                <X className="h-4 w-4 text-graphite" strokeWidth={2} />
              </button>
            </div>

            <div className="px-4 pb-5 pt-2 space-y-4">
              {MORE_GROUPS.map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <h3
                    className="font-mono uppercase text-graphite px-1 mb-2"
                    style={{ fontSize: 9, letterSpacing: '0.14em' }}
                  >
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {group.items.map(({ to, icon: Icon, lordSrc, label }) => (
                      <button
                        key={to}
                        onClick={() => {
                          setOpen(false);
                          navigate(to);
                        }}
                        className="liquid-glass-secondary flex flex-col items-center gap-2 rounded-[16px] py-3 px-2 active:scale-95"
                        style={{ transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
                      >
                        <span className="h-10 w-10 flex items-center justify-center">
                          {lordSrc ? (
                            <LordIcon src={lordSrc} trigger="hover" size={22} />
                          ) : (
                            <Icon className="h-5 w-5 text-ink" strokeWidth={1.6} />
                          )}
                        </span>
                        <span
                          className="font-text text-ink text-center leading-tight"
                          style={{ fontSize: 11 }}
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Tab bar (Apple Liquid Glass) ─────────────────────────────────── */}
      <nav
        className="liquid-glass md:hidden fixed z-40"
        style={{
          left: 16,
          right: 16,
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          borderRadius: 38,
        }}
        aria-label="Navegación móvil"
      >
        <ul className="grid grid-cols-5 px-2 py-1.5">
          {MAIN_TABS.map(({ to, icon: Icon, lordSrc, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'focus-ring flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium',
                    isActive ? 'text-[color:var(--color-azure)]' : 'text-graphite hover:text-ink',
                  )
                }
                style={{ transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'h-9 w-9 flex items-center justify-center rounded-full',
                        isActive && 'liquid-glass-secondary',
                      )}
                      style={{
                        transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {lordSrc ? (
                        <LordIcon src={lordSrc} trigger={isActive ? 'loop' : 'hover'} size={22} />
                      ) : (
                        <Icon
                          className="h-5 w-5"
                          strokeWidth={isActive ? 2.2 : 1.8}
                          style={{ transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
                        />
                      )}
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}

          {/* Más */}
          <li>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Cerrar más páginas' : 'Abrir más páginas'}
              aria-expanded={open}
              aria-controls="mobile-more-pages"
              className={cn(
                'focus-ring w-full flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium',
                open ? 'text-[color:var(--color-azure)]' : 'text-graphite hover:text-ink',
              )}
              style={{ transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
            >
              <span
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-full',
                  open && 'liquid-glass-secondary',
                )}
                style={{
                  transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                  transform: open ? 'scale(1.1) rotate(90deg)' : 'scale(1)',
                }}
              >
                <MoreHorizontal className="h-5 w-5" strokeWidth={open ? 2.2 : 1.8} />
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};
