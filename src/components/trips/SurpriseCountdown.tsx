import { useEffect, useState } from 'react';

interface Parts {
  d: number;
  h: number;
  m: number;
  s: number;
  done: boolean;
}

const calc = (target: number): Parts => {
  const diff = Math.max(0, target - Date.now());
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1000),
    done: diff <= 0,
  };
};

const pad = (n: number) => String(n).padStart(2, '0');

export const SurpriseCountdown = ({ revealDate }: { revealDate: string }) => {
  const target = new Date(revealDate).getTime();
  const [parts, setParts] = useState<Parts>(() => calc(target));

  useEffect(() => {
    const id = window.setInterval(() => setParts(calc(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (parts.done) {
    return (
      <p className="text-graphite" style={{ marginTop: 12, fontSize: 14, fontStyle: 'italic' }}>
        Refresca la página: ya puedes abrir la sorpresa ✦
      </p>
    );
  }

  const cell = (label: string, value: string) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: 64,
      }}
    >
      <span
        className="tabular-nums"
        style={{
          fontFamily: 'Inter, var(--font-sf-pro-display)',
          fontWeight: 700,
          fontSize: 'clamp(36px, 6vw, 56px)',
          letterSpacing: '-1.5px',
          lineHeight: 1,
          background: 'linear-gradient(135deg, #1d1d1f 0%, #FF5A5F 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase text-graphite"
        style={{ fontSize: 10, letterSpacing: '.18em', marginTop: 6 }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div
      role="timer"
      aria-live="polite"
      style={{
        display: 'flex',
        gap: 12,
        marginTop: 24,
        padding: '20px 24px',
        background: 'var(--color-snow, #fff)',
        border: '1px solid var(--color-silver-mist, #e5e5ea)',
        borderRadius: 18,
        boxShadow: '0 8px 24px rgba(0,0,0,.06)',
      }}
    >
      {cell('días', String(parts.d))}
      <Separator />
      {cell('horas', pad(parts.h))}
      <Separator />
      {cell('min', pad(parts.m))}
      <Separator />
      {cell('seg', pad(parts.s))}
    </div>
  );
};

const Separator = () => (
  <span
    aria-hidden
    style={{
      display: 'flex',
      alignItems: 'center',
      color: '#c7c7cc',
      fontSize: 28,
      fontWeight: 200,
    }}
  >
    :
  </span>
);
