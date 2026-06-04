import type { ReactNode } from 'react';

type ActionTone = 'neutral' | 'warn' | 'urgent';

interface ActionCardProps {
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
  cta: string;
  tone?: ActionTone;
  onClick: () => void;
}

const toneStyles: Record<ActionTone, { border: string; background: string; accent: string }> = {
  neutral: {
    border: '1px solid var(--color-silver-mist)',
    background: 'var(--color-snow)',
    accent: 'var(--color-azure)',
  },
  warn: {
    border: '1px solid rgba(199,119,0,0.28)',
    background: 'rgba(199,119,0,0.08)',
    accent: 'var(--color-warn-500)',
  },
  urgent: {
    border: '1px solid rgba(182,68,0,0.28)',
    background: 'rgba(182,68,0,0.08)',
    accent: 'var(--color-caution)',
  },
};

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
      className="focus-ring"
      style={{
        textAlign: 'left',
        border: style.border,
        borderRadius: 18,
        background: style.background,
        padding: 18,
        cursor: 'pointer',
        color: 'var(--color-ink)',
        minHeight: 162,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      <div>
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            color: tone === 'neutral' ? 'var(--color-graphite)' : style.accent,
          }}
        >
          {eyebrow}
        </span>
        <p
          className="font-display"
          style={{
            fontWeight: 650,
            fontSize: 22,
            lineHeight: 1.08,
            letterSpacing: '-0.35px',
            margin: '8px 0 0',
          }}
        >
          {title}
        </p>
        <p
          className="font-text text-graphite"
          style={{ fontSize: 13, lineHeight: 1.45, margin: '8px 0 0' }}
        >
          {body}
        </p>
      </div>
      <span className="font-text" style={{ fontSize: 13, fontWeight: 600, color: style.accent }}>
        {cta} →
      </span>
    </button>
  );
};
