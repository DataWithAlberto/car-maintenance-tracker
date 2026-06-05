import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CARD, EYEBROW } from './styles';

type KpiTone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger';

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
  loading?: boolean;
}

const toneRing: Record<KpiTone, string> = {
  neutral: 'text-slate-400 bg-white/5',
  brand: 'text-sky-400 bg-sky-500/10',
  success: 'text-emerald-400 bg-emerald-500/10',
  warn: 'text-amber-400 bg-amber-500/10',
  danger: 'text-red-400 bg-red-500/10',
};

/**
 * KPI compacto dark-tech: icono con halo de color por `tone`, etiqueta mono y
 * valor grande tabular. Memoizado: solo re-renderiza si cambian sus props.
 */
export const KpiTile = memo(
  ({ icon: Icon, label, value, hint, tone = 'neutral', loading = false }: KpiTileProps) => (
    <div className={cn(CARD, 'flex flex-col gap-3 p-4 sm:p-5')}>
      <div className="flex items-center justify-between">
        <span className={EYEBROW}>{label}</span>
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg',
            toneRing[tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
      </div>
      {loading ? (
        <div className="h-7 w-24 animate-pulse rounded-md bg-white/10" aria-hidden="true" />
      ) : (
        <div className="truncate font-display text-2xl font-bold tabular-nums tracking-tight text-white sm:text-3xl">
          {value}
        </div>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  ),
);
KpiTile.displayName = 'KpiTile';
