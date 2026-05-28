import { Send, CalendarDays, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  hints: string[];
  revealDate?: string | null;
  /** URL pública de la sorpresa (para incluir en el mensaje). */
  publicUrl?: string | null;
}

interface Slot {
  date: Date;
  hint: string;
  index: number;
  status: 'past' | 'today' | 'future';
}

/* Reparte las pistas entre hoy y la fecha del reveal y muestra cuál enviar
 * cada día con un botón one-click para WhatsApp. */
export const SurpriseHintsScheduler = ({ hints, revealDate, publicUrl }: Props) => {
  if (hints.length === 0 || !revealDate) return null;

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const reveal = new Date(revealDate);
  if (Number.isNaN(reveal.getTime()) || reveal.getTime() <= today.getTime()) return null;

  // Días disponibles entre hoy y reveal (inclusive hoy, no incluye día del reveal)
  const msInDay = 86_400_000;
  const daysAvailable = Math.max(
    1,
    Math.floor((reveal.setHours(12, 0, 0, 0) - today.getTime()) / msInDay),
  );

  // Repartimos las pistas entre los días disponibles.
  // Si hay más pistas que días, enviamos varias el mismo día (poco frecuente).
  // Si hay menos pistas que días, las distribuimos espaciadas.
  const slots: Slot[] = [];
  for (let i = 0; i < hints.length; i++) {
    const dayOffset = Math.floor((i * daysAvailable) / hints.length);
    const date = new Date(today.getTime() + dayOffset * msInDay);
    date.setHours(12, 0, 0, 0);
    const status: Slot['status'] =
      date.getTime() < today.getTime()
        ? 'past'
        : date.getTime() === today.getTime()
          ? 'today'
          : 'future';
    slots.push({ date, hint: hints[i], index: i, status });
  }

  // Encontrar la(s) pista(s) de HOY
  const todaySlots = slots.filter((s) => s.status === 'today');

  const buildWhatsAppUrl = (slot: Slot) => {
    const totalDaysLeft = Math.ceil((reveal.getTime() - today.getTime()) / msInDay);
    const text = [
      `✦ Pista ${slot.index + 1} de ${hints.length}`,
      '',
      `"${slot.hint}"`,
      '',
      totalDaysLeft === 1
        ? '¡Mañana se desvela todo! 🎁'
        : `Quedan ${totalDaysLeft} días para descubrir tu sorpresa.`,
      publicUrl ? '' : null,
      publicUrl ? publicUrl : null,
    ]
      .filter((l) => l !== null)
      .join('\n');
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div
      style={{
        background: 'var(--surface-card, #fff)',
        border: '1px solid rgba(255,90,95,.25)',
        borderLeft: '3px solid #FF5A5F',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 10 }}>
        <span
          className="font-mono uppercase flex items-center"
          style={{
            fontSize: 10,
            letterSpacing: '.18em',
            color: '#FF5A5F',
            gap: 6,
            fontWeight: 600,
          }}
        >
          <CalendarDays className="h-3 w-3" />
          Calendario de envío
        </span>
        <span className="font-mono text-graphite" style={{ fontSize: 10 }}>
          {daysAvailable} {daysAvailable === 1 ? 'día' : 'días'} restantes
        </span>
      </div>

      {/* Pista(s) de hoy: destacada */}
      {todaySlots.length > 0 ? (
        todaySlots.map((slot) => (
          <div
            key={slot.index}
            style={{
              background:
                'linear-gradient(135deg, rgba(255,90,95,.10) 0%, rgba(255,90,95,.04) 100%)',
              border: '1px solid rgba(255,90,95,.3)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 10,
            }}
          >
            <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 6 }}>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '.18em',
                  color: '#FF5A5F',
                  fontWeight: 700,
                }}
              >
                ✦ HOY · Pista {slot.index + 1} de {hints.length}
              </span>
              <a
                href={buildWhatsAppUrl(slot)}
                target="_blank"
                rel="noreferrer"
                className="transition-opacity hover:opacity-85"
                style={{
                  background: '#25D366',
                  color: '#fff',
                  borderRadius: 999,
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  textDecoration: 'none',
                }}
              >
                <Send className="h-3 w-3" />
                Enviar
              </a>
            </div>
            <p
              className="text-ink"
              style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}
            >
              "{slot.hint}"
            </p>
          </div>
        ))
      ) : (
        <p
          className="text-graphite"
          style={{
            fontSize: 12,
            fontStyle: 'italic',
            padding: '8px 0',
            marginBottom: 8,
          }}
        >
          No toca enviar pista hoy. La próxima:{' '}
          {(() => {
            const next = slots.find((s) => s.status === 'future');
            if (!next) return 'ninguna';
            return format(next.date, "d 'de' MMMM", { locale: es });
          })()}
        </p>
      )}

      {/* Vista compacta de los próximos días */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {slots
          .filter((s) => s.status !== 'today')
          .slice(0, 6)
          .map((slot) => (
            <li
              key={slot.index}
              className="flex items-center"
              style={{
                gap: 10,
                padding: '6px 4px',
                fontSize: 12,
                opacity: slot.status === 'past' ? 0.45 : 0.85,
                color: 'var(--color-ink)',
              }}
            >
              {slot.status === 'past' ? (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#1cb05c' }} />
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    borderRadius: '50%',
                    border: '1.5px dashed #c7c7cc',
                  }}
                />
              )}
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '.08em',
                  color: '#a1a1a6',
                  minWidth: 64,
                }}
              >
                {format(slot.date, 'd MMM', { locale: es })}
              </span>
              <span
                className="font-mono"
                style={{ fontSize: 10, color: '#FF5A5F', fontWeight: 700, minWidth: 28 }}
              >
                P{slot.index + 1}
              </span>
              <span
                style={{
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textDecoration: slot.status === 'past' ? 'line-through' : 'none',
                }}
              >
                {slot.hint}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
};
