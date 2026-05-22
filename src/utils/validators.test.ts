import { describe, it, expect } from 'vitest';
import { loginSchema, vehicleSchema, expenseSchema, insuranceSchema } from './validators';

describe('loginSchema', () => {
  it('acepta credenciales válidas', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123456' }).success).toBe(true);
  });

  it('rechaza un email inválido', () => {
    expect(loginSchema.safeParse({ email: 'no-email', password: '123456' }).success).toBe(false);
  });

  it('rechaza una contraseña demasiado corta', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success).toBe(false);
  });
});

describe('vehicleSchema', () => {
  const base = { brand: 'Ford', model: 'Focus', year: 2023, current_km: 50000 };

  it('acepta un vehículo válido', () => {
    expect(vehicleSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza una marca vacía', () => {
    expect(vehicleSchema.safeParse({ ...base, brand: '' }).success).toBe(false);
  });

  it('rechaza kilómetros negativos', () => {
    expect(vehicleSchema.safeParse({ ...base, current_km: -1 }).success).toBe(false);
  });
});

describe('expenseSchema', () => {
  it('rechaza un importe de cero', () => {
    expect(
      expenseSchema.safeParse({ category: 'Combustible', date: '2026-05-01', amount: 0 }).success,
    ).toBe(false);
  });

  it('acepta un importe positivo', () => {
    expect(
      expenseSchema.safeParse({ category: 'Combustible', date: '2026-05-01', amount: 50 }).success,
    ).toBe(true);
  });
});

describe('insuranceSchema', () => {
  const base = {
    provider: 'Mapfre',
    coverage_type: 'todo_riesgo' as const,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  };

  it('acepta una póliza con fechas coherentes', () => {
    expect(insuranceSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza una fecha de fin anterior al inicio', () => {
    expect(
      insuranceSchema.safeParse({ ...base, start_date: '2026-12-31', end_date: '2026-01-01' })
        .success,
    ).toBe(false);
  });
});
