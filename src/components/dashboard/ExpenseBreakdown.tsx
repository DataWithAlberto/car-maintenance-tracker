import { memo } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CARD, EYEBROW, FOCUS_RING } from './styles';
import { fmtEur } from './format';
import type { ExpenseBreakdown as ExpenseBreakdownData } from './useDashboardData';

interface ExpenseBreakdownProps {
  data: ExpenseBreakdownData;
  total: number;
  year: number;
  onDetail: () => void;
}

const ROWS: { key: keyof ExpenseBreakdownData; label: string; bar: string }[] = [
  { key: 'combustible', label: 'Combustible', bar: 'bg-sky-400' },
  { key: 'mantenimiento', label: 'Mantenimiento', bar: 'bg-amber-400' },
  { key: 'seguro', label: 'Seguro', bar: 'bg-violet-400' },
];

/**
 * Desglose de gasto YTD por categoría con barras proporcionales. Datos reales
 * del vehículo principal (gastos + coste de mantenimientos del año en curso).
 */
export const ExpenseBreakdown = memo(({ data, total, year, onDetail }: ExpenseBreakdownProps) => (
  <section className={cn(CARD, 'flex flex-col p-5 sm:p-6')} aria-label="Gasto por categoría">
    <div className="flex items-start justify-between">
      <div>
        <span className={EYEBROW}>Gasto acumulado · {year}</span>
        <div className="mt-1.5 font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
          {fmtEur(total)}
        </div>
      </div>
      <button
        type="button"
        onClick={onDetail}
        className={cn(
          FOCUS_RING,
          'inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300',
          'transition-colors duration-200 hover:bg-white/10 hover:text-white',
        )}
      >
        Detalle
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>

    <div className="mt-5 flex flex-col gap-4">
      {ROWS.map(({ key, label, bar }) => {
        const value = data[key];
        const pct = total > 0 ? (value / total) * 100 : 0;
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{label}</span>
              <span className="font-medium tabular-nums text-white">{fmtEur(value)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className={cn('h-full rounded-full transition-[width] duration-700', bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </section>
));
ExpenseBreakdown.displayName = 'ExpenseBreakdown';
