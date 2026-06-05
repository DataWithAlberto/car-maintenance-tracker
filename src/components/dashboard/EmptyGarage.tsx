import { memo } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FOCUS_RING } from './styles';

interface EmptyGarageProps {
  onAdd: () => void;
}

/** Estado vacío B&W: no hay vehículos todavía. */
export const EmptyGarage = memo(({ onAdd }: EmptyGarageProps) => (
  <div className="flex flex-col items-start gap-5 border-t border-black py-12">
    <h2 className="font-semibold leading-[0.95] tracking-tight text-black text-4xl sm:text-6xl">
      Empieza añadiendo
      <br />
      <span className="text-zinc-400">tu primer vehículo.</span>
    </h2>
    <p className="max-w-lg text-base leading-relaxed text-zinc-500">
      Registra marca, modelo y kilometraje. A partir de ahí, FocusHub te avisará de mantenimientos y
      agrupará gastos y trayectos.
    </p>
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        FOCUS_RING,
        'inline-flex items-center gap-2 rounded-full border border-black bg-black px-5 py-2.5 text-sm font-medium text-white',
        'transition-colors duration-200 hover:bg-white hover:text-black',
      )}
    >
      <Plus className="h-4 w-4" strokeWidth={2} />
      Añadir vehículo
    </button>
  </div>
));
EmptyGarage.displayName = 'EmptyGarage';
