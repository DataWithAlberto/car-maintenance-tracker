import { useEffect, useState } from 'react';

interface Props {
  text: string;
  /** Delay antes de empezar (ms) — útil para esperar al confeti. */
  startDelay?: number;
  charDelay?: number;
}

export const SurpriseTypewriter = ({ text, startDelay = 1200, charDelay = 32 }: Props) => {
  const [shown, setShown] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setStarted(true), startDelay);
    return () => window.clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    if (shown.length >= text.length) return;
    const id = window.setTimeout(() => setShown(text.slice(0, shown.length + 1)), charDelay);
    return () => window.clearTimeout(id);
  }, [shown, text, started, charDelay]);

  const done = shown.length >= text.length;

  return (
    <section
      className="max-w-2xl mx-auto"
      style={{
        padding: '32px 24px 16px',
        textAlign: 'center',
      }}
    >
      <span
        className="font-mono uppercase text-graphite"
        style={{ fontSize: 11, letterSpacing: '.22em' }}
      >
        ✦ Por qué este viaje
      </span>
      <p
        style={{
          marginTop: 16,
          fontFamily: 'Inter, var(--font-sf-pro-display)',
          fontSize: 'clamp(20px, 3vw, 26px)',
          lineHeight: 1.45,
          fontWeight: 300,
          color: 'var(--color-ink, #1d1d1f)',
          letterSpacing: '-0.2px',
          fontStyle: 'italic',
          minHeight: '1.5em',
        }}
      >
        {shown}
        {!done && (
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 2,
              height: '1em',
              marginLeft: 2,
              background: '#FF5A5F',
              verticalAlign: '-2px',
              animation: 'blink 1s infinite',
            }}
          />
        )}
      </p>
      <style>{`@keyframes blink { 0%,50% { opacity: 1 } 51%,100% { opacity: 0 } }`}</style>
    </section>
  );
};
