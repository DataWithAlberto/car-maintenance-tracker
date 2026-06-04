import { Check, Circle, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

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

export const OnboardingChecklist = ({ steps }: OnboardingChecklistProps) => {
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;

  return (
    <section
      className="mx-5 md:mx-10 mt-5 bg-snow border border-silver-mist rounded-[20px]"
      aria-label="Puesta a punto inicial"
      style={{ padding: 22 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span
            className="font-mono uppercase text-graphite"
            style={{ fontSize: 10, letterSpacing: '0.14em' }}
          >
            Puesta a punto inicial
          </span>
          <h2
            className="font-display text-ink"
            style={{ fontWeight: 650, fontSize: 26, lineHeight: 1.08, marginTop: 8 }}
          >
            Completa tu garaje
          </h2>
        </div>
        <span
          className="font-mono text-graphite"
          style={{ fontSize: 11, letterSpacing: '0.1em', paddingTop: 4 }}
        >
          {doneCount}/{steps.length}
        </span>
      </div>

      <div
        className="mt-5"
        style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              type="button"
              onClick={step.onAction}
              disabled={step.done}
              className={cn(
                'focus-ring',
                step.done && 'cursor-default',
              )}
              style={{
                border: '1px solid var(--color-silver-mist)',
                background: step.done ? 'var(--color-fog)' : 'var(--color-snow)',
                borderRadius: 16,
                padding: 14,
                textAlign: 'left',
                opacity: step.done ? 0.72 : 1,
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="shrink-0 inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    background: step.done ? 'rgba(26,158,63,0.12)' : 'var(--color-fog)',
                    color: step.done ? 'var(--color-success-500)' : 'var(--color-ink)',
                  }}
                >
                  {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span
                    className="font-text text-ink"
                    style={{ display: 'block', fontSize: 14, fontWeight: 600 }}
                  >
                    {step.label}
                  </span>
                  <span
                    className="font-text text-graphite"
                    style={{ display: 'block', fontSize: 12.5, lineHeight: 1.4, marginTop: 3 }}
                  >
                    {step.detail}
                  </span>
                  <span
                    className="font-text"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: step.done ? 'var(--color-success-500)' : 'var(--color-azure)',
                      marginTop: 10,
                    }}
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
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
