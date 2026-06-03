import { describe, it, expect } from 'vitest';
import { costOverviewService, type CostInputs } from './costOverview.service';
import type { Expense, MaintenanceRecord, InsurancePolicy, PrestamoMovimiento } from '../types';

// Fecha de referencia fija para que las ventanas (12 meses / año) sean deterministas.
const NOW = new Date('2026-06-15T12:00:00Z');

const expense = (over: Partial<Expense>): Expense => ({
  id: 'e',
  vehicle_id: 'v',
  created_by: 'u',
  category: 'Otros',
  date: '2026-05-01',
  amount: 0,
  created_at: '2026-05-01',
  ...over,
});

const maint = (over: Partial<MaintenanceRecord>): MaintenanceRecord => ({
  id: 'm',
  vehicle_id: 'v',
  created_by: 'u',
  type: 'Revisión',
  date: '2026-05-01',
  km_at_service: 1000,
  created_at: '2026-05-01',
  updated_at: '2026-05-01',
  ...over,
});

const loan = (over: Partial<PrestamoMovimiento>): PrestamoMovimiento => ({
  id: 'p',
  vehicle_id: 'v',
  fecha: '2026-05-01',
  importe: 0,
  usuario: 'Alberto',
  nota: null,
  created_at: '2026-05-01',
  updated_at: '2026-05-01',
  deleted_at: null,
  ...over,
});

const base = (over: Partial<CostInputs> = {}): CostInputs => ({
  expenses: [],
  maintenance: [],
  insurance: [],
  prestamo: [],
  currentKm: 50000,
  ...over,
});

describe('costOverviewService.compute', () => {
  it('excluye las categorías de gasto "Mantenimiento" y "Seguro" para no contar doble', () => {
    const inputs = base({
      expenses: [
        expense({ id: 'a', category: 'Combustible', amount: 100 }),
        expense({ id: 'b', category: 'Mantenimiento', amount: 999 }), // debe ignorarse
        expense({ id: 'c', category: 'Seguro', amount: 999 }), // debe ignorarse
        expense({ id: 'd', category: 'Multas', amount: 50 }),
      ],
      maintenance: [maint({ cost: 300 })],
    });

    const r = costOverviewService.compute(inputs, 'historico', NOW);

    const combustible = r.slices.find((s) => s.key === 'combustible');
    const otros = r.slices.find((s) => s.key === 'otros');
    const mantenimiento = r.slices.find((s) => s.key === 'mantenimiento');

    expect(combustible?.amount).toBe(100);
    expect(otros?.amount).toBe(50); // solo la multa, no Mantenimiento/Seguro
    expect(mantenimiento?.amount).toBe(300); // viene del módulo, no del gasto
    expect(r.total).toBe(450);
  });

  it('suma los pagos del préstamo y calcula el saldo pendiente', () => {
    const inputs = base({
      prestamo: [
        loan({ id: '1', importe: 5000 }),
        loan({ id: '2', importe: 2000 }),
        loan({ id: '3', importe: 999, deleted_at: '2026-05-02' }), // borrado → ignorado
      ],
    });

    const r = costOverviewService.compute(inputs, 'historico', NOW);
    const fin = r.slices.find((s) => s.key === 'financiacion');

    expect(fin?.amount).toBe(7000);
    expect(r.pendingLoan).toBe(17000 - 7000);
  });

  it('prorratea el seguro por meses de cobertura dentro de la ventana', () => {
    // Prima mensual 50 € → anual 600 €. Póliza 1-ene → 1-jul, pero la ventana
    // histórica se corta en NOW (15-jun) ≈ 5,4 meses → ~271 € (julio aún no
    // se ha incurrido).
    const inputs = base({
      insurance: [
        {
          id: 'i',
          vehicle_id: 'v',
          created_by: 'u',
          provider: 'X',
          coverage_type: 'terceros',
          premium_amount: 50,
          payment_frequency: 'mensual',
          start_date: '2026-01-01',
          end_date: '2026-07-01',
        } as InsurancePolicy,
      ],
    });

    const r = costOverviewService.compute(inputs, 'historico', NOW);
    const seguro = r.slices.find((s) => s.key === 'seguro');

    expect(seguro).toBeDefined();
    expect(seguro!.amount).toBeGreaterThan(255);
    expect(seguro!.amount).toBeLessThan(285);
  });

  it('la ventana "año actual" excluye transacciones de años anteriores', () => {
    const inputs = base({
      expenses: [
        expense({ id: 'old', category: 'Combustible', amount: 500, date: '2025-12-15' }),
        expense({ id: 'new', category: 'Combustible', amount: 80, date: '2026-03-10' }),
      ],
    });

    const r = costOverviewService.compute(inputs, 'anio', NOW);
    expect(r.total).toBe(80);
  });

  it('coste/km solo se calcula en histórico', () => {
    const inputs = base({
      expenses: [expense({ category: 'Combustible', amount: 1000, date: '2026-05-01' })],
      currentKm: 10000,
    });

    expect(costOverviewService.compute(inputs, 'historico', NOW).costPerKm).toBeCloseTo(0.1);
    expect(costOverviewService.compute(inputs, '12meses', NOW).costPerKm).toBeNull();
    expect(costOverviewService.compute(inputs, 'anio', NOW).costPerKm).toBeNull();
  });

  it('devuelve total 0 y sin slices cuando no hay datos', () => {
    const r = costOverviewService.compute(base(), 'historico', NOW);
    expect(r.total).toBe(0);
    expect(r.slices).toHaveLength(0);
    expect(r.topSlice).toBeNull();
  });
});
