import type { MaintenanceRecord, Vehicle } from '../types';

export type PlanStatus = 'overdue' | 'soon' | 'upcoming' | 'ok';

export interface MaintenancePlanItem {
  key: string;
  label: string;
  intervalKm: number;
  intervalMonths: number;
  timeBased: boolean;
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
  timeBased: boolean;
  matchTypes: string[];
}

// ─── Vehicle trait helpers ────────────────────────────────────────────────────

const norm = (s?: string): string => (s ?? '').toLowerCase();

const isElectric = (v: Vehicle): boolean => /el[eé]ctric/.test(norm(v.fuel_type));
const isDiesel = (v: Vehicle): boolean => /di[eé]s/.test(norm(v.fuel_type));
const isHybrid = (v: Vehicle): boolean => /h[ií]brid|hybrid/.test(norm(v.fuel_type));
const isManual = (v: Vehicle): boolean => /manual/.test(norm(v.transmission));

/** Mild hybrids (48V MHEV) have no meaningful regenerative braking. */
const isMildHybrid = (v: Vehicle): boolean =>
  /mhev|mild/.test(`${norm(v.model)} ${norm(v.fuel_type)}`);

const hasCombustionEngine = (v: Vehicle): boolean => !isElectric(v);
const hasSparkPlugs = (v: Vehicle): boolean => hasCombustionEngine(v) && !isDiesel(v);
/** Full hybrids and EVs recover braking energy; mild hybrids do not. */
const hasRegenBraking = (v: Vehicle): boolean =>
  (isHybrid(v) || isElectric(v)) && !isMildHybrid(v);

/** Clutch is excluded only when the gearbox is explicitly automatic-type. */
const hasClutch = (v: Vehicle): boolean => {
  const t = norm(v.transmission);
  return !(t.includes('autom') || t.includes('cvt') || t.includes('semi'));
};

export const vehicleAgeYears = (v: Vehicle): number =>
  Math.max(0, new Date().getFullYear() - v.year);

/** Spain's ITV cadence for passenger cars, by vehicle age. */
const itvIntervalMonths = (age: number): number =>
  age >= 10 ? 12 : age >= 4 ? 24 : 48;

const DAY_MS = 86400000;
const MONTH_MS = 30.44 * DAY_MS;
const DEFAULT_KM_PER_DAY = 12000 / 365;

// ─── Engine profiles ──────────────────────────────────────────────────────────
// Specific engines whose maintenance differs from the generic OEM template.
// Detected from the free-text `model` field of the vehicle.

interface EngineProfile {
  id: string;
  label: string;
  matches: (v: Vehicle) => boolean;
  notes: (v: Vehicle) => string[];
  apply: (specs: ServiceSpec[], v: Vehicle) => ServiceSpec[];
}

/**
 * The redesigned 1.0 EcoBoost — the MHEV variant and the 2020+ refresh — drops
 * the troublesome wet (oil-bath) timing belt for a maintenance-free chain.
 * Earlier units still run the wet belt.
 */
const ecoboostHasTimingChain = (v: Vehicle): boolean =>
  isMildHybrid(v) || v.year >= 2020;

/**
 * Ford 1.0 EcoBoost — three-cylinder turbo (incl. the 155 cv MHEV). Tight oil
 * intervals matter on every variant; the timing setup (chain vs wet belt)
 * depends on the engine generation.
 */
const FORD_1L_ECOBOOST: EngineProfile = {
  id: 'ford-1.0-ecoboost',
  label: 'Ford 1.0 EcoBoost',
  matches: (v) => {
    const m = norm(v.model);
    return /ecoboost/.test(m) && /1[.,]?0/.test(m);
  },
  notes: (v) =>
    ecoboostHasTimingChain(v)
      ? [
          'Distribución por cadena (variante MHEV / rediseño 2020+): sin sustitución por intervalo, se vigila por síntomas.',
          'Cambio de aceite cada 10.000 km / 12 meses: una cadena estirada suele venir de aceite degradado (usa 0W-20 Ford WSS-M2C950-A).',
        ]
      : [
          'Correa de distribución bañada en aceite (wet belt): intervalo acortado a 150.000 km u 8 años por su degradación conocida.',
          'Cambio de aceite cada 10.000 km / 12 meses: crítico para preservar la correa húmeda (usa 0W-20 Ford WSS-M2C950-A).',
        ],
  apply: (specs, v) => {
    const chain = ecoboostHasTimingChain(v);
    return specs
      // A timing chain has no scheduled replacement — drop the item entirely.
      .filter((s) => !(s.key === 'timing' && chain))
      .map((s) => {
        if (s.key === 'oil') {
          return { ...s, intervalKm: 10000, intervalMonths: 12 };
        }
        if (s.key === 'timing') {
          return {
            ...s,
            label: 'Correa de distribución (bañada en aceite)',
            intervalKm: 150000,
            intervalMonths: 96,
          };
        }
        return s;
      });
  },
};

