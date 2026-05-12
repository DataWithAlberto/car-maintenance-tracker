import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/* ─── Apple-style empty state ────────────────────────────────────────────────
 *
 * - Centered vertical stack.
 * - Icon: 56×56 #f5f5f7 rounded square (silver), 1.5px stroke ink.
 *   No blur halo, no shadow, no decoration.
 * - Title: SF Pro Display 600 24/-0.36px ink.
 * - Description: SF Pro Text 17/400 graphite.
 * - Single action CTA below at 24px gap.
 * ──────────────────────────────────────────────────────────────────────────── */

export const EmptyState = ({
  icon: Icon, title, description, action, className = '',
}: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center',
      'px-6 py-16',
      className,
    )}
  >
    <div className="h-14 w-14 rounded-[18px] bg-fog flex items-center justify-center mb-6">
      <Icon className="h-7 w-7 text-ink" strokeWidth={1.5} />
    </div>
    <h3
      className="font-display text-ink"
      style={{
        fontWeight: 600,
        fontSize: 24,
        lineHeight: 1.2,
        letterSpacing: '-0.36px',
      }}
    >
      {title}
    </h3>
    {description && (
      <p
        className="font-text text-graphite mt-3 max-w-md"
        style={{
          fontWeight: 400,
          fontSize: 17,
          lineHeight: 1.45,
          letterSpacing: '-0.1px',
        }}
      >
        {description}
      </p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);
