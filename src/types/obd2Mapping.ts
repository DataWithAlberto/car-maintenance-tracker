/**
 * Mapeo OBD-II ↔ piezas del modelo 3D del Ford Focus.
 *
 * Une tres mundos:
 *   1) Códigos DTC estándar (P0xxx, B0xxx, C0xxx, U0xxx) → pieza física.
 *   2) Telemetría en vivo (coolantTemp, oilPressure…) → pieza física cuando
 *      el valor cruza un umbral peligroso.
 *   3) Pieza física (`partKey` de `CAR_PARTS`) → prefijos de nombre de malla
 *      del .glb para resaltarlas en el visor 3D.
 *
 * La columna `partKey` usa exactamente las mismas claves que `CAR_PARTS`
 * (utils/constants.ts) para que el `PartInfoOverlay` y el `MaintenanceForm`
 * funcionen sin traducciones intermedias.
 */
import type { LiveData, DTC } from '../services/obd2.service';
import { getDtcDescription } from '../utils/dtcCodes';

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export type PartKey =
  | 'engine'
  | 'tires_front_left'
  | 'tires_front_right'
  | 'tires_rear_left'
  | 'tires_rear_right'
  | 'brakes_front'
  | 'brakes_rear'
  | 'battery'
  | 'suspension';

export type AlertSeverity = 'critical' | 'warn';

/** Causa concreta que activa una alerta sobre una pieza. */
export interface PartAlertTrigger {
  kind: 'dtc' | 'telemetry';
  /** Código (P0117) o id de variable (`coolantTemp`). */
  code: string;
  /** Descripción ya traducida al español, lista para UI / form. */
  description: string;
  severity: AlertSeverity;
  /** Tipo de mantenimiento sugerido (debe existir en MAINTENANCE_TYPES). */
  suggestedMaintenanceType: string;
  /** Solo telemetría: valor y umbral cruzado. */
  value?: number;
  threshold?: number;
}

/** Estado agregado de una pieza con una o más causas activas. */
export interface PartAlert {
  partKey: PartKey;
  severity: AlertSeverity;
  triggers: PartAlertTrigger[];
}

// ─── DTC → pieza ─────────────────────────────────────────────────────────────
// Regla de oro: si dudas, la pieza es el motor. La gran mayoría de DTCs de un
// turismo apuntan al bloque/admisión/escape/inyección, donde el resaltado
// "Motor" es el correcto.

interface DtcRule {
  pattern: RegExp;
  partKey: PartKey;
  severity: AlertSeverity;
  suggestedMaintenanceType: string;
}