const ENGINE_PROFILES: EngineProfile[] = [FORD_1L_ECOBOOST];

const findEngineProfile = (v: Vehicle): EngineProfile | null =>
  ENGINE_PROFILES.find((profile) => profile.matches(v)) ?? null;

/** Returns the matching engine profile for the vehicle, if any. */
export const detectEngineProfile = (
  v: Vehicle,
): { id: string; label: string; notes: string[] } | null => {
  const p = findEngineProfile(v);
  return p ? { id: p.id, label: p.label, notes: p.notes(v) } : null;
};

/**
 * Builds the list of services that physically apply to this vehicle, with the
 * OEM intervals already adjusted to its fuel type, gearbox and age.
 */
const buildServiceSpecs = (v: Vehicle): ServiceSpec[] => {
  const specs: ServiceSpec[] = [];
  const combustion = hasCombustionEngine(v);
  const diesel = isDiesel(v);
  const age = vehicleAgeYears(v);
  const brakeMul = hasRegenBraking(v) ? 1.6 : 1;

  if (combustion) {
    specs.push({
      key: 'oil',
      label: 'Cambio de aceite y filtro',
      // Older engines run shorter, more conservative oil intervals.
      intervalKm: age > 12 ? 10000 : 15000,
      intervalMonths: 12,
      timeBased: false,
      matchTypes: ['Cambio de aceite'],
    });
    specs.push({
      key: 'air',
      label: 'Filtro de aire',
      intervalKm: 30000,
      intervalMonths: 24,
      timeBased: false,
      matchTypes: ['Filtro de aire'],
    });
    specs.push({
      key: 'fuel',
      label: 'Filtro de combustible',
      // Diesel fuel filters clog faster and are serviced more often.
      intervalKm: diesel ? 30000 : 40000,
      intervalMonths: diesel ? 24 : 48,
      timeBased: false,
      matchTypes: ['Filtro de combustible'],
    });
    specs.push({
      key: 'timing',
      label: 'Correa de distribución',
      intervalKm: 110000,
      intervalMonths: 120,
      timeBased: false,
      matchTypes: ['Correa de distribución'],
    });
  }

  specs.push({
    key: 'cabin',
    label: 'Filtro de habitáculo',
    intervalKm: 25000,
    intervalMonths: 12,
    timeBased: false,
    matchTypes: ['Filtro de habitáculo'],
  });

  specs.push({
    key: 'brake_f',
    label: 'Frenos delanteros',
    intervalKm: Math.round(45000 * brakeMul),
    intervalMonths: 48,
    timeBased: false,
    matchTypes: ['Frenos delanteros'],
  });
  specs.push({
    key: 'brake_r',
    label: 'Frenos traseros',
    intervalKm: Math.round(65000 * brakeMul),
    intervalMonths: 60,
    timeBased: false,
    matchTypes: ['Frenos traseros'],
  });
  specs.push({
    key: 'brakefl',
    label: 'Líquido de frenos',
    intervalKm: 60000,
    intervalMonths: 24,
    timeBased: false,
    matchTypes: ['Líquido de frenos'],
  });
  specs.push({
    key: 'coolant',
    label: 'Líquido refrigerante',
    intervalKm: 90000,
    intervalMonths: 48,
    timeBased: false,
    matchTypes: ['Líquido refrigerante'],
  });

  if (hasSparkPlugs(v)) {
    specs.push({
      key: 'spark',
      label: 'Bujías',
      intervalKm: 50000,
      intervalMonths: 60,
      timeBased: false,
      matchTypes: ['Bujías'],
    });
  }

  specs.push({
    key: 'tires',
    label: 'Neumáticos',
    intervalKm: 45000,
    intervalMonths: 72,
    timeBased: false,
    matchTypes: ['Neumáticos'],
  });
  specs.push({
    key: 'battery',
    label: 'Batería',
    intervalKm: 80000,
    intervalMonths: 60,
    timeBased: false,
    matchTypes: ['Batería'],
  });
  specs.push({
    key: 'shock',
    label: 'Amortiguadores',
    intervalKm: 90000,
    intervalMonths: 96,
    timeBased: false,
    matchTypes: ['Amortiguadores', 'Suspensión'],
  });

  if (hasClutch(v)) {
    specs.push({
      key: 'clutch',
      label: 'Embrague',
      intervalKm: 160000,
      intervalMonths: 180,
      timeBased: false,
      matchTypes: ['Embrague'],
    });
  }

  specs.push({
    key: 'itv',
    label: 'Inspección técnica (ITV)',
    intervalKm: 999999,
    intervalMonths: itvIntervalMonths(age),
    timeBased: true,
    matchTypes: ['Revisión ITV'],
  });

  // Apply engine-specific overrides on top of the generic template.
  const profile = findEngineProfile(v);
  return profile ? profile.apply(specs, v) : specs;
};

