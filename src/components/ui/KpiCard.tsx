import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface KpiCardProps {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: 'up' | 'down' | 'flat';
  /** Reserved for accent dot. Apple style is mono — only the dot uses tone. */
  tone?: 'brand' | 'success' | 'warn' | 'danger' | 'accent' | 'neutral';
  className?: string;
}

/* ─── Apple-style KPI card ───────────────────────────────────────────────────
 *
 * - Surface: #ffffff (snow) on var(--color-fog) canvas — value-contrast elevation only.
 * - Border: 1px var(--color-silver-mist) (silver-mist).
 * - Radius: 20px (between buttons and cards).
 * - Label: JetBrains Mono 11/.12em uppercase var(--color-graphite).
 * - Value: SF Pro Display 700, 28-32px, tight tracking.
 * - Hint: SF Pro Text 13/400 var(--color-graphite).
 * - Tone affects ONLY the 6px status dot — the rest stays achromatic.
 * - Zero box-shadows, zero stripes, zero glow.
 * ──────────────────────────────────────────────────────────────────────────── */

const dotColor: Record<NonNullable<KpiCardProps['tone']>, string> = {
  brand:   '#0071e3',
  success: '#1a9e3f',
  warn:    '#c77700',
  danger:  '#d70015',
  accent:  '#b64400',
  neutral: 'var(--color-mist)',
};

export const KpiCard = ({
  icon: Icon, label, value, hint, trend, tone = 'neutral', className = '',
}: KpiCardProps) => {
  const trendChar = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;
  const trendColor =
    trend === 'up'   ? 'text-success-500' :
    trend === 'down' ? 'text-danger-500'  :
                       'text-graphite';

  return (
    <div
      className={cn(
        'bg-snow border border-silver-mist rounded-[20px] p-5',
        className,
      )}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="rounded-full shrink-0"
            style={{ width: 6, height: 6, background: dotColor[tone] }}
          />
          <span
            className="font-mono uppercase text-graphite truncate"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.12em',
              lineHeight: 1,
            }}
          >
            {label}
          </span>
        </div>
        {Icon && (
          <Icon
            className="h-4 w-4 shrink-0 text-graphite"
            strokeWidth={1.6}
          />
        )}
      </div>

      {/* Value */}
      <div
        className="text-ink tabular-nums truncate"
        style={{
          fontFamily: 'var(--font-sf-pro-display)',
          fontWeight: 700,
          fontSize: 'clamp(22px, 6vw, 32px)',
          lineHeight: 1,
          letterSpacing: '-0.5px',
        }}
      >
        {value}
      </div>

      {/* Hint / trend */}
      {(hint || trendChar) && (
        <div className="mt-2 flex items-center gap-1.5">
          {trendChar && (
            <span className={cn('text-caption font-medium', trendColor)}>
              {trendChar}
            </span>
          )}
          {hint && (
            <span
              className="font-text text-graphite"
              style={{ fontSize: 13, lineHeight: 1.4 }}
            >
              {hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
