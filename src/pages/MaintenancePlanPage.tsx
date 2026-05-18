import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Wrench, Sparkles } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { maintenanceService } from '../services/maintenance.service';
import {
  buildMaintenancePlan,
  estimateKmPerDay,
  describePlanAdaptations,
  detectEngineProfile,
  type PlanStatus,
} from '../utils/maintenancePlan';
import type { MaintenanceRecord } from '../types';
import { formatDate, formatKm } from '../utils/formatters';

const STATUS_META: Record<PlanStatus, { label: string; color: string }> = {
  overdue: { label: 'Vencido', color: '#b64400' },
  soon: { label: 'Muy pronto', color: '#c77700' },
  upcoming: { label: 'Próximo', color: '#0071e3' },
  ok: { label: 'Al día', color: '#1a9e3f' },
};

export const MaintenancePlanPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const navigate = useNavigate();

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    setLoading(true);
    maintenanceService.getByVehicle(selectedVehicle.id)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [selectedVehicle?.id]);

  const plan = useMemo(
    () => (selectedVehicle ? buildMaintenancePlan(selectedVehicle, records) : []),
    [selectedVehicle, records],
  );
  const kmPerYear = useMemo(
    () => Math.round(estimateKmPerDay(records) * 365),
    [records],
  );
  const adaptations = useMemo(
    () => (selectedVehicle ? describePlanAdaptations(selectedVehicle) : []),
    [selectedVehicle],
  );
  const engineProfile = useMemo(
    () => (selectedVehicle ? detectEngineProfile(selectedVehicle) : null),
    [selectedVehicle],
  );

  if (!selectedVehicle) return null;

  const traits = [
    selectedVehicle.fuel_type,
    selectedVehicle.transmission,
    `${selectedVehicle.year}`,
  ].filter(Boolean);

  const attention = plan.filter((p) => p.status === 'overdue' || p.status === 'soon').length;

  return (
    <div className="px-6 sm:px-10 py-10">
      <header className="flex items-end justify-between mb-10 gap-6 flex-wrap">
        <div>
          <span className="eyebrow">
            {selectedVehicle.brand} {selectedVehicle.model}
            {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 56px)',
              lineHeight: 1.07,
              letterSpacing: '-0.9px',
              margin: '12px 0 0',
            }}
          >
            Plan predictivo.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            <span className="text-ink font-medium tabular-nums">{attention}</span> servicios requieren atención ·
            ritmo estimado <span className="text-ink font-medium tabular-nums">{formatKm(kmPerYear)}/año</span>
          </p>
        </div>
      </header>

      {adaptations.length > 0 && (
        <div className="bg-snow border border-silver-mist rounded-[28px] p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-graphite" strokeWidth={1.7} />
            <span
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 11, letterSpacing: '0.14em' }}
            >
              Plan adaptado a este vehículo
            </span>
          </div>
          {(traits.length > 0 || engineProfile) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {engineProfile && (
                <span
                  className="font-text text-snow bg-ink rounded-full px-3 py-1"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  Perfil de motor: {engineProfile.label}
                </span>
              )}
              {traits.map((t) => (
                <span
                  key={t}
                  className="font-text text-ink bg-fog rounded-full px-3 py-1"
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <ul className="space-y-1.5">
            {adaptations.map((note) => (
              <li
                key={note}
                className="font-text text-graphite flex gap-2"
                style={{ fontSize: 13, lineHeight: 1.5 }}
              >
                <span className="text-ink shrink-0">·</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : plan.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sin plan disponible"
          description="No se pudo generar el plan de mantenimiento para este vehículo."
        />
      ) : (
        <>
          <ul className="space-y-2">
            {plan.map((item, i) => {
              const meta = STATUS_META[item.status];
              const timeOnly = item.timeBased;
              return (
                <li
                  key={item.key}
                  className="stagger-item bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center gap-4"
                  style={{ '--i': Math.min(i, 10) } as CSSProperties}
                >
                  <div className="shrink-0 h-11 w-11 rounded-[10px] bg-fog flex items-center justify-center relative">
                    <Wrench className="h-5 w-5 text-ink" strokeWidth={1.6} />
                    <span
                      className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-snow"
                      style={{ background: meta.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-text text-ink font-medium" style={{ fontSize: 15 }}>
                        {item.label}
                      </p>
                      <span
                        className="font-mono uppercase"
                        style={{ fontSize: 10, letterSpacing: '0.12em', color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-graphite font-text flex-wrap" style={{ fontSize: 13 }}>
                      <span>
                        {item.lastServiceDate
                          ? `Último: ${formatDate(item.lastServiceDate)}`
                          : 'Sin registro previo'}
                        {item.lastServiceKm != null ? ` · ${formatKm(item.lastServiceKm)}` : ''}
                      </span>
                      <span className="text-silver-mist">·</span>
                      <span>
                        Cada {timeOnly
                          ? `${item.intervalMonths} meses`
                          : `${formatKm(item.intervalKm)} o ${item.intervalMonths} meses`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="font-display text-ink font-semibold tabular-nums block"
                      style={{ fontSize: 15, letterSpacing: '-0.1px' }}
                    >
                      {item.status === 'overdue'
                        ? 'Vencido'
                        : formatDate(item.dueDate)}
                    </span>
                    <span className="font-text text-graphite" style={{ fontSize: 11 }}>
                      {timeOnly
                        ? (item.daysRemaining > 0 ? `en ${item.daysRemaining} días` : 'revisar ya')
                        : (item.kmRemaining > 0
                            ? `en ${formatKm(item.kmRemaining)}`
                            : `excedido ${formatKm(Math.abs(item.kmRemaining))}`)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="font-text text-graphite mt-6" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Estimación orientativa basada en intervalos OEM típicos, tu historial de mantenimiento
            y el ritmo de uso calculado. La conducción real puede variar el resultado.
          </p>
        </>
      )}
    </div>
  );
};
