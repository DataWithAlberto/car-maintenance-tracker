import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FOCUS_RING } from './styles';

type ActionTone = 'neutral' | 'warn' | 'urgent';

interface ActionCardProps {
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
  cta: string;
  tone?: ActionTone;
  onClick: () => void;
}

const toneStyles: Record<ActionTone, { surface: string; accent: string }> = {
  neutral: {
    surface: 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]',
    accent: 'text-sky-400',
  },
  warn: {
    surface: 'border-amber-500/25 bg-amber-500/[0.07] hover:border-amber-500/40',
    accent: 'text-amber-400',
  },
  urgent: {
    surface: 'border-red-500/30 bg-red-500/[0.08] hover:border-red-500/45',
    accent: 'text-red-400',
  },
};

/** Tarjeta de acción/estado (dark-tech). Altura uniforme para el grid. */
export const ActionCard = ({
  eyebrow,
  title,
  body,
  cta,
  tone = 'neutral',
  onClick,
}: ActionCardProps) => {
  const style = toneStyles[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        FOCUS_RING,
        'flex min-h-[160px] flex-col justify-between gap-3 rounded-2xl border p-5 text-left backdrop-blur-sm',
        'transition-colors duration-200 active:scale-[0.99]',
        style.surface,
      )}
    >
      <div>
        <span
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.16em]',
            tone === 'neutral' ? 'text-slate-500' : style.accent,
          )}
        >
          {eyebrow}
        </span>
        <p className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight text-white">
          {title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
      </div>
      <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', style.accent)}>
        {cta}
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </span>
    </button>
  );
};
