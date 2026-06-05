import { memo } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FOCUS_RING } from './styles';

interface UrgentBannerProps {
  criticalCount: number;
  overdueCount: number;
  onReview: () => void;
}

/**
 * Banner de atención inmediata. Solo se renderiza si hay alertas críticas o
 * mantenimientos vencidos — en rojo, arriba del todo, para máxima jerarquía
 * visual. Si no hay nada urgente devuelve `null` (no ocupa espacio).
 */
export const UrgentBanner = memo(({ criticalCount, overdueCount, onReview }: UrgentBannerProps) => {
  const total = criticalCount + overdueCount;
  if (total === 0) return null;

  const parts: string[] = [];
  if (criticalCount > 0)
    parts.push(
      `${criticalCount} alerta${criticalCount === 1 ? '' : 's'} crítica${criticalCount === 1 ? '' : 's'}`,
    );
  if (overdueCount > 0)
    parts.push(
      `${overdueCount} servicio${overdueCount === 1 ? '' : 's'} vencido${overdueCount === 1 ? '' : 's'}`,
    );

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
        'shadow-[0_0_40px_-12px_rgba(239,68,68,0.5)]',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
          <AlertTriangle className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-white sm:text-lg">
            Atención inmediata requerida
          </p>
          <p className="truncate text-sm text-red-200/80">{parts.join(' · ')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReview}
        className={cn(
          FOCUS_RING,
          'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white',
          'transition-colors duration-200 hover:bg-red-400 active:scale-[0.98]',
        )}
      >
        Revisar ahora
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  );
});
UrgentBanner.displayName = 'UrgentBanner';
