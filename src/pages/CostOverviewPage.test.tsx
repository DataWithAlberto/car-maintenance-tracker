import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Expense, MaintenanceRecord, PrestamoMovimiento } from '../types';

// --- Mocks de los 4 servicios de coste ---
vi.mock('../services/expenses.service', () => ({
  expensesService: {
    getByVehicle: vi.fn(
      async (): Promise<Expense[]> => [
        {
          id: 'a',
          vehicle_id: 'v',
          created_by: 'u',
          category: 'Combustible',
          date: '2026-05-01',
          amount: 200,
          created_at: '2026-05-01',
        },
        {
          id: 'b',
          vehicle_id: 'v',
          created_by: 'u',
          category: 'Mantenimiento', // debe excluirse (módulo propio)
          date: '2026-05-01',
          amount: 999,
          created_at: '2026-05-01',
        },
        {
          id: 'c',
          vehicle_id: 'v',
          created_by: 'u',
          category: 'Multas',
          date: '2026-05-01',
          amount: 30,
          created_at: '2026-05-01',
        },
      ],
    ),
  },
}));

vi.mock('../services/maintenance.service', () => ({
  maintenanceService: {
    getByVehicle: vi.fn(
      async (): Promise<MaintenanceRecord[]> => [
        {
          id: 'm',
          vehicle_id: 'v',
          created_by: 'u',
          type: 'Revisión',
          date: '2026-05-01',
          km_at_service: 1000,
          cost: 150,
          created_at: '2026-05-01',
          updated_at: '2026-05-01',
        },
      ],
    ),
  },
}));

vi.mock('../services/insurance.service', () => ({
  insuranceService: { getByVehicle: vi.fn(async () => []) },
}));

vi.mock('../services/prestamo.service', () => ({
  IMPORTE_INICIAL: 17000,
  prestamoService: {
    getByVehicle: vi.fn(
      async (): Promise<PrestamoMovimiento[]> => [
        {
          id: 'p',
          vehicle_id: 'v',
          fecha: '2026-05-01',
          importe: 5000,
          usuario: 'Alberto',
          nota: null,
          created_at: '2026-05-01',
          updated_at: '2026-05-01',
          deleted_at: null,
        },
      ],
    ),
  },
}));

import { CostOverviewPage } from './CostOverviewPage';
import { useVehicleStore } from '../store/vehicleStore';

beforeEach(() => {
  useVehicleStore.setState({
    // Solo los campos que usa la página.
    selectedVehicle: {
      id: 'v',
      brand: 'Ford',
      model: 'Focus',
      license_plate: '1234ABC',
      current_km: 50000,
    } as never,
  });
});

describe('CostOverviewPage', () => {
  it('agrega las cuatro fuentes y excluye gastos solapados, sin crashear', async () => {
    render(
      <MemoryRouter>
        <CostOverviewPage />
      </MemoryRouter>,
    );

    // Cabecera.
    expect(await screen.findByText('Coste total.')).toBeInTheDocument();

    // Las partidas reales aparecen (strip + desglose → varias veces).
    expect((await screen.findAllByText('Financiación')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Combustible')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Mantenimiento')).length).toBeGreaterThan(0);

    // La categoría de gasto "Seguro" no genera partida (sin pólizas) y el gasto
    // "Mantenimiento" no se duplica: el total es 200 + 30 + 150 + 5000 = 5380.
    // formatCurrency(5380) en es-ES → "5380,00 €" o "5.380,00 €" según ICU.
    const total = await screen.findAllByText(/5\.?380,00/);
    expect(total.length).toBeGreaterThan(0);
  });
});
