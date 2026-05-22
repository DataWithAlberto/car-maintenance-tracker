import { useMemo, useState, useEffect } from 'react';
import { Activity, ChevronDown } from 'lucide-react';
import type { MaintenanceRecord, OBD2Reading, VehicleWithAccess } from '../../types';
import { predictFailures, predictFailuresWithOBD2 } from '../../utils/failurePrediction';
import { formatKm } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { obd2PersistenceService } from '../../services/obd2Persistence.service';

interface Props {
  vehicle: VehicleWithAccess;
  records: MaintenanceRecord[];
}

const STATUS_COLOR: Record<string, string> = {
  overdue: '#b64400',
  soon: '#c77700',
  ok: '#1a9e3f',
};
const STATUS_LABEL: Record<string, string> = {
  overdue: 'Vencido',
  soon: 'Pronto',
  ok: 'En vida útil',
};

// Reutiliza el Intl.NumberFormat cacheado en utils/formatters en lugar de
// crear una instancia nueva por render (14 componentes × cada repaint).
const fmtKm = (n: number) => formatKm(Math.abs(n));

export const FailureForecast = ({ vehicle, records }: Props) => {
  const [open, setOpen] = useState(true);
  const [obd2History, setObd2History] = useState<OBD2Reading[]>([]);

  useEffect(() => {
    let cancelled = false;
    obd2PersistenceService.getReadingHistory(vehicle.id, 720).then((history) => {
      if (!cancelled) setObd2History(history);
    });
    return () => {
      cancelled = true;
    };
  }, [vehicle.id]);

  const predictions = useMemo(
    () =>
      obd2History.length > 0
        ? predictFailuresWithOBD2(vehicle, records, obd2History)
        : predictFailures(vehicle, records),
    [vehicle, records, obd2History],
  );

  const critical = predictions.filter((p) => p.status !== 'ok').length;
  const hasObd2 = obd2History.length > 0;

  return (
    <div className="bg-snow border border-silver-mist rounded-[28px] p-6 mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 focus-ring rounded-lg"
      >
        <span
          className="inline-flex items-center gap-2 font-mono uppercase text-graphite"
          style={{ fontSize: 11, letterSpacing: '0.14em' }}
        >
          <Activity className="h-3.5 w-3.5" strokeWidth={1.7} />
          Predicción de desgaste · {fmtKm(vehicle.current_km)}
          {hasObd2 && (
            <span
              className="ml-1 rounded-full px-1.5 py-0.5"
              style={{
                fontSize: 9,
                background: '#e3f0e3',
                color: '#2f6b34',
                letterSpacing: '0.06em',
              }}
            >
              OBD2
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {critical > 0 && (
            <span className="font-text font-semibold" style={{ fontSize: 12, color: '#b64400' }}>
              {critical} a revisar
            </span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 text-graphite transition-transform', open && 'rotate-180')}
            strokeWidth={1.8}
          />
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-3.5">
          {predictions.map((p) => (
            <div key={p.key}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="shrink-0 h-2 w-2 rounded-full"
                    style={{ background: STATUS_COLOR[p.status] }}
                  />
                  <span
                    className="font-text text-ink font-medium truncate"
                    style={{ fontSize: 14 }}
                  >
                    {p.label}
                  </span>
                  {p.lastServiceKm === null && (
                    <span
                      className="font-mono uppercase text-graphite shrink-0"
                      style={{ fontSize: 9, letterSpacing: '0.08em' }}
                    >
                      sin registro
                    </span>
                  )}
                </span>
                <span
                  className="font-display text-ink tabular-nums shrink-0"
                  style={{ fontSize: 14, fontWeight: 600 }}
                >
                  {p.status === 'overdue'
                    ? `vencido hace ${fmtKm(p.kmRemaining)}`
                    : `en ${fmtKm(p.kmRemaining)}`}
                </span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: 4, background: 'var(--color-silver-mist)' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${p.lifeUsedPct}%`,
                    background: STATUS_COLOR[p.status],
                    borderRadius: 999,
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </div>
              <div
                className="flex justify-between mt-1 font-mono text-graphite"
                style={{ fontSize: 10, letterSpacing: '0.04em' }}
              >
                <span>
                  {STATUS_LABEL[p.status]} · {Math.round(p.lifeUsedPct)}% de vida
                </span>
                <span>cambio estimado a {fmtKm(p.predictedKm)}</span>
              </div>
            </div>
          ))}
          <p className="font-text text-graphite pt-1" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
            Estimación orientativa basada en vida útil típica de cada pieza y tu último registro. Tu
            conducción real puede variar el resultado.
          </p>
        </div>
      )}
    </div>
  );
};
