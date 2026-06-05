import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkshopPage } from './WorkshopPage';
import type { WorkshopView } from '../services/workshop.service';

const view: WorkshopView = {
  vehicle: {
    id: 'v1',
    brand: 'Ford',
    model: 'Focus',
    year: 2023,
    license_plate: '1234ABC',
    fuel_type: 'Gasolina',
    transmission: 'Manual',
    current_km: 52000,
    vin: 'VIN123',
    updated_at: '2026-06-05T10:00:00Z',
  },
  records: [
    {
      id: 'r1',
      type: 'Cambio de aceite',
      date: '2025-01-01',
      km_at_service: 10000,
      description: 'Aceite 5W30',
      next_service_km: 25000,
    },
  ],
  documents: [
    {
      id: 'd1',
      doc_type: 'ITV',
      file_url: 'https://example.com/itv.pdf',
      file_name: 'itv.pdf',
      expiry_date: '2025-12-01',
      is_important: true,
      created_at: '2025-01-01',
    },
  ],
  insurance: {
    id: 'i1',
    provider: 'Mutua',
    coverage_type: 'todo_riesgo',
    start_date: '2025-01-01',
    end_date: '2026-01-01',
    contact_phone: '900000000',
  },
  obd2: {
    latest: {
      vehicle_id: 'v1',
      timestamp: Date.now(),
      rpm: 850,
      speed: 0,
      coolant_temp: 92,
      fuel_level: 42,
      odometer: 52000,
      oil_pressure: 220,
      battery_voltage: 12.2,
      engine_load: 31,
      timing_advance: null,
      engine_runtime: null,
      maf_air_flow: null,
      fuel_trim_bank1: null,
      fuel_rate: null,
      short_term_fuel_trim_1: null,
      long_term_fuel_trim_1: null,
      intake_manifold_pressure: null,
      absolute_load: null,
      relative_throttle_pos: null,
      ambient_air_temp: null,
      abs_throttle_pos_b: null,
      acc_pedal_pos_d: null,
      acc_pedal_pos_e: null,
      catalyst_temp_bank1_sensor1: null,
      num_emissions_dtc: null,
      created_at: '2026-06-05T10:00:00Z',
    },
    readings: [],
    anomalies: [
      {
        id: 'a1',
        type: 'low_battery',
        severity: 'warn',
        value: 12.2,
        threshold: 12.4,
        message: 'Voltaje de batería bajo',
        dismissed: false,
        created_at: '2026-06-05T10:00:00Z',
      },
    ],
  },
};

vi.mock('../services/workshop.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/workshop.service')>();
  return {
    ...actual,
    workshopService: {
      getView: vi.fn(async () => view),
    },
  };
});

vi.mock('../utils/printHtml', () => ({
  printHtml: vi.fn(),
}));

describe('WorkshopPage', () => {
  it('renderiza dossier técnico sin costes ni gastos personales', async () => {
    render(
      <MemoryRouter initialEntries={['/taller/token']}>
        <Routes>
          <Route path="/taller/:token" element={<WorkshopPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ford Focus')).toBeInTheDocument();
    expect(await screen.findByText('Voltaje de batería bajo')).toBeInTheDocument();
    expect(screen.getByText('Aceite y filtro')).toBeInTheDocument();

    expect(screen.queryByText(/Coste/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gastos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prima/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Póliza/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });
});
