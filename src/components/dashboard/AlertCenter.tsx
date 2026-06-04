import { AlertTriangle, CalendarClock, FileText, Share2 } from 'lucide-react';
import type { Alert } from '../../types';

interface AlertCenterProps {
  alerts: Alert[];
  onNavigate: (href: string) => void;
}

const severityLabel = {
  high: 'Crítica',
  medium: 'Aviso',
  low: 'Info',
};

const severityColor = {
  high: 'var(--color-caution)',
  medium: 'var(--color-warn-500)',
  low: 'var(--color-azure)',
};

const alertRoute = (alert: Alert) =>
  alert.type.startsWith('document') ? '/documents' : '/maintenance';

const alertIcon = (alert: Alert) => {
  if (alert.type.startsWith('document')) return FileText;
  if (alert.type.includes('date')) return CalendarClock;
  return AlertTriangle;
};

export const AlertCenter = ({ alerts, onNavigate }: AlertCenterProps) => {
  if (alerts.length === 0) return null;

  const sortedAlerts = [...alerts].sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.severity ?? 'low'] - rank[b.severity ?? 'low'];
  });

  return (
    <section
      className="mx-5 md:mx-10 mt-5 bg-snow border border-silver-mist rounded-[20px]"
      aria-label="Centro de alertas"
      style={{ padding: 22 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--color-caution)' }}
          >
            Centro de alertas
          </span>
          <h2
            className="font-display text-ink"
            style={{ fontWeight: 650, fontSize: 26, lineHeight: 1.08, marginTop: 8 }}
          >
            {alerts.length} pendiente{alerts.length === 1 ? '' : 's'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/sharing')}
          className="focus-ring"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid var(--color-silver-mist)',
            borderRadius: 999,
            background: 'var(--color-snow)',
            padding: '8px 12px',
            color: 'var(--color-ink)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Share2 className="h-4 w-4" strokeWidth={1.7} />
          Compartir con taller
        </button>
      </div>

      <div className="mt-5 grid gap-2">
        {sortedAlerts.slice(0, 5).map((alert) => {
          const Icon = alertIcon(alert);
          const severity = alert.severity ?? 'low';
          return (
            <div
              key={alert.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 12,
                border: '1px solid var(--color-silver-mist)',
                borderRadius: 16,
                padding: 12,
                background: 'var(--color-fog)',
              }}
            >
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: 34,
                  height: 34,
                  background: 'var(--color-snow)',
                  color: severityColor[severity],
                }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <span
                  className="font-mono uppercase"
                  style={{
                    display: 'block',
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    color: severityColor[severity],
                  }}
                >
                  {severityLabel[severity]}
                </span>
                <p
                  className="font-text text-ink"
                  style={{ fontSize: 14, lineHeight: 1.35, margin: '3px 0 0' }}
                >
                  {alert.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(alertRoute(alert))}
                className="focus-ring"
                style={{
                  border: 0,
                  borderRadius: 999,
                  background: 'var(--color-ink)',
                  color: 'var(--color-snow)',
                  padding: '8px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Atender
              </button>
            </div>
          );
        })}
      </div>
      {alerts.length > 5 && (
        <p className="font-text text-graphite mt-3" style={{ fontSize: 12.5 }}>
          Mostrando las 5 más importantes. Entra en mantenimiento o documentos para ver el resto.
        </p>
      )}
    </section>
  );
};
