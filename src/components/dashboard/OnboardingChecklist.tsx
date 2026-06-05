import { Check, Circle, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CARD, CARD_HOVER, EYEBROW, FOCUS_RING } from './styles';

interface OnboardingStep {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  actionLabel: string;
  onAction: () => void;
  icon: LucideIcon;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
}

/** Puesta a punto inicial. Se oculta cuando todos los pasos están completos. */
export const OnboardingChecklist = ({ steps }: OnboardingChecklistProps) => {
  const doneCount = steps.filter((step) => step.done).length;
  if (steps.length === 0 || doneCount === steps.length) return null;

  return (
    <section className={cn(CARD, 'p-5 sm:p-6')} aria-label="Puesta a punto inicial">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className={EYEBROW}>Puesta a punto inicial</span>
          <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white">
            Completa tu garaje
          </h2>
        </div>
        <span className="pt-1 font-mono text-xs tracking-wider text-slate-500">
          {doneCount}/{steps.length}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              type="button"
              onClick={step.onAction}
              disabled={step.done}
              className={cn(
                FOCUS_RING,
                'flex items-start gap-3 rounded-xl border border-white/10 p-4 text-left',
                step.done
                  ? 'cursor-default bg-white/[0.02] opacity-70'
                  : cn('bg-white/[0.04]', CARD_HOVER),
              )}
            >
              <span
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  step.done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-slate-300',
                )}
              >
                {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{step.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                  {step.detail}
                </span>
                <span
                  className={cn(
                    'mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold',
                    step.done ? 'text-emerald-400' : 'text-sky-400',
                  )}
                >
                  {step.done ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Listo
                    </>
                  ) : (
                    <>
                      <Circle className="h-3 w-3" /> {step.actionLabel}
                    </>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
