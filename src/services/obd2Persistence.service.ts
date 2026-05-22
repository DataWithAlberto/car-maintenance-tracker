import { supabase } from './supabase';
import type { LiveData } from './obd2.service';
import type { OBD2Anomaly, OBD2Reading } from '../types';

const ANOMALY_THRESHOLDS = {
  coolantTemp: { warn: 95, critical: 110 },
  engineLoad: { critical: 100 },
  oilPressure: { warn: 30, critical: 20 },
  batteryVoltage: { warn: 11.5, critical: 10 },
  rpm: { warn: 6500 },
  fuelLevel: { critical: 5 },
};

export const obd2PersistenceService = {
  async saveReading(vehicleId: string, reading: LiveData): Promise<OBD2Reading | null> {
    try {
      const payload: OBD2Reading = {
        vehicle_id: vehicleId,
        timestamp: Date.now(),
        rpm: reading.rpm,
        speed: reading.speed,
        coolant_temp: reading.coolantTemp,
        fuel_level: reading.fuelLevel,
        odometer: reading.odometer,
        oil_pressure: reading.oilPressure,
        battery_voltage: reading.batteryVoltage,
        engine_load: reading.engineLoad,
        timing_advance: reading.timingAdvance,
        engine_runtime: reading.engineRuntime,
        maf_air_flow: reading.mafAirFlow,
        fuel_trim_bank1: reading.fuelTrimBank1,
        fuel_rate: reading.fuelRate,
        short_term_fuel_trim_1: reading.shortTermFuelTrim1,
        long_term_fuel_trim_1: reading.longTermFuelTrim1,
        intake_manifold_pressure: reading.intakeManifoldPressure,
        absolute_load: reading.absoluteLoad,
        relative_throttle_pos: reading.relativeThrottlePos,
        ambient_air_temp: reading.ambientAirTemp,
        abs_throttle_pos_b: reading.absThrottlePosB,
        acc_pedal_pos_d: reading.accPedalPosD,
        acc_pedal_pos_e: reading.accPedalPosE,
        catalyst_temp_bank1_sensor1: reading.catalystTempBank1Sensor1,
        num_emissions_dtc: reading.numEmissionsDtc,
      };

      const { data, error } = await supabase
        .from('obd2_readings')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error saving OBD2 reading:', err);
      return null;
    }
  },

  async getReadingHistory(vehicleId: string, hoursBack = 24): Promise<OBD2Reading[]> {
    try {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('obd2_readings')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error('Error fetching OBD2 history:', err);
      return [];
    }
  },

  detectAnomalies(reading: LiveData): OBD2Anomaly[] {
    const anomalies: OBD2Anomaly[] = [];

    // Temperature warnings
    if (reading.coolantTemp !== null) {
      if (reading.coolantTemp >= ANOMALY_THRESHOLDS.coolantTemp.critical) {
        anomalies.push({
          type: 'overtemp',
          severity: 'critical',
          value: reading.coolantTemp,
          threshold: ANOMALY_THRESHOLDS.coolantTemp.critical,
          message: `Motor sobrecalentado: ${reading.coolantTemp}°C`,
        });
      } else if (reading.coolantTemp >= ANOMALY_THRESHOLDS.coolantTemp.warn) {
        anomalies.push({
          type: 'overtemp',
          severity: 'warn',
          value: reading.coolantTemp,
          threshold: ANOMALY_THRESHOLDS.coolantTemp.warn,
          message: `Temperatura alta: ${reading.coolantTemp}°C`,
        });
      }
    }

    // Engine load warning
    if (
      reading.engineLoad !== null &&
      reading.engineLoad >= ANOMALY_THRESHOLDS.engineLoad.critical
    ) {
      anomalies.push({
        type: 'engine_load_high',
        severity: 'critical',
        value: reading.engineLoad,
        threshold: ANOMALY_THRESHOLDS.engineLoad.critical,
        message: `Carga del motor anormalmente alta: ${reading.engineLoad}%`,
      });
    }

    // Oil pressure warning
    if (reading.oilPressure !== null) {
      if (reading.oilPressure <= ANOMALY_THRESHOLDS.oilPressure.critical) {
        anomalies.push({
          type: 'oil_pressure_low',
          severity: 'critical',
          value: reading.oilPressure,
          threshold: ANOMALY_THRESHOLDS.oilPressure.critical,
          message: `Presión de aceite crítica: ${reading.oilPressure} kPa`,
        });
      } else if (reading.oilPressure <= ANOMALY_THRESHOLDS.oilPressure.warn) {
        anomalies.push({
          type: 'oil_pressure_low',
          severity: 'warn',
          value: reading.oilPressure,
          threshold: ANOMALY_THRESHOLDS.oilPressure.warn,
          message: `Presión de aceite baja: ${reading.oilPressure} kPa`,
        });
      }
    }

    // Battery voltage warning
    if (reading.batteryVoltage !== null) {
      if (reading.batteryVoltage <= ANOMALY_THRESHOLDS.batteryVoltage.critical) {
        anomalies.push({
          type: 'low_battery',
          severity: 'critical',
          value: reading.batteryVoltage,
          threshold: ANOMALY_THRESHOLDS.batteryVoltage.critical,
          message: `Voltaje de batería crítico: ${reading.batteryVoltage}V`,
        });
      } else if (reading.batteryVoltage <= ANOMALY_THRESHOLDS.batteryVoltage.warn) {
        anomalies.push({
          type: 'low_battery',
          severity: 'warn',
          value: reading.batteryVoltage,
          threshold: ANOMALY_THRESHOLDS.batteryVoltage.warn,
          message: `Voltaje de batería bajo: ${reading.batteryVoltage}V`,
        });
      }
    }

    // RPM warning
    if (reading.rpm !== null && reading.rpm >= ANOMALY_THRESHOLDS.rpm.warn) {
      anomalies.push({
        type: 'high_rpms',
        severity: 'warn',
        value: reading.rpm,
        threshold: ANOMALY_THRESHOLDS.rpm.warn,
        message: `RPM muy altas: ${reading.rpm} rev/min`,
      });
    }

    // Fuel level warning
    if (reading.fuelLevel !== null && reading.fuelLevel <= ANOMALY_THRESHOLDS.fuelLevel.critical) {
      anomalies.push({
        type: 'low_fuel',
        severity: 'critical',
        value: reading.fuelLevel,
        threshold: ANOMALY_THRESHOLDS.fuelLevel.critical,
        message: `Combustible crítico: ${reading.fuelLevel}%`,
      });
    }

    return anomalies;
  },

  async saveAnomaly(vehicleId: string, anomaly: OBD2Anomaly): Promise<OBD2Anomaly | null> {
    try {
      const payload = {
        vehicle_id: vehicleId,
        type: anomaly.type,
        severity: anomaly.severity,
        value: anomaly.value,
        threshold: anomaly.threshold,
        message: anomaly.message,
        dismissed: false,
      };

      const { data, error } = await supabase
        .from('obd2_anomalies')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error saving OBD2 anomaly:', err);
      return null;
    }
  },

  async getAnomalies(vehicleId: string, limit = 100): Promise<OBD2Anomaly[]> {
    try {
      const { data, error } = await supabase
        .from('obd2_anomalies')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error('Error fetching OBD2 anomalies:', err);
      return [];
    }
  },

  async dismissAnomaly(anomalyId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('obd2_anomalies')
        .update({ dismissed: true })
        .eq('id', anomalyId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error dismissing anomaly:', err);
      return false;
    }
  },

  calculateStats(readings: OBD2Reading[]): {
    avgRpm: number | null;
    avgTemp: number | null;
    avgEngineLoad: number | null;
    minBattery: number | null;
    minOilPressure: number | null;
  } {
    if (readings.length === 0) {
      return {
        avgRpm: null,
        avgTemp: null,
        avgEngineLoad: null,
        minBattery: null,
        minOilPressure: null,
      };
    }

    const validRpms = readings.map((r) => r.rpm).filter((v): v is number => v !== null);
    const validTemps = readings.map((r) => r.coolant_temp).filter((v): v is number => v !== null);
    const validLoads = readings.map((r) => r.engine_load).filter((v): v is number => v !== null);
    const validBatteries = readings
      .map((r) => r.battery_voltage)
      .filter((v): v is number => v !== null);
    const validOilPressures = readings
      .map((r) => r.oil_pressure)
      .filter((v): v is number => v !== null);

    return {
      avgRpm:
        validRpms.length > 0
          ? Math.round(validRpms.reduce((a, b) => a + b, 0) / validRpms.length)
          : null,
      avgTemp:
        validTemps.length > 0
          ? Math.round((validTemps.reduce((a, b) => a + b, 0) / validTemps.length) * 10) / 10
          : null,
      avgEngineLoad:
        validLoads.length > 0
          ? Math.round(validLoads.reduce((a, b) => a + b, 0) / validLoads.length)
          : null,
      minBattery: validBatteries.length > 0 ? Math.min(...validBatteries) : null,
      minOilPressure: validOilPressures.length > 0 ? Math.min(...validOilPressures) : null,
    };
  },
};
