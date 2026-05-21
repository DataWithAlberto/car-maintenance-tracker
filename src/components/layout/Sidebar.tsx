import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Car, Wrench, Receipt, FileText,
  Settings, Route, Sparkles, Cpu, ShieldCheck, CalendarClock, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useVehicleStore } from '../../store/vehicleStore';
import { documentsService } from '../../services/documents.service';
import { calculateDocumentAlerts } from '../../utils/calculations';
import { cn } from '../../utils/cn';
import { formatKm } from '../../utils/formatters';

interface NavLeaf {
  to: string;
  icon: LucideIcon;
  label: string;
  code?: string;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  code: string;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

const navEntries: NavEntry[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', code: '01' },
  {
    label: 'Vehículo',
    icon: Car,
    code: '02',
    children: [
      { to: '/car',  icon: Car, label: 'Mi coche' },
      { to: '/obd2', icon: Cpu, label: 'OBD-II'   },
    ],
  },
  {
    label: 'Mantenimiento',
    icon: Wrench,
    code: '03',
    children: [
      { to: '/maintenance',      icon: Wrench,        label: 'Mantenimiento'   },
      { to: '/maintenance-plan', icon: CalendarClock,  label: 'Plan predictivo' },
      { to: '/mechanics',        icon: Sparkles,       label: 'Talleres IA'     },
    ],
  },
  {
    label: 'Finanzas',
    icon: Receipt,
    code: '04',
    children: [
      { to: '/expenses',  icon: Receipt,    label: 'Gastos'  },
      { to: '/insurance', icon: ShieldCheck, label: 'Seguro' },
    ],
  },
  { to: '/trips',     icon: Route,    label: 'Viajes',     code: '05' },
  { to: '/documents', icon: FileText, label: 'Documentos', code: '06' },
  { to: '/settings',  icon: Settings, label: 'Ajustes',    code: '07' },
];

function SubMenuGroup({
  group,
  docAlertCount,
}: {
  group: NavGroup;
  docAlertCount: number;
}) {
  const location = useLocation();
  const isAnyChildActive = group.children.some(c => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(isAnyChildActive);

  useEffect(() => {
    if (isAnyChildActive) setOpen(true);
  }, [isAnyChildActive]);

  const GroupIcon = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'focus-ring group relative flex items-center gap-2.5 px-3 py-2 text-body rounded-card transition-all duration-150 w-full text-left',
          isAnyChildActive
            ? 'text-ink-black bg-cloud-white border border-sky-blueprint/25 shadow-subtle'
            : 'text-ink-charcoal hover:text-ink-black hover:bg-cloud-white/70',
        )}
      >
        {isAnyChildActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-sunset-orange" />
        )}
        <GroupIcon
          className={cn('h-4 w-4 shrink-0', isAnyChildActive ? 'text-sky-dark' : 'text-ink-charcoal/65 group-hover:text-ink-charcoal')}
          strokeWidth={isAnyChildActive ? 2 : 1.7}
        />
        <span className={cn('flex-1 font-manrope', isAnyChildActive ? 'font-medium' : 'font-normal')}>
          {group.label}
        </span>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            open ? 'rotate-90' : '',
            isAnyChildActive ? 'text-sky-dark/60' : 'text-ink-charcoal/35 group-hover:text-ink-charcoal/55',
          )}
        />
      </button>

      {open && (
        <div className="ml-3.5 pl-2.5 border-l border-sky-blueprint/20 mt-0.5 space-y-px">
          {group.children.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'focus-ring group relative flex items-center gap-2 px-2.5 py-1.5 rounded-card transition-all duration-150',
                  isActive
                    ? 'text-ink-black bg-cloud-white border border-sky-blueprint/20 shadow-subtle'
                    : 'text-ink-charcoal hover:text-ink-black hover:bg-cloud-white/60',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-sky-dark' : 'text-ink-charcoal/55 group-hover:text-ink-charcoal')}
                    strokeWidth={isActive ? 2 : 1.7}
                  />
                  <span className={cn('flex-1 font-manrope text-sm', isActive ? 'font-medium' : 'font-normal')}>
                    {label}
                  </span>
                  {to === '/documents' && docAlertCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center tabular-nums"
                      style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: '#b64400', color: '#fff', fontSize: 9, fontWeight: 600 }}
                      aria-label={`${docAlertCount} documentos requieren atención`}
                    >
                      {docAlertCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export const Sidebar = () => {
  const { selectedVehicle } = useVehicleStore();
  const [docAlertCount, setDocAlertCount] = useState(0);

  useEffect(() => {
    if (!selectedVehicle) { setDocAlertCount(0); return; }
    let active = true;
    documentsService.getByVehicle(selectedVehicle.id)
      .then((docs) => {
        if (active) setDocAlertCount(calculateDocumentAlerts(selectedVehicle.id, docs).length);
      })
      .catch(() => { if (active) setDocAlertCount(0); });
    return () => { active = false; };
  }, [selectedVehicle?.id]);

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
      <nav className="flex-1 px-2 space-y-px mt-1 overflow-y-auto">
        {navEntries.map((entry) => {
          if (isGroup(entry)) {
            return (
              <SubMenuGroup
                key={entry.label}
                group={entry}
                docAlertCount={docAlertCount}
              />
            );
          }

          const { to, icon: Icon, label, code } = entry;
          return (
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
                  {to === '/documents' && docAlertCount > 0 ? (
                    <span
                      className="inline-flex items-center justify-center tabular-nums"
                      style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: '#b64400', color: '#fff', fontSize: 10, fontWeight: 600 }}
                      aria-label={`${docAlertCount} documentos requieren atención`}
                    >
                      {docAlertCount}
                    </span>
                  ) : (
                    <span className={cn('font-manrope text-caption tabular-nums', isActive ? 'text-sky-dark/60' : 'text-ink-charcoal/40 group-hover:text-ink-charcoal/60')}>
                      {code}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
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