/**
 * Human-readable summary of how the plan was tailored to this vehicle. Drives
 * the "adaptaciones" panel in the UI.
 */
export const describePlanAdaptations = (v: Vehicle): string[] => {
  const notes: string[] = [];
  const age = vehicleAgeYears(v);
  const profile = findEngineProfile(v);

  if (isElectric(v)) {
    notes.push('Vehículo eléctrico: se omiten aceite, filtros de aire y combustible, bujías y correa de distribución.');
    notes.push('Frenos con intervalo ampliado un 60 % por el frenado regenerativo.');
  } else if (isHybrid(v) && !isMildHybrid(v)) {
    notes.push('Híbrido completo: frenos con intervalo ampliado un 60 % por el frenado regenerativo.');
  }

  if (isMildHybrid(v)) {
    notes.push('Hibridación ligera (MHEV 48 V): sin frenado regenerativo relevante; los frenos mantienen el intervalo estándar.');
  }

  if (isDiesel(v)) {
    notes.push('Motor diésel: filtro de combustible cada 30.000 km; sin bujías.');
  }

  if (hasClutch(v) && isManual(v)) {
    notes.push('Cambio manual: se incluye el embrague en el plan.');
  } else if (!hasClutch(v)) {
    notes.push('Cambio automático: se omite el embrague.');
  }

  if (hasCombustionEngine(v) && age > 12 && !profile) {
    notes.push(`Vehículo de ${age} años: cambio de aceite acortado a 10.000 km.`);
  }

  if (profile) {
    notes.push(...profile.notes(v));
  }

  notes.push(`ITV cada ${itvIntervalMonths(age)} meses según la antigüedad del vehículo (${age} años).`);

  return notes;
};

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
 * Builds the predictive maintenance plan. Services are selected and their
 * intervals tuned to the vehicle's traits; each due date is derived from the
 * last record (or the vehicle's registration baseline) plus the interval,
 * projected through the estimated daily mileage.
 */
export const buildMaintenancePlan = (
  vehicle: Vehicle,
  records: MaintenanceRecord[],
): MaintenancePlanItem[] => {
  const km = vehicle.current_km;
  const kmPerDay = estimateKmPerDay(records);
  const now = Date.now();
  // Estimated registration date — baseline for components never serviced.
  const registrationMs = new Date(vehicle.year, 0, 1).getTime();

  return buildServiceSpecs(vehicle)
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

      // Time baseline: last service, or the vehicle's registration date.
      const baseTimeMs = lastServiceDate
        ? new Date(lastServiceDate).getTime()
        : registrationMs;
      const dueByTimeMs = baseTimeMs + s.intervalMonths * MONTH_MS;
      const dueByKmMs = now + (kmRemaining / kmPerDay) * DAY_MS;

      const dueMs = s.timeBased ? dueByTimeMs : Math.min(dueByKmMs, dueByTimeMs);
      const dueDate = new Date(dueMs);
      const daysRemaining = Math.round((dueDate.getTime() - now) / DAY_MS);

      const effectiveKmRemaining = s.timeBased ? Infinity : kmRemaining;
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
        timeBased: s.timeBased,
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
