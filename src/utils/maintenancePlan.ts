import type { MaintenanceRecord, Vehicle } from '../types';

export type PlanStatus = 'overdue' | 'soon' | 'upcoming' | 'ok';

export interface MaintenancePlanItem {
  key: string;
  label: string;
  intervalKm: number;
  intervalMonths: number;
  lastServiceKm: number | null;
  lastServiceDate: string | null;
  dueKm: number;
  dueDate: string;
  kmRemaining: number;
  daysRemaining: number;
  status: PlanStatus;
}

interface ServiceSpec {
  key: string;
  label: string;
  intervalKm: number;
  intervalMonths: number;
  matchTypes: string[];
}

/** Standard OEM service intervals. Adjusted against the owner's real history. */
const SERVICES: ServiceSpec[] = [
  { key: 'oil',     label: 'Cambio de aceite y filtro', intervalKm: 15000,  intervalMonths: 12,  matchTypes: ['Cambio de aceite'] },
  { key: 'air',     label: 'Filtro de aire',            intervalKm: 30000,  intervalMonths: 24,  matchTypes: ['Filtro de aire'] },
  { key: 'cabin',   label: 'Filtro de habitáculo',      intervalKm: 25000,  intervalMonths: 12,  matchTypes: ['Filtro de habitáculo'] },
  { key: 'fuel',    label: 'Filtro de combustible',     intervalKm: 40000,  intervalMonths: 48,  matchTypes: ['Filtro de combustible'] },
  { key: 'brake_f', label: 'Frenos delanteros',         intervalKm: 45000,  intervalMonths: 48,  matchTypes: ['Frenos delanteros'] },
  { key: 'brake_r', label: 'Frenos traseros',           intervalKm: 65000,  intervalMonths: 60,  matchTypes: ['Frenos traseros'] },
  { key: 'brakefl', label: 'Líquido de frenos',         intervalKm: 60000,  intervalMonths: 24,  matchTypes: ['Líquido de frenos'] },
  { key: 'coolant', label: 'Líquido refrigerante',      intervalKm: 90000,  intervalMonths: 48,  matchTypes: ['Líquido refrigerante'] },
  { key: 'spark',   label: 'Bujías',                    intervalKm: 50000,  intervalMonths: 60,  matchTypes: ['Bujías'] },
  { key: 'tires',   label: 'Neumáticos',                intervalKm: 45000,  intervalMonths: 72,  matchTypes: ['Neumáticos'] },
  { key: 'battery', label: 'Batería',                   intervalKm: 80000,  intervalMonths: 60,  matchTypes: ['Batería'] },
  { key: 'timing',  label: 'Correa de distribución',    intervalKm: 110000, intervalMonths: 120, matchTypes: ['Correa de distribución'] },
  { key: 'shock',   label: 'Amortiguadores',            intervalKm: 90000,  intervalMonths: 96,  matchTypes: ['Amortiguadores', 'Suspensión'] },
  { key: 'itv',     label: 'Inspección técnica (ITV)',  intervalKm: 999999, intervalMonths: 12,  matchTypes: ['Revisión ITV'] },
];

const DAY_MS = 86400000;
const DEFAULT_KM_PER_DAY = 12000 / 365;

/**
 * Estimates the vehicle's daily mileage from the service history. Uses the km
 * spread between the earliest and latest records over their elapsed time;
 * falls back to ~12.000 km/year when there is not enough data.
 */
export const estimateKmPerDay = (records: MaintenanceRecord[]): number => {
  const points = records
    .filter((r) => r.km_at_service > 0)
    .map((r) => ({ km: r.km_at_service, t: new Date(r.date).getTime() }))
    .sort((a, b) => a.t - b.t);
  if (points.length < 2) return DEFAULT_KM_PER_DAY;

  const first = points[0];
  const last = points[points.length - 1];
  const days = (last.t - first.t) / DAY_MS;
  const km = last.km - first.km;
  if (days < 30 || km <= 0) return DEFAULT_KM_PER_DAY;

  const rate = km / days;
  // Clamp to a sane band (1.000–60.000 km/year) to avoid wild projections.
  return Math.min(60000 / 365, Math.max(1000 / 365, rate));
};

/**
 * Builds the predictive maintenance plan: for each service, the next due km
 * and date, derived from the last record (or the vehicle baseline) plus the
 * OEM interval, projected through the estimated daily mileage.
 */
export const buildMaintenancePlan = (
  vehicle: Vehicle,
  records: MaintenanceRecord[],
): MaintenancePlanItem[] => {
  const km = vehicle.current_km;
  const kmPerDay = estimateKmPerDay(records);
  const now = Date.now();

  return SERVICES
    .map((s): MaintenancePlanItem => {
      const matching = records
        .filter((r) => s.matchTypes.includes(r.type))
        .sort((a, b) => b.km_at_service - a.km_at_service);
      const last = matching[0] ?? null;
      const lastServiceKm = last ? last.km_at_service : null;
      const lastServiceDate = last ? last.date : null;

      const baseKm = lastServiceKm ?? 0;
      const dueKm = baseKm + s.intervalKm;
      const kmRemaining = dueKm - km;

      // Date due by km projection.
      const dueByKmMs = now + (kmRemaining / kmPerDay) * DAY_MS;
      // Date due by elapsed time since last service.
      const dueByTimeMs = lastServiceDate
        ? new Date(lastServiceDate).getTime() + s.intervalMonths * 30.44 * DAY_MS
        : Infinity;

      const dueMs = s.intervalKm >= 999999
        ? dueByTimeMs // time-only services (ITV)
        : Math.min(dueByKmMs, dueByTimeMs);
      const dueDate = new Date(Number.isFinite(dueMs) ? dueMs : dueByKmMs);
      const daysRemaining = Math.round((dueDate.getTime() - now) / DAY_MS);

      const effectiveKmRemaining = s.intervalKm >= 999999 ? Infinity : kmRemaining;
      const status: PlanStatus =
        effectiveKmRemaining <= 0 || daysRemaining <= 0 ? 'overdue'
        : (effectiveKmRemaining <= 2000 || daysRemaining <= 45) ? 'soon'
        : (effectiveKmRemaining <= 8000 || daysRemaining <= 150) ? 'upcoming'
        : 'ok';

      return {
        key: s.key,
        label: s.label,
        intervalKm: s.intervalKm,
        intervalMonths: s.intervalMonths,
        lastServiceKm,
        lastServiceDate,
        dueKm,
        dueDate: dueDate.toISOString(),
        kmRemaining,
        daysRemaining,
        status,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
};
