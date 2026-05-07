import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: 'up' | 'down' | 'flat';
  tone?: 'brand' | 'success' | 'warn' | 'danger' | 'accent';
  className?: string;
}

const toneMap = {
  brand: { bg: 'from-brand-500/15 to-transparent', text: 'text-brand-300', ring: 'ring-brand-500/30' },
  success: { bg: 'from-success-500/15 to-transparent', text: 'text-success-400', ring: 'ring-success-500/30' },
  warn: { bg: 'from-warn-500/15 to-transparent', text: 'text-warn-400', ring: 'ring-warn-500/30' },
  danger: { bg: 'from-danger-500/15 to-transparent', text: 'text-danger-400', ring: 'ring-danger-500/30' },
  accent: { bg: 'from-accent-500/15 to-transparent', text: 'text-accent-400', ring: 'ring-accent-500/30' },
} as const;

export const KpiCard = ({ icon: Icon, label, value, hint, trend, tone = 'brand', className = '' }: KpiCardProps) => {
  const t = toneMap[tone];
  const trendChar = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '·';
  const trendColor =
    trend === 'up' ? 'text-success-400' : trend === 'down' ? 'text-danger-400' : 'text-gray-500';

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface border border-border/60 rounded-2xl p-4 transition-all duration-200',
        'hover:border-border hover:-translate-y-0.5',
        className,
      )}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none', t.bg)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5 truncate">{value}</p>
          {hint && (
            <p className={cn('text-xs mt-1 flex items-center gap-1', trendColor)}>
              {trend && <span className="text-[10px]">{trendChar}</span>}
              <span className="text-gray-400">{hint}</span>
            </p>
          )}
        </div>
        <div className={cn('shrink-0 h-10 w-10 rounded-xl bg-surface-2 flex items-center justify-center ring-1', t.ring, t.text)}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
};
