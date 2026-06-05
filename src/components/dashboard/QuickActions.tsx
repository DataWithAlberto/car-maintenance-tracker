import { memo } from 'react';
import { Fuel, Wrench, ScanLine, FileUp, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CARD, CARD_HOVER, EYEBROW, FOCUS_RING } from './styles';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  accent: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: 'Registrar repostaje',
    icon: Fuel,
    href: '/expenses',
    accent: 'text-sky-400 bg-sky-500/10',
  },
  {
    label: 'Añadir mantenimiento',
    icon: Wrench,
    href: '/maintenance',
    accent: 'text-amber-400 bg-amber-500/10',
  },
  {
    label: 'Escanear OBD2',
    icon: ScanLine,
    href: '/obd2',
    accent: 'text-emerald-400 bg-emerald-500/10',
  },
  {
    label: 'Subir documento',
    icon: FileUp,
    href: '/documents',
    accent: 'text-violet-400 bg-violet-500/10',
  },
];

interface QuickActionsProps {
  onNavigate: (href: string) => void;
}

/** Accesos rápidos a las acciones más frecuentes. */
export const QuickActions = memo(({ onNavigate }: QuickActionsProps) => (
  <section aria-label="Accesos rápidos">
    <span className={EYEBROW}>Acciones rápidas</span>
    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ACTIONS.map(({ label, icon: Icon, href, accent }) => (
        <button
          key={href}
          type="button"
          onClick={() => onNavigate(href)}
          className={cn(
            CARD,
            CARD_HOVER,
            FOCUS_RING,
            'flex flex-col items-start gap-3 p-4 text-left active:scale-[0.98]',
          )}
        >
          <span
            className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl', accent)}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold leading-tight text-white">{label}</span>
        </button>
      ))}
    </div>
  </section>
));
QuickActions.displayName = 'QuickActions';
