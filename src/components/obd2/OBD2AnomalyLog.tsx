import { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { OBD2Anomaly } from '../../types';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface Props {
  anomalies: OBD2Anomaly[];
  onDismiss: (anomalyId: string) => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  warn: '#c77700',
  critical: '#d70015',
};

const SEVERITY_LABEL: Record<string, string> = {
  warn: 'Advertencia',
  critical: 'Crítico',
};

export const OBD2AnomalyLog = ({ anomalies, onDismiss }: Props) => {
  const [filter, setFilter] = useState<'all' | 'warn' | 'critical'>('all');

  const filtered = anomalies.filter((a) => filter === 'all' || a.severity === filter);

  const handleDismiss = (id: string) => {
    onDismiss(id);
    toast.success('Anomalía marcada como revisada');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'warn', 'critical'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-text transition-all ${
              filter === f ? 'bg-ink text-snow' : 'bg-fog text-graphite hover:bg-silver-mist'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'warn' ? 'Advertencias' : 'Críticas'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center gap-3 bg-fog rounded-[18px] px-5 py-4">
          <CheckCircle2
            className="h-5 w-5 shrink-0"
            style={{ color: '#1a9e3f' }}
            strokeWidth={1.7}
          />
          <p className="font-text text-ink" style={{ fontSize: 15 }}>
            {filter === 'all'
              ? 'Sin anomalías detectadas'
              : `Sin ${filter === 'warn' ? 'advertencias' : 'alertas críticas'}`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((anomaly) => (
            <div
              key={anomaly.id}
              className="flex items-start gap-3 rounded-[14px] px-4 py-3"
              style={{
                background: anomaly.dismissed
                  ? 'var(--color-fog)'
                  : `${SEVERITY_COLOR[anomaly.severity]}20`,
                border: `1px solid ${anomaly.dismissed ? 'var(--color-silver-mist)' : SEVERITY_COLOR[anomaly.severity]}40`,
                opacity: anomaly.dismissed ? 0.6 : 1,
              }}
            >
              <div className="shrink-0 mt-0.5">
                <AlertTriangle
                  className="h-5 w-5"
                  style={{ color: SEVERITY_COLOR[anomaly.severity] }}
                  strokeWidth={1.6}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="font-mono uppercase text-ink text-xs"
                    style={{ letterSpacing: '0.1em', color: SEVERITY_COLOR[anomaly.severity] }}
                  >
                    {SEVERITY_LABEL[anomaly.severity]}
                  </span>
                  <span className="font-text text-graphite text-xs">
                    {anomaly.created_at
                      ? new Date(anomaly.created_at).toLocaleString('es-ES')
                      : 'Ahora'}
                  </span>
                </div>
                <p className="font-text text-ink" style={{ fontSize: 14, lineHeight: 1.45 }}>
                  {anomaly.message}
                </p>
                <p className="font-text text-graphite mt-1" style={{ fontSize: 12 }}>
                  Umbral: {anomaly.threshold} · Valor actual: {anomaly.value}
                </p>
              </div>
              {!anomaly.dismissed && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => anomaly.id && handleDismiss(anomaly.id)}
                  iconLeft={<X className="h-3.5 w-3.5" strokeWidth={2} />}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
