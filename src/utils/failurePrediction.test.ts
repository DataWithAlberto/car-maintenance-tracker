import { describe, it, expect } from 'vitest';
import { predictFailures } from './failurePrediction';
import type { Vehicle, MaintenanceRecord } from '../types';

const makeVehicle = (current_km: number): Vehicle => ({
  id: 'v1',
  owner_id: 'u1',
  brand: 'Ford',
  model: 'Focus',
  year: 2023,
  current_km,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

const makeRecord = (type: string, km_at_service: number): MaintenanceRecord => ({
  id: `r-${type}-${km_at_service}`,
  vehicle_id: 'v1',
  created_by: 'u1',
  type,
  date: '2026-01-01',
  km_at_service,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

describe('predictFailures', () => {
  it('marca todos los componentes en vida útil cuando el coche es nuevo', () => {
    const result = predictFailures(makeVehicle(0), []);
    expect(result).toHaveLength(14);
    expect(result.every((p) => p.status === 'ok')).toBe(true);
    expect(result.every((p) => p.lastServiceKm === null)).toBe(true);
  });

  it('marca un componente como vencido al superar su vida útil sin registros', () => {
    const result = predictFailures(makeVehicle(200000), []);
    const oil = result.find((p) => p.key === 'oil');
    expect(oil?.status).toBe('overdue');
    expect(oil?.kmRemaining).toBeLessThan(0);
  });

  it('usa el último servicio registrado como base de la predicción', () => {
    const result = predictFailures(makeVehicle(105000), [makeRecord('Cambio de aceite', 100000)]);
    const oil = result.find((p) => p.key === 'oil');
    expect(oil?.lastServiceKm).toBe(100000);
    expect(oil?.predictedKm).toBe(115000);
    expect(oil?.kmRemaining).toBe(10000);
    expect(oil?.status).toBe('ok');
  });

  it('ordena el resultado por kilómetros restantes ascendente', () => {
    const remaining = predictFailures(makeVehicle(50000), []).map((p) => p.kmRemaining);
    const sorted = [...remaining].sort((a, b) => a - b);
    expect(remaining).toEqual(sorted);
  });
});
