import type {
  MaintenanceRecord,
  Vehicle,
  FailurePrediction,
  FailureStatus,
  OBD2Reading,
} from '../types';

interface ComponentSpec {
  key: string;
  label: string;
  lifespanKm: number;
  matchTypes: string[];
}

/** Expected service life per component, in km. Based on typical OEM intervals. */
const COMPONENTS: ComponentSpec[] = [
  { key: 'oil', label: 'Aceite y filtro', lifespanKm: 15000, matchTypes: ['Cambio de aceite'] },
  { key: 'air', label: 'Filtro de aire', lifespanKm: 25000, matchTypes: ['Filtro de aire'] },
  {
    key: 'fuel',
    label: 'Filtro de combustible',
    lifespanKm: 40000,
    matchTypes: ['Filtro de combustible'],
  },
  {
    key: 'cabin',
    label: 'Filtro de habitáculo',
    lifespanKm: 25000,
    matchTypes: ['Filtro de habitáculo'],
  },
  {
    key: 'brake_f',
    label: 'Pastillas freno delant.',
    lifespanKm: 45000,
    matchTypes: ['Frenos delanteros'],
  },
  {
    key: 'brake_r',
    label: 'Pastillas freno trasero',
    lifespanKm: 65000,
    matchTypes: ['Frenos traseros'],
  },
  { key: 'tires', label: 'Neumáticos', lifespanKm: 45000, matchTypes: ['Neumáticos'] },
  { key: 'battery', label: 'Batería', lifespanKm: 80000, matchTypes: ['Batería'] },
  { key: 'spark', label: 'Bujías', lifespanKm: 50000, matchTypes: ['Bujías'] },
  {
    key: 'timing',
    label: 'Correa de distribución',
    lifespanKm: 110000,
    matchTypes: ['Correa de distribución'],
  },
  {
    key: 'shock',
    label: 'Amortiguadores',
    lifespanKm: 90000,
    matchTypes: ['Amortiguadores', 'Suspensión'],
  },
  { key: 'clutch', label: 'Embrague', lifespanKm: 160000, matchTypes: ['Embrague'] },
  {
    key: 'brake_fl',
    label: 'Líquido de frenos',
    lifespanKm: 60000,
    matchTypes: ['Líquido de frenos'],
  },
  {
    key: 'coolant',
    label: 'Líquido refrigerante',
    lifespanKm: 90000,
    matchTypes: ['Líquido refrigerante'],
  },
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

  // Una sola pasada por records: índice tipo → mayor km_at_service.
  // Evita el O(N×COMPONENTS.length) de filtrar dentro del .map y elimina
  // el `Math.max(...spread)` que aloca un array intermedio y arriesga
  // stack overflow con historiales grandes.
  const maxKmByType = new Map<string, number>();
  for (const r of records) {
    const prev = maxKmByType.get(r.type);
    if (prev === undefined || r.km_at_service > prev) {
      maxKmByType.set(r.type, r.km_at_service);
    }
  }

  return COMPONENTS.map((c): FailurePrediction => {
    let lastServiceKm: number | null = null;
    for (const type of c.matchTypes) {
      const v = maxKmByType.get(type);
      if (v !== undefined && (lastServiceKm === null || v > lastServiceKm)) {
        lastServiceKm = v;
      }
    }
    const baseline = lastServiceKm ?? 0;
    const predictedKm = baseline + c.lifespanKm;
    const kmRemaining = predictedKm - km;
    const lifeUsedPct = Math.min(100, Math.max(0, ((km - baseline) / c.lifespanKm) * 100));
    const status: FailureStatus = kmRemaining <= 0 ? 'overdue' : lifeUsedPct >= 85 ? 'soon' : 'ok';
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
  }).sort((a, b) => a.kmRemaining - b.kmRemaining);
};

export const predictFailuresWithOBD2 = (
  vehicle: Vehicle,
  records: MaintenanceRecord[],
  obd2History: OBD2Reading[],
): FailurePrediction[] => {
  const predictions = predictFailures(vehicle, records);
  if (obd2History.length === 0) return predictions;

  const validRpms = obd2History.map((r) => r.rpm).filter((v): v is number => v !== null);
  const validTemps = obd2History.map((r) => r.coolant_temp).filter((v): v is number => v !== null);

  const avgRpm = validRpms.length > 0 ? validRpms.reduce((a, b) => a + b, 0) / validRpms.length : 0;
  const avgTemp =
    validTemps.length > 0 ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length : 0;

  return predictions
    .map((p) => {
      let adjustedLifespan = p.lifespanKm;
      let severity = '';

      if (p.key === 'oil' && avgRpm > 5000) {
        adjustedLifespan *= 0.8;
        severity = ' (RPM alta detectada)';
      }

      if (p.key === 'coolant' && avgTemp > 95) {
        adjustedLifespan *= 0.85;
        severity = ' (Temperatura elevada)';
      }

      if (p.key === 'battery' && avgRpm > 6000) {
        adjustedLifespan *= 0.9;
        severity = ' (Carga alta detectada)';
      }

      const baseline = p.lastServiceKm ?? 0;
      const newPredictedKm = baseline + adjustedLifespan;
      const newKmRemaining = newPredictedKm - vehicle.current_km;
      const newLifeUsedPct = Math.min(
        100,
        Math.max(0, ((vehicle.current_km - baseline) / adjustedLifespan) * 100),
      );
      const newStatus: FailureStatus =
        newKmRemaining <= 0 ? 'overdue' : newLifeUsedPct >= 85 ? 'soon' : 'ok';

      return {
        ...p,
        lifespanKm: adjustedLifespan,
        label: p.label + severity,
        predictedKm: newPredictedKm,
        kmRemaining: newKmRemaining,
        lifeUsedPct: newLifeUsedPct,
        status: newStatus,
      };
    })
    .sort((a, b) => a.kmRemaining - b.kmRemaining);
};
