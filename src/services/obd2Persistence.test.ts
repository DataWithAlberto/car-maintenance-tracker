import { describe, it, expect } from 'vitest';
import { obd2PersistenceService } from './obd2Persistence.service';
import type { LiveData } from './obd2.service';
import { DEFAULT_VEHICLE_THRESHOLDS, type VehicleThresholds } from '../types';

const emptyReading: LiveData = {
  rpm: null,
  speed: null,
  coolantTemp: null,
  fuelLevel: null,
  odometer: null,
  oilPressure: null,
  batteryVoltage: null,
  engineLoad: null,
  timingAdvance: null,
  engineRuntime: null,
  mafAirFlow: null,
  fuelTrimBank1: null,
  fuelRate: null,
  shortTermFuelTrim1: null,
  longTermFuelTrim1: null,
  intakeManifoldPressure: null,
  absoluteLoad: null,
  relativeThrottlePos: null,
  ambientAirTemp: null,
  absThrottlePosB: null,
  accPedalPosD: null,
  accPedalPosE: null,
  catalystTempBank1Sensor1: null,
  numEmissionsDtc: null,
};

describe('obd2PersistenceService.detectAnomalies', () => {
  describe('umbrales por defecto', () => {
    it('no devuelve anomalías para una lectura completamente nula', () => {
      const result = obd2PersistenceService.detectAnomalies(emptyReading);
      expect(result).toHaveLength(0);
    });

    it('no devuelve anomalías para valores dentro de rangos normales', () => {
      const reading: LiveData = {
        ...emptyReading,
        rpm: 2000,
        coolantTemp: 90,
        batteryVoltage: 13.8,
        oilPressure: 300,
        engineLoad: 45,
        fuelLevel: 60,
      };
      expect(obd2PersistenceService.detectAnomalies(reading)).toHaveLength(0);
    });

    it('detecta sobrecalentamiento crítico de motor', () => {
      const reading = { ...emptyReading, coolantTemp: 115 };
      const result = obd2PersistenceService.detectAnomalies(reading);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('overtemp');
      expect(result[0].severity).toBe('critical');
      expect(result[0].value).toBe(115);
    });

    it('detecta temperatura alta como warn (no critical)', () => {
      const reading = { ...emptyReading, coolantTemp: 100 };
      const result = obd2PersistenceService.detectAnomalies(reading);
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('warn');
    });

    it('prioriza critical sobre warn cuando ambos aplican', () => {
      // 110°C cruza el umbral critical de default (110), no debe dar warn
      const reading = { ...emptyReading, coolantTemp: 110 };
      const result = obd2PersistenceService.detectAnomalies(reading);
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('critical');
    });

    it('detecta batería baja crítica', () => {
      const reading = { ...emptyReading, batteryVoltage: 9.8 };
      const result = obd2PersistenceService.detectAnomalies(reading);
      const battery = result.find((a) => a.type === 'low_battery');
      expect(battery).toBeDefined();
      expect(battery?.severity).toBe('critical');
    });

    it('detecta RPM altas', () => {
      const reading = { ...emptyReading, rpm: 7200 };
      const result = obd2PersistenceService.detectAnomalies(reading);
      const rpm = result.find((a) => a.type === 'high_rpms');
      expect(rpm).toBeDefined();
      expect(rpm?.severity).toBe('warn');
    });

    it('detecta combustible crítico (≤5%)', () => {
      const reading = { ...emptyReading, fuelLevel: 3 };
      const result = obd2PersistenceService.detectAnomalies(reading);
      expect(result.find((a) => a.type === 'low_fuel')?.severity).toBe('critical');
    });

    it('detecta presión de aceite peligrosamente baja', () => {
      const reading = { ...emptyReading, oilPressure: 15 };
      const result = obd2PersistenceService.detectAnomalies(reading);
      expect(result.find((a) => a.type === 'oil_pressure_low')?.severity).toBe('critical');
    });

    it('puede detectar múltiples anomalías simultáneas', () => {
      const reading: LiveData = {
        ...emptyReading,
        coolantTemp: 120,
        batteryVoltage: 9.5,
        rpm: 7500,
        fuelLevel: 2,
      };
      const result = obd2PersistenceService.detectAnomalies(reading);
      expect(result.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('umbrales personalizados', () => {
    const stricter: VehicleThresholds = {
      ...DEFAULT_VEHICLE_THRESHOLDS,
      coolantTempWarn: 80,
      coolantTempCritical: 95,
      rpmWarn: 4500,
    };

    it('respeta umbrales más estrictos', () => {
      const reading = { ...emptyReading, coolantTemp: 85 };
      // Con defaults: 85°C es normal, sin anomalía
      expect(obd2PersistenceService.detectAnomalies(reading)).toHaveLength(0);
      // Con stricter: 85°C ya es warn
      const strict = obd2PersistenceService.detectAnomalies(reading, stricter);
      expect(strict).toHaveLength(1);
      expect(strict[0].severity).toBe('warn');
    });

    it('detecta RPM > 4500 como warn con umbral personalizado', () => {
      const reading = { ...emptyReading, rpm: 5000 };
      // Default warn es 6500 → no anomalía
      expect(obd2PersistenceService.detectAnomalies(reading)).toHaveLength(0);
      // Stricter: 4500 → 5000 es warn
      expect(obd2PersistenceService.detectAnomalies(reading, stricter)).toHaveLength(1);
    });

    const looser: VehicleThresholds = {
      ...DEFAULT_VEHICLE_THRESHOLDS,
      coolantTempWarn: 120,
      coolantTempCritical: 130,
      batteryVoltageCritical: 8,
    };

    it('respeta umbrales más permisivos', () => {
      const reading = { ...emptyReading, coolantTemp: 115, batteryVoltage: 9.5 };
      // Defaults: ambos generan alertas
      const def = obd2PersistenceService.detectAnomalies(reading);
      expect(def.length).toBeGreaterThan(0);
      const loose = obd2PersistenceService.detectAnomalies(reading, looser);
      // 115°C cae bajo el nuevo warn (120) → no alerta de temperatura
      expect(loose.find((a) => a.type === 'overtemp')).toBeUndefined();
    });

    it('rebaja severity de critical a warn con umbral más permisivo', () => {
      const reading = { ...emptyReading, batteryVoltage: 9.5 };
      // Default: critical = 10, voltaje 9.5 → critical
      expect(obd2PersistenceService.detectAnomalies(reading)[0].severity).toBe('critical');
      // Looser: critical = 8, voltaje 9.5 → solo warn (11.5)
      const loose = obd2PersistenceService.detectAnomalies(reading, looser);
      expect(loose[0].severity).toBe('warn');
    });
  });

  describe('valores edge', () => {
    it('ignora valores null sin lanzar', () => {
      expect(() => obd2PersistenceService.detectAnomalies(emptyReading)).not.toThrow();
    });

    it('valores exactos al umbral disparan la alerta', () => {
      // coolant_critical default = 110
      const reading = { ...emptyReading, coolantTemp: 110 };
      const result = obd2PersistenceService.detectAnomalies(reading);
      expect(result[0].severity).toBe('critical');
    });
  });
});
