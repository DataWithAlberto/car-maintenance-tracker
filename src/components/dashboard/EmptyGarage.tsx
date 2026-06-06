import { memo } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FOCUS_RING } from './styles';

interface EmptyGarageProps {
  onAdd: () => void;
}

/** Estado vacío editorial (theme-aware): no hay vehículos todavía. */
export const EmptyGarage = memo(({ onAdd }: EmptyGarageProps) => (
  <div className="flex flex-col items-start gap-5 border-t border-silver-mist py-12">
    <h2 className="font-semibold leading-[0.95] tracking-tight text-ink text-4xl sm:text-6xl">
      Empieza añadiendo
      <br />
      <span className="text-mist">tu primer vehículo.</span>
    </h2>
    <p className="max-w-lg text-base leading-relaxed text-graphite">
      Registra marca, modelo y kilometraje. A partir de ahí, FocusHub te avisará de mantenimientos y
      agrupará gastos y trayectos.
    </p>
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        FOCUS_RING,
        'inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-snow',
        'transition-opacity duration-200 hover:opacity-90',
      )}
    >
      <Plus className="h-4 w-4" strokeWidth={2} />
      Añadir vehículo
    </button>
  </div>
));
EmptyGarage.displayName = 'EmptyGarage';
