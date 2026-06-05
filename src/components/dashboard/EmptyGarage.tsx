import { memo } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CARD, EYEBROW, FOCUS_RING } from './styles';

interface EmptyGarageProps {
  onAdd: () => void;
}

/** Estado vacío: no hay vehículos todavía. */
export const EmptyGarage = memo(({ onAdd }: EmptyGarageProps) => (
  <div className={cn(CARD, 'flex flex-col items-start gap-5 p-8 sm:p-10')}>
    <span className={EYEBROW}>Tu garaje · vacío</span>
    <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
      Empieza añadiendo
      <br />
      <span className="text-slate-500">tu primer vehículo.</span>
    </h2>
    <p className="max-w-lg text-base leading-relaxed text-slate-400">
      Registra marca, modelo y kilometraje. A partir de ahí, FocusHub te avisará de mantenimientos y
      agrupará gastos y trayectos.
    </p>
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        FOCUS_RING,
        'inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white',
        'transition-colors duration-200 hover:bg-sky-400 active:scale-[0.98]',
      )}
    >
      <Plus className="h-4 w-4" strokeWidth={2.4} />
      Añadir vehículo
    </button>
  </div>
));
EmptyGarage.displayName = 'EmptyGarage';
