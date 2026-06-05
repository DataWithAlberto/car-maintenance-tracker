import { memo, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { CARD, CARD_HOVER, FOCUS_RING } from './styles';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  /** Icono pequeño en la esquina superior derecha (ej. ↗ o 📅). */
  icon?: ReactNode;
  /** Elemento centrado a la derecha (ej. anillo de progreso). */
  ring?: ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

/**
 * Tarjeta de métrica editorial (theme-aware): borde fuerte, fondo de tarjeta,
 * etiqueta arriba, valor grande y, opcionalmente, un icono en la esquina o un
 * anillo de progreso a la derecha. Si recibe `onClick` se renderiza como botón
 * accesible con hover sutil.
 */
export const MetricCard = memo(
  ({ label, value, sub, icon, ring, onClick, loading = false }: MetricCardProps) => {
    const content = (
      <>
        {icon && (
          <span className="absolute right-5 top-5 text-ink sm:right-6 sm:top-6">{icon}</span>
        )}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="pr-7 text-base font-medium text-ink">{label}</p>
            {loading ? (
              <div className="skeleton mt-3 h-9 w-28 rounded" aria-hidden="true" />
            ) : (
              <p className="mt-2 truncate font-semibold tracking-tight text-ink text-4xl sm:text-[2.75rem] sm:leading-none">
                {value}
              </p>
            )}
            {sub && <p className="mt-2 text-sm text-graphite">{sub}</p>}
          </div>
          {ring && <div className="shrink-0 self-center">{ring}</div>}
        </div>
      </>
    );

    const base = cn(CARD, 'relative w-full p-5 text-left sm:p-6');

    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={cn(base, CARD_HOVER, FOCUS_RING)}>
          {content}
        </button>
      );
    }
    return <div className={base}>{content}</div>;
  },
);
MetricCard.displayName = 'MetricCard';