const DTC_RULES: DtcRule[] = [
  // ── Sobrecalentamiento / refrigeración ────────────────────────────────────
  // P0115-P0118 sensor refrigerante, P0128 termostato, P0217 sobrecalentado,
  // P0480-P0481 relés ventilador.
  {
    pattern: /^P011[5-8]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Líquido refrigerante',
  },
  {
    pattern: /^P0128$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Líquido refrigerante',
  },
  {
    pattern: /^P0217$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Líquido refrigerante',
  },
  {
    pattern: /^P048[0-9]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },

  // ── Encendido / inyección ────────────────────────────────────────────────
  // Misfire P0300-P0316 implica bujías o inyectores.
  {
    pattern: /^P030[0-9]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Bujías',
  },
  {
    pattern: /^P031[0-6]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Bujías',
  },
  {
    pattern: /^P020[0-9]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P026[12]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Revisión general',
  },

  // ── Admisión / aire / sensores motor ─────────────────────────────────────
  {
    pattern: /^P010[0-3]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Filtro de aire',
  },
  {
    pattern: /^P011[0-3]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Filtro de aire',
  },
  {
    pattern: /^P012[0-3]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P013[0-9]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P014[1]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P015[0]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P017[0-5]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },

  // ── Combustible (presión, filtro, bomba) ─────────────────────────────────
  {
    pattern: /^P019[0-3]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Filtro de combustible',
  },
  {
    pattern: /^P0230$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Filtro de combustible',
  },
  {
    pattern: /^P046[0-3]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },

  // ── Distribución / cigüeñal / árbol de levas ─────────────────────────────
  {
    pattern: /^P032[0-2]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Correa de distribución',
  },
  {
    pattern: /^P033[5-9]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Correa de distribución',
  },
  {
    pattern: /^P034[0-3]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Correa de distribución',
  },

  // ── Emisiones (EGR, EVAP, catalizador) ───────────────────────────────────
  {
    pattern: /^P040[0-4]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P041[01]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P042[01]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P0430$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P044[0-6]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },
  {
    pattern: /^P045[56]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },

  // ── Aceite ───────────────────────────────────────────────────────────────
  {
    pattern: /^P052[0-3]$/,
    partKey: 'engine',
    severity: 'critical',
    suggestedMaintenanceType: 'Cambio de aceite',
  },

  // ── Tensión / batería ────────────────────────────────────────────────────
  { pattern: /^P0560$/, partKey: 'battery', severity: 'warn', suggestedMaintenanceType: 'Batería' },
  {
    pattern: /^P056[23]$/,
    partKey: 'battery',
    severity: 'warn',
    suggestedMaintenanceType: 'Batería',
  },

  // ── ECU / control ────────────────────────────────────────────────────────
  {
    pattern: /^P060[0-6]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Revisión general',
  },

  // ── Transmisión / embrague ───────────────────────────────────────────────
  {
    pattern: /^P070[056]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Embrague',
  },
  {
    pattern: /^P071[0-5]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Embrague',
  },
  { pattern: /^P0720$/, partKey: 'engine', severity: 'warn', suggestedMaintenanceType: 'Embrague' },
  {
    pattern: /^P073[0-5]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Embrague',
  },
  {
    pattern: /^P074[01]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Embrague',
  },
  {
    pattern: /^P075[05]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Embrague',
  },
  {
    pattern: /^P076[05]$/,
    partKey: 'engine',
    severity: 'warn',
    suggestedMaintenanceType: 'Embrague',
  },

  // ── Ruedas / ABS (C-codes) ───────────────────────────────────────────────
  {
    pattern: /^C0035$/,
    partKey: 'tires_front_right',
    severity: 'warn',
    suggestedMaintenanceType: 'Neumáticos',
  },
  {
    pattern: /^C0040$/,
    partKey: 'tires_front_left',
    severity: 'warn',
    suggestedMaintenanceType: 'Neumáticos',
  },
  {
    pattern: /^C0045$/,
    partKey: 'tires_rear_right',
    severity: 'warn',
    suggestedMaintenanceType: 'Neumáticos',
  },
  {
    pattern: /^C0050$/,
    partKey: 'tires_rear_left',
    severity: 'warn',
    suggestedMaintenanceType: 'Neumáticos',
  },
  {
    pattern: /^C0110$/,
    partKey: 'brakes_front',
    severity: 'critical',
    suggestedMaintenanceType: 'Frenos delanteros',
  },
  {
    pattern: /^C0121$/,
    partKey: 'brakes_front',
    severity: 'critical',
    suggestedMaintenanceType: 'Líquido de frenos',
  },
  {
    pattern: /^C0265$/,
    partKey: 'brakes_front',
    severity: 'warn',
    suggestedMaintenanceType: 'Frenos delanteros',
  },

  // ── Velocidad vehículo (sensor en transmisión, asociar a ruedas) ─────────
  {
    pattern: /^P050[0-3]$/,
    partKey: 'tires_front_left',
    severity: 'warn',
    suggestedMaintenanceType: 'Neumáticos',
  },
];

/** Devuelve la regla que casa con un código DTC dado, o null. */
const findDtcRule = (code: string): DtcRule | null => {
  const upper = code.toUpperCase();
  for (const rule of DTC_RULES) {
    if (rule.pattern.test(upper)) return rule;
  }
  return null;
};

// ─── Telemetría → pieza ──────────────────────────────────────────────────────

interface TelemetryRule {
  /** Clave de `LiveData`. */
  key: keyof LiveData;
  label: string;
  partKey: PartKey;
  /** Devuelve severity si el valor cruza un umbral, o null. */
  evaluate: (value: number) => { severity: AlertSeverity; threshold: number } | null;
  suggestedMaintenanceType: string;
}

const TELEMETRY_RULES: TelemetryRule[] = [
  {
    key: 'coolantTemp',
    label: 'Temperatura refrigerante',
    partKey: 'engine',
    suggestedMaintenanceType: 'Líquido refrigerante',
    evaluate: (v) =>
      v >= 115
        ? { severity: 'critical', threshold: 115 }
        : v >= 105
          ? { severity: 'warn', threshold: 105 }
          : null,
  },
  {
    key: 'oilPressure',
    label: 'Presión de aceite',
    partKey: 'engine',
    suggestedMaintenanceType: 'Cambio de aceite',
    evaluate: (v) =>
      // La presión de aceite a régimen está normalmente por encima de ~100 kPa
      // (1 bar). Caer por debajo en marcha implica desgaste o bomba.
      v > 0 && v < 100 ? { severity: 'critical', threshold: 100 } : null,
  },
  {
    key: 'batteryVoltage',
    label: 'Voltaje de batería',
    partKey: 'battery',
    suggestedMaintenanceType: 'Batería',
    evaluate: (v) =>
      v < 11.5
        ? { severity: 'critical', threshold: 11.5 }
        : v > 15
          ? { severity: 'warn', threshold: 15 }
          : null,
  },
  {
    key: 'engineLoad',
    label: 'Carga del motor',
    partKey: 'engine',
    suggestedMaintenanceType: 'Revisión general',
    evaluate: (v) => (v >= 95 ? { severity: 'warn', threshold: 95 } : null),
  },
];

