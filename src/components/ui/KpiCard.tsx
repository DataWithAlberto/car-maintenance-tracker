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
  brand:   { bar: 'bg-brand-500',   text: 'text-brand-400',   dim: 'text-brand-400/40',   icon: 'text-brand-400',   glow: 'rgba(59,130,246,0.15)' },
  success: { bar: 'bg-success-500', text: 'text-success-400', dim: 'text-success-400/40', icon: 'text-success-400', glow: 'rgba(16,185,129,0.12)' },
  warn:    { bar: 'bg-warn-500',    text: 'text-warn-400',    dim: 'text-warn-400/40',    icon: 'text-warn-400',    glow: 'rgba(245,158,11,0.12)' },
  danger:  { bar: 'bg-danger-500',  text: 'text-danger-400',  dim: 'text-danger-400/40',  icon: 'text-danger-400',  glow: 'rgba(239,68,68,0.12)' },
  accent:  { bar: 'bg-accent-500',  text: 'text-accent-400',  dim: 'text-accent-400/40',  icon: 'text-accent-400',  glow: 'rgba(232,68,10,0.12)' },
} as const;

export const KpiCard = ({ icon: Icon, label, value, hint, trend, tone = 'brand', className = '' }: KpiCardProps) => {
  const t = toneMap[tone];
  const trendChar = trend === 'up' ? '▲' : trend === 'down' ? '▼' : null;
  const trendColor = trend === 'up' ? 'text-success-400' : trend === 'down' ? 'text-danger-400' : 'text-gray-500';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card border border-sky-blueprint/25 bg-cloud-white shadow-card transition-all duration-200',
        'stripe-top stripe-top-brand',
        className,
      )}
      style={{ '--stripe-color': t.bar } as React.CSSProperties}
    >
      {/* Subtle inner glow at top */}
      <div
        className="absolute inset-x-0 top-0 h-16 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${t.glow}, transparent)` }}
      />

      <div className="relative p-4">
        {/* Label row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1 w-1 rounded-full', t.bar)} />
            <p className="font-manrope text-caption text-ink-charcoal/70 tracking-wide">
              {label}
            </p>
          </div>
          <div className={cn('h-7 w-7 rounded-lg bg-canvas-50 flex items-center justify-center border border-sky-blueprint/20', t.icon)}>
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
          </div>
        </div>

        {/* Value — display font, condensed */}
        <p
          className="text-heading-lg font-light text-ink-black tabular-nums leading-none truncate"
          style={{ fontFamily: 'var(--font-simeiz)', letterSpacing: '-0.02em' }}
        >
          {value}
        </p>

        {/* Hint / trend */}
        <div className="mt-2 flex items-center gap-1.5 min-h-[16px]">
          {hint && (
            <p className={cn('text-[11px] font-medium flex items-center gap-1', trendColor)}>
              {trendChar && <span className="text-[9px]">{trendChar}</span>}
              <span className="text-gray-500">{hint}</span>
            </p>
          )}
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className={cn('absolute bottom-0 left-0 h-px w-full opacity-20', t.bar)} />
    </div>
  );
};
