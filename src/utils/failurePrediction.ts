import type { MaintenanceRecord, Vehicle, FailurePrediction, FailureStatus } from '../types';

interface ComponentSpec {
  key: string;
  label: string;
  lifespanKm: number;
  matchTypes: string[];
}

/** Expected service life per component, in km. Based on typical OEM intervals. */
const COMPONENTS: ComponentSpec[] = [
  { key: 'oil',      label: 'Aceite y filtro',          lifespanKm: 15000,  matchTypes: ['Cambio de aceite'] },
  { key: 'air',      label: 'Filtro de aire',           lifespanKm: 25000,  matchTypes: ['Filtro de aire'] },
  { key: 'fuel',     label: 'Filtro de combustible',    lifespanKm: 40000,  matchTypes: ['Filtro de combustible'] },
  { key: 'cabin',    label: 'Filtro de habitáculo',     lifespanKm: 25000,  matchTypes: ['Filtro de habitáculo'] },
  { key: 'brake_f',  label: 'Pastillas freno delant.',  lifespanKm: 45000,  matchTypes: ['Frenos delanteros'] },
  { key: 'brake_r',  label: 'Pastillas freno trasero',  lifespanKm: 65000,  matchTypes: ['Frenos traseros'] },
  { key: 'tires',    label: 'Neumáticos',               lifespanKm: 45000,  matchTypes: ['Neumáticos'] },
  { key: 'battery',  label: 'Batería',                  lifespanKm: 80000,  matchTypes: ['Batería'] },
  { key: 'spark',    label: 'Bujías',                   lifespanKm: 50000,  matchTypes: ['Bujías'] },
  { key: 'timing',   label: 'Correa de distribución',   lifespanKm: 110000, matchTypes: ['Correa de distribución'] },
  { key: 'shock',    label: 'Amortiguadores',           lifespanKm: 90000,  matchTypes: ['Amortiguadores', 'Suspensión'] },
  { key: 'clutch',   label: 'Embrague',                 lifespanKm: 160000, matchTypes: ['Embrague'] },
  { key: 'brake_fl', label: 'Líquido de frenos',        lifespanKm: 60000,  matchTypes: ['Líquido de frenos'] },
  { key: 'coolant',  label: 'Líquido refrigerante',     lifespanKm: 90000,  matchTypes: ['Líquido refrigerante'] },
];

/**
 * Predicts when each component is likely to need replacement, by crossing the
 * vehicle's current odometer with the last recorded service for that component
 * and its typical service life. Components never serviced are assumed original
 * (baseline 0 km).
 */
export const predictFailures = (
  vehicle: Vehicle,
  records: MaintenanceRecord[],
): FailurePrediction[] => {
  const km = vehicle.current_km;

  return COMPONENTS
    .map((c): FailurePrediction => {
      const matching = records.filter((r) => c.matchTypes.includes(r.type));
      const lastServiceKm = matching.length
        ? Math.max(...matching.map((r) => r.km_at_service))
        : null;
      const baseline = lastServiceKm ?? 0;
      const predictedKm = baseline + c.lifespanKm;
      const kmRemaining = predictedKm - km;
      const lifeUsedPct = Math.min(
        100,
        Math.max(0, ((km - baseline) / c.lifespanKm) * 100),
      );
      const status: FailureStatus =
        kmRemaining <= 0 ? 'overdue' : lifeUsedPct >= 85 ? 'soon' : 'ok';
      return {
        key: c.key,
        label: c.label,
        lifespanKm: c.lifespanKm,
        lastServiceKm,
        predictedKm,
        kmRemaining,
        lifeUsedPct,
        status,
      };
    })
    .sort((a, b) => a.kmRemaining - b.kmRemaining);
};
