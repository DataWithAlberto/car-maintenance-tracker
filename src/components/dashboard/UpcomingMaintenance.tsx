import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FOCUS_RING } from './styles';
import type { UpcomingItem } from './useDashboardData';

interface UpcomingMaintenanceProps {
  items: UpcomingItem[];
  onSelect: () => void;
}

/**
 * Lista de "Próximos mantenimientos" en estilo editorial: filas a todo el
 * ancho separadas por líneas finas (border-ink, theme-aware), con la etiqueta y
 * el detalle a la izquierda y un chevron `>` a la derecha.
 */
export const UpcomingMaintenance = memo(({ items, onSelect }: UpcomingMaintenanceProps) => (
  <section aria-label="Próximos mantenimientos">
    <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
      Próximos mantenimientos
    </h2>

    <div className="mt-5 border-t border-ink">
      {items.length === 0 ? (
        <p className="border-b border-ink py-4 text-sm text-graphite">
          Sin mantenimientos próximos. Tu vehículo está al día.
        </p>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={onSelect}
            className={cn(
              FOCUS_RING,
              'flex w-full items-center justify-between gap-4 border-b border-ink py-4 text-left',
              'transition-colors duration-150 hover:bg-fog',
            )}
          >
            <span className="min-w-0 truncate text-[15px] text-ink">
              <span className="font-medium">{item.label}</span>
              <span className="text-graphite"> — {item.detail}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink" strokeWidth={1.6} />
          </button>
        ))
      )}
    </div>
  </section>
));
UpcomingMaintenance.displayName = 'UpcomingMaintenance';
