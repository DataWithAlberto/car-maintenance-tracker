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
  Cpu,
  Store,
  Share2,
  Settings,
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
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/car', icon: Car, label: 'Coche' },
  {
    to: '/maintenance',
    icon: Wrench,
    label: 'Servicio',
    lordSrc: 'https://cdn.lordicon.com/mudwpdhy.json',
  },
  { to: '/trips', icon: Route, label: 'Viajes', lordSrc: 'https://cdn.lordicon.com/qtzfwijv.json' },
];

const MORE_ITEMS: TabDef[] = [
  { to: '/maintenance-plan', icon: CalendarClock, label: 'Plan predictivo' },
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
  { to: '/documents', icon: FileText, label: 'Documentos' },
  { to: '/obd2', icon: Cpu, label: 'OBD-II' },
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
  { to: '/settings', icon: Settings, label: 'Ajustes' },
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
            className="md:hidden fixed inset-x-0 bottom-[65px] z-50 rounded-t-[28px] pb-safe"
            style={{
              background: 'var(--color-snow)',
              border: '1px solid var(--color-silver-mist)',
              borderBottom: 'none',
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
                className="h-7 w-7 flex items-center justify-center rounded-full"
                style={{ background: 'var(--color-fog)' }}
              >
                <X className="h-4 w-4 text-graphite" strokeWidth={2} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 px-4 pb-5 pt-2">
              {MORE_ITEMS.map(({ to, icon: Icon, lordSrc, label }) => (
                <button
                  key={to}
                  onClick={() => {
                    setOpen(false);
                    navigate(to);
                  }}
                  className="flex flex-col items-center gap-2 rounded-[16px] py-3 px-2 transition-transform active:scale-95"
                  style={{ background: 'var(--color-fog)' }}
                >
                  <span
                    className="h-10 w-10 flex items-center justify-center rounded-[12px]"
                    style={{
                      background: 'var(--color-snow)',
                      border: '1px solid var(--color-silver-mist)',
                    }}
                  >
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
          </div>
        </>
      )}

      {/* ─── Tab bar ───────────────────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-safe"
        style={{
          background: 'var(--color-snow)',
          borderTop: '1px solid var(--color-silver-mist)',
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Navegación móvil"
      >
        <ul className="grid grid-cols-5 px-1">
          {MAIN_TABS.map(({ to, icon: Icon, lordSrc, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'focus-ring flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                    isActive ? 'text-ink' : 'text-graphite hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-300',
                        isActive ? 'bg-ink/10 scale-110' : 'scale-100',
                      )}
                    >
                      {lordSrc ? (
                        <LordIcon src={lordSrc} trigger={isActive ? 'loop' : 'hover'} size={22} />
                      ) : (
                        <Icon
                          className="h-5 w-5 transition-transform duration-300"
                          strokeWidth={isActive ? 2.2 : 1.8}
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
              className={cn(
                'focus-ring w-full flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                open ? 'text-ink' : 'text-graphite hover:text-ink',
              )}
            >
              <span
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-300',
                  open ? 'bg-ink/10 scale-110 rotate-90' : 'scale-100',
                )}
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
