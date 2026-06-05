import { AlertTriangle, CalendarClock, FileText, Share2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CARD, EYEBROW, FOCUS_RING } from './styles';
import type { Alert, AlertSeverity } from '../../types';

interface AlertCenterProps {
  alerts: Alert[];
  onNavigate: (href: string) => void;
}

const severityLabel: Record<AlertSeverity, string> = {
  high: 'Crítica',
  medium: 'Aviso',
  low: 'Info',
};

const severityColor: Record<AlertSeverity, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-sky-400',
};

const alertRoute = (alert: Alert) =>
  alert.type.startsWith('document') ? '/documents' : '/maintenance';

const alertIcon = (alert: Alert) => {
  if (alert.type.startsWith('document')) return FileText;
  if (alert.type.includes('date')) return CalendarClock;
  return AlertTriangle;
};

const rank: Record<AlertSeverity, number> = { high: 0, medium: 1, low: 2 };

/** Centro de alertas: lista priorizada por severidad (dark-tech). */
export const AlertCenter = ({ alerts, onNavigate }: AlertCenterProps) => {
  if (alerts.length === 0) return null;

  const sortedAlerts = [...alerts].sort(
    (a, b) => rank[a.severity ?? 'low'] - rank[b.severity ?? 'low'],
  );

  return (
    <section className={cn(CARD, 'p-5 sm:p-6')} aria-label="Centro de alertas">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className={cn(EYEBROW, 'text-red-400')}>Centro de alertas</span>
          <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white">
            {alerts.length} pendiente{alerts.length === 1 ? '' : 's'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/sharing')}
          className={cn(
            FOCUS_RING,
            'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-slate-200',
            'transition-colors duration-200 hover:bg-white/10 hover:text-white',
          )}
        >
          <Share2 className="h-4 w-4" strokeWidth={1.8} />
          Compartir con taller
        </button>
      </div>

      <div className="mt-5 grid gap-2.5">
        {sortedAlerts.slice(0, 5).map((alert) => {
          const Icon = alertIcon(alert);
          const severity = alert.severity ?? 'low';
          return (
            <div
              key={alert.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <span
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5',
                  severityColor[severity],
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <span
                  className={cn(
                    'block font-mono text-[9px] uppercase tracking-[0.16em]',
                    severityColor[severity],
                  )}
                >
                  {severityLabel[severity]}
                </span>
                <p className="mt-0.5 truncate text-sm text-slate-200">{alert.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(alertRoute(alert))}
                className={cn(
                  FOCUS_RING,
                  'rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-slate-900',
                  'transition-colors duration-200 hover:bg-slate-200',
                )}
              >
                Atender
              </button>
            </div>
          );
        })}
      </div>

      {alerts.length > 5 && (
        <p className="mt-3 text-xs text-slate-500">
          Mostrando las 5 más importantes. Entra en mantenimiento o documentos para ver el resto.
        </p>
      )}
    </section>
  );
};
