import { useState } from 'react';
import { tripsService } from '../../services/trips.service';
import type { SurpriseReaction as Reaction } from '../../types';

const REACTIONS: Reaction[] = ['🥹', '😍', '🎉', '😱'];
const STORAGE_KEY = 'surprise-reaction';

const storedReaction = (token: string): Reaction | null => {
  if (typeof window === 'undefined') return null;
  return (window.localStorage.getItem(`${STORAGE_KEY}:${token}`) as Reaction) || null;
};

interface Props {
  token: string;
  initialCounts?: Partial<Record<Reaction, number>>;
}

export const SurpriseReaction = ({ token, initialCounts = {} }: Props) => {
  const [chosen, setChosen] = useState<Reaction | null>(() => storedReaction(token));
  const [counts, setCounts] = useState<Partial<Record<Reaction, number>>>(initialCounts);
  const [sending, setSending] = useState(false);

  const handlePick = async (emoji: Reaction) => {
    if (chosen || sending) return;
    setSending(true);
    setChosen(emoji);
    setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
    try {
      await tripsService.addSurpriseReaction(token, emoji);
      window.localStorage.setItem(`${STORAGE_KEY}:${token}`, emoji);
    } catch {
      // Si falla el envío, revertimos para que el usuario pueda reintentar
      setChosen(null);
      setCounts((prev) => {
        const next = { ...prev };
        const n = (next[emoji] ?? 1) - 1;
        if (n <= 0) delete next[emoji];
        else next[emoji] = n;
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-label="Reacción"
      style={{
        maxWidth: 520,
        margin: '24px auto 64px',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <p
        className="font-mono uppercase text-graphite"
        style={{ fontSize: 11, letterSpacing: '.18em', marginBottom: 16 }}
      >
        {chosen ? '¡Gracias por reaccionar!' : '¿Cómo te sienta?'}
      </p>
      <div className="flex items-center justify-center" style={{ gap: 12, flexWrap: 'wrap' }}>
        {REACTIONS.map((r) => {
          const count = counts[r] ?? 0;
          const isChosen = chosen === r;
          const isDimmed = chosen !== null && !isChosen;
          return (
            <button
              key={r}
              type="button"
              onClick={() => handlePick(r)}
              disabled={chosen !== null || sending}
              aria-pressed={isChosen}
              className="transition-all"
              style={{
                position: 'relative',
                background: isChosen ? 'rgba(255,90,95,.10)' : '#fff',
                border: `1.5px solid ${isChosen ? '#FF5A5F' : 'var(--color-silver-mist, #e5e5ea)'}`,
                borderRadius: 16,
                padding: '12px 14px',
                fontSize: 28,
                lineHeight: 1,
                cursor: chosen ? 'default' : 'pointer',
                opacity: isDimmed ? 0.45 : 1,
                transform: isChosen ? 'scale(1.08)' : 'scale(1)',
                boxShadow: isChosen ? '0 8px 24px rgba(255,90,95,.18)' : 'none',
              }}
            >
              <span aria-hidden>{r}</span>
              {count > 0 && (
                <span
                  className="tabular-nums"
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    right: -6,
                    background: '#1d1d1f',
                    color: '#fff',
                    borderRadius: 999,
                    padding: '2px 7px',
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 18,
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
