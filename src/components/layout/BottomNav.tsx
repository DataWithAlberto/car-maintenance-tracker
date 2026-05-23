import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
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

const MAIN_TABS = [
  { to: '/dashboard', lordSrc: 'https://cdn.lordicon.com/wmwqvixz.json', label: 'Inicio' },
  { to: '/car', lordSrc: 'https://cdn.lordicon.com/hbtheitu.json', label: 'Coche' },
  { to: '/maintenance', lordSrc: 'https://cdn.lordicon.com/oaflahpk.json', label: 'Servicio' },
  { to: '/trips', lordSrc: 'https://cdn.lordicon.com/nqtddedc.json', label: 'Viajes' },
];

const MORE_ITEMS = [
  { to: '/maintenance-plan', icon: CalendarClock, label: 'Plan predictivo' },
  { to: '/expenses', icon: Receipt, label: 'Gastos' },
  { to: '/insurance', icon: ShieldCheck, label: 'Seguro' },
  { to: '/documents', icon: FileText, label: 'Documentos' },
  { to: '/obd2', icon: Cpu, label: 'OBD-II' },
  { to: '/mechanics', icon: Store, label: 'Talleres' },
  { to: '/sharing', icon: Share2, label: 'Compartir' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

const INK = '#1d1d1f';
const MUTED = '#6e6e73';

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
              {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                <button
                  key={to}
                  onClick={() => {
                    setOpen(false);
                    navigate(to);
                  }}
                  className="flex flex-col items-center gap-2 rounded-[16px] py-3 px-2"
                  style={{ background: 'var(--color-fog)' }}
                >
                  <span
                    className="h-10 w-10 flex items-center justify-center rounded-[12px]"
                    style={{
                      background: 'var(--color-snow)',
                      border: '1px solid var(--color-silver-mist)',
                    }}
                  >
                    <Icon className="h-5 w-5 text-ink" strokeWidth={1.6} />
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
          {MAIN_TABS.map(({ to, lordSrc, label }) => {
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setOpen(false)}
                  className="focus-ring flex flex-col items-center justify-center gap-0.5 py-2.5"
                  style={{ textDecoration: 'none' }}
                >
                  {({ isActive: navActive }) => (
                    <>
                      <span
                        className={cn(
                          'h-9 w-9 flex items-center justify-center rounded-xl transition-all',
                          navActive && 'bg-ink/10',
                        )}
                      >
                        <LordIcon
                          src={lordSrc}
                          trigger={navActive ? 'loop' : 'click'}
                          size={26}
                          primaryColor={navActive ? INK : MUTED}
                          secondaryColor={navActive ? INK : MUTED}
                          stroke="regular"
                        />
                      </span>
                      <span
                        className="font-medium transition-colors"
                        style={{
                          fontSize: 10,
                          color: navActive ? INK : MUTED,
                        }}
                      >
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}

          {/* Más */}
          <li>
            <button
              onClick={() => setOpen((v) => !v)}
              className="focus-ring w-full flex flex-col items-center justify-center gap-0.5 py-2.5"
            >
              <span
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-xl transition-all',
                  open && 'bg-ink/10',
                )}
              >
                <LordIcon
                  src="https://cdn.lordicon.com/unvlvkmi.json"
                  trigger={open ? 'loop' : 'click'}
                  size={26}
                  primaryColor={open ? INK : MUTED}
                  secondaryColor={open ? INK : MUTED}
                />
              </span>
              <span
                className="font-medium transition-colors"
                style={{ fontSize: 10, color: open ? INK : MUTED }}
              >
                Más
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};
