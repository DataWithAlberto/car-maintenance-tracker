import { supabase } from './supabase';
import type { LiveData } from './obd2.service';
import { syncQueueService } from './syncQueue.service';
import {
  DEFAULT_VEHICLE_THRESHOLDS,
  type OBD2Anomaly,
  type OBD2Reading,
  type VehicleThresholds,
} from '../types';

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
      if (import.meta.env.DEV) {
        console.error('Error saving OBD2 reading, queueing for retry:', err);
      }
      // Fallback: encolar para reenvío automático cuando vuelva la red.
      syncQueueService.enqueueReading(vehicleId, reading);
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

  /**
   * Detecta anomalías en una lectura usando los umbrales configurables del
   * vehículo. Si no se pasan `thresholds`, usa los `DEFAULT_VEHICLE_THRESHOLDS`
   * para preservar compatibilidad con llamadas legacy.
   */
  detectAnomalies(
    reading: LiveData,
    thresholds: VehicleThresholds = DEFAULT_VEHICLE_THRESHOLDS,
  ): OBD2Anomaly[] {
    const anomalies: OBD2Anomaly[] = [];

    // Temperature warnings
    if (reading.coolantTemp !== null) {
      if (reading.coolantTemp >= thresholds.coolantTempCritical) {
        anomalies.push({
          type: 'overtemp',
          severity: 'critical',
          value: reading.coolantTemp,
          threshold: thresholds.coolantTempCritical,
          message: `Motor sobrecalentado: ${reading.coolantTemp}°C`,
        });
      } else if (reading.coolantTemp >= thresholds.coolantTempWarn) {
        anomalies.push({
          type: 'overtemp',
          severity: 'warn',
          value: reading.coolantTemp,
          threshold: thresholds.coolantTempWarn,
          message: `Temperatura alta: ${reading.coolantTemp}°C`,
        });
      }
    }

    // Engine load warning
    if (reading.engineLoad !== null && reading.engineLoad >= thresholds.engineLoadCritical) {
      anomalies.push({
        type: 'engine_load_high',
        severity: 'critical',
        value: reading.engineLoad,
        threshold: thresholds.engineLoadCritical,
        message: `Carga del motor anormalmente alta: ${reading.engineLoad}%`,
      });
    }

    // Oil pressure warning
    if (reading.oilPressure !== null) {
      if (reading.oilPressure <= thresholds.oilPressureCritical) {
        anomalies.push({
          type: 'oil_pressure_low',
          severity: 'critical',
          value: reading.oilPressure,
          threshold: thresholds.oilPressureCritical,
          message: `Presión de aceite crítica: ${reading.oilPressure} kPa`,
        });
      } else if (reading.oilPressure <= thresholds.oilPressureWarn) {
        anomalies.push({
          type: 'oil_pressure_low',
          severity: 'warn',
          value: reading.oilPressure,
          threshold: thresholds.oilPressureWarn,
          message: `Presión de aceite baja: ${reading.oilPressure} kPa`,
        });
      }
    }

    // Battery voltage warning
    if (reading.batteryVoltage !== null) {
      if (reading.batteryVoltage <= thresholds.batteryVoltageCritical) {
        anomalies.push({
          type: 'low_battery',
          severity: 'critical',
          value: reading.batteryVoltage,
          threshold: thresholds.batteryVoltageCritical,
          message: `Voltaje de batería crítico: ${reading.batteryVoltage}V`,
        });
      } else if (reading.batteryVoltage <= thresholds.batteryVoltageWarn) {
        anomalies.push({
          type: 'low_battery',
          severity: 'warn',
          value: reading.batteryVoltage,
          threshold: thresholds.batteryVoltageWarn,
          message: `Voltaje de batería bajo: ${reading.batteryVoltage}V`,
        });
      }
    }

    // RPM warning
    if (reading.rpm !== null && reading.rpm >= thresholds.rpmWarn) {
      anomalies.push({
        type: 'high_rpms',
        severity: 'warn',
        value: reading.rpm,
        threshold: thresholds.rpmWarn,
        message: `RPM muy altas: ${reading.rpm} rev/min`,
      });
    }

    // Fuel level warning
    if (reading.fuelLevel !== null && reading.fuelLevel <= thresholds.fuelLevelCritical) {
      anomalies.push({
        type: 'low_fuel',
        severity: 'critical',
        value: reading.fuelLevel,
        threshold: thresholds.fuelLevelCritical,
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
      if (import.meta.env.DEV) {
        console.error('Error saving OBD2 anomaly, queueing for retry:', err);
      }
      syncQueueService.enqueueAnomaly(vehicleId, anomaly);
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