// ─── Agregación: DTCs + telemetría → PartAlert[] ─────────────────────────────

/**
 * Devuelve la lista (única por pieza) de alertas activas combinando los DTCs
 * actualmente almacenados en la ECU y los valores de telemetría que crucen
 * un umbral. Resultado pensado para alimentar el visor 3D y el formulario.
 */
export const computePartAlerts = (dtcs: DTC[], liveData: LiveData): PartAlert[] => {
  const map = new Map<PartKey, PartAlert>();

  const upsert = (partKey: PartKey, trigger: PartAlertTrigger): void => {
    const existing = map.get(partKey);
    if (!existing) {
      map.set(partKey, { partKey, severity: trigger.severity, triggers: [trigger] });
      return;
    }
    existing.triggers.push(trigger);
    // critical gana a warn
    if (trigger.severity === 'critical') existing.severity = 'critical';
  };

  for (const dtc of dtcs) {
    const rule = findDtcRule(dtc.code);
    if (!rule) continue;
    upsert(rule.partKey, {
      kind: 'dtc',
      code: dtc.code,
      description: getDtcDescription(dtc.code),
      severity: rule.severity,
      suggestedMaintenanceType: rule.suggestedMaintenanceType,
    });
  }

  for (const rule of TELEMETRY_RULES) {
    const v = liveData[rule.key];
    if (v == null) continue;
    const hit = rule.evaluate(v);
    if (!hit) continue;
    upsert(rule.partKey, {
      kind: 'telemetry',
      code: rule.key,
      description: `${rule.label}: ${v} (umbral ${hit.threshold})`,
      severity: hit.severity,
      suggestedMaintenanceType: rule.suggestedMaintenanceType,
      value: v,
      threshold: hit.threshold,
    });
  }

  return Array.from(map.values());
};

// ─── PartKey → prefijos de malla en el .glb ──────────────────────────────────
// Los prefijos se contrastan en minúsculas con `includes`. Cubren tanto el
// modelo profesional (cuando llegue) como el genérico `ford_focus.glb` ya
// presente en /public/models.

const PART_MESH_PREFIXES: Record<PartKey, string[]> = {
  engine: ['body', 'bod2', 'cowl', 'fin', 'hood', 'bonnet', 'engine', 'chrome', 'badge'],
  tires_front_left: ['tire_lf', 'wheel_lf', 'lugs_lf'],
  tires_front_right: ['tire_rf', 'wheel_rf', 'lugs_rf'],
  tires_rear_left: ['tire_lr', 'wheel_lr', 'lugs_lr'],
  tires_rear_right: ['tire_rr', 'wheel_rr', 'lugs_rr'],
  brakes_front: ['brake_f', 'caliper_f', 'disk_f', 'hedlght', 'foglight'],
  brakes_rear: ['brake_r', 'caliper_r', 'disk_r', 'braklght', 'hlght_tr', 'revlght'],
  battery: ['battery', 'batt'],
  suspension: ['under', 'whlwells', 'rbbrtrim', 'rbbrtrm2', 'suspension', 'shock'],
};

/** ¿Pertenece este nombre de malla a la pieza dada? Match por substring. */
export const meshBelongsToPart = (meshName: string, partKey: PartKey): boolean => {
  const lower = meshName.toLowerCase();
  return PART_MESH_PREFIXES[partKey].some((p) => lower.includes(p));
};

/** Devuelve la primera pieza cuyo prefijo case con este nombre de malla. */
export const partFromMeshName = (meshName: string): PartKey | null => {
  const lower = meshName.toLowerCase();
  for (const [partKey, prefixes] of Object.entries(PART_MESH_PREFIXES) as Array<
    [PartKey, string[]]
  >) {
    if (prefixes.some((p) => lower.includes(p))) return partKey;
  }
  return null;
};
