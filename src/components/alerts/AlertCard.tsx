import { X } from 'lucide-react';
import type { Alert } from '../../types';
import { cn } from '../../utils/cn';

/* ─── Apple-style alert ──────────────────────────────────────────────────────
 *
 * Neutral surface across all severities. The only chromatic notes are:
 *   1) a 3px left bar in the severity color
 *   2) a 6px dot inline with the mono label
 *
 * The rest stays achromatic — Apple uses color sparingly as a semantic
 * accent, never as a fill that competes with the page content.
 *
 * - Surface: #ffffff snow + 1px var(--color-silver-mist) silver border, 14px radius.
 * - Severity bar: 3px, full-height, on the left edge.
 * - Label: JetBrains Mono 500 11/.14em uppercase, severity-colored.
 * - Body: SF Pro Text 15/400 var(--color-ink).
 * - Zero box-shadows.
 * ──────────────────────────────────────────────────────────────────────────── */

const severityConfig = {
  high:   { label: 'CRÍTICO', color: '#b64400' /* ember  */ },
  medium: { label: 'AVISO',   color: '#c77700' /* warn   */ },
  low:    { label: 'INFO',    color: '#0066cc' /* cobalt */ },
};

interface Props {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

export const AlertCard = ({ alert, onDismiss }: Props) => {
  const cfg = severityConfig[alert.severity ?? 'low'];

  return (
    <div
      className={cn(
        'relative flex items-start gap-3',
        'pl-4 pr-3 py-3',
        'bg-snow border border-silver-mist rounded-[14px]',
        'overflow-hidden',
      )}
    >
      {/* Severity bar */}
      <span
        className="absolute left-0 inset-y-0"
        style={{ width: 3, background: cfg.color }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="rounded-full inline-block"
            style={{ width: 6, height: 6, background: cfg.color }}
            aria-hidden="true"
          />
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.14em',
              color: cfg.color,
              lineHeight: 1,
            }}
          >
            {cfg.label}
          </span>
        </div>
        <p
          className="font-text text-ink"
          style={{
            fontSize: 15,
            fontWeight: 400,
            lineHeight: 1.45,
            letterSpacing: '-0.1px',
          }}
        >
          {alert.description}
        </p>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className={cn(
            'shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full',
            'text-graphite hover:text-ink hover:bg-fog transition-colors duration-150',
          )}
          aria-label="Descartar alerta"
        >
          <X className="h-4 w-4" strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
};
