import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TelemetryTripChart } from './TelemetryTripChart';
import type { TelemetriaPunto } from '../../types';

const punto = (over: Partial<TelemetriaPunto>): TelemetriaPunto => ({
  viaje_id: 'v1',
  timestamp_ms: 0,
  latitude: null,
  longitude: null,
  rpm: null,
  velocidad: null,
  carga_motor: null,
  temp_refrigerante: null,
  presion_admision: null,
  temp_admision: null,
  flujo_maf: null,
  posicion_acelerador: null,
  ...over,
});

describe('TelemetryTripChart', () => {
  it('muestra un aviso cuando no hay PIDs con datos', () => {
    const puntos = [punto({ timestamp_ms: 0 }), punto({ timestamp_ms: 1000 })];
    render(<TelemetryTripChart puntos={puntos} />);
    expect(screen.getByText(/no tiene datos de PIDs/i)).toBeInTheDocument();
  });

  it('solo ofrece chips de los PIDs con datos en el viaje', () => {
    const puntos = [
      punto({ timestamp_ms: 0, velocidad: 0, rpm: 800 }),
      punto({ timestamp_ms: 1000, velocidad: 50, rpm: 2500 }),
    ];
    render(<TelemetryTripChart puntos={puntos} />);
    expect(screen.getByRole('button', { name: 'Velocidad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RPM' })).toBeInTheDocument();
    // Sin datos de temperatura → no aparece su chip.
    expect(screen.queryByRole('button', { name: 'Refrigerante' })).not.toBeInTheDocument();
  });

  it('calcula mín/media/máx del PID seleccionado', () => {
    const puntos = [
      punto({ timestamp_ms: 0, velocidad: 0 }),
      punto({ timestamp_ms: 1000, velocidad: 60 }),
      punto({ timestamp_ms: 2000, velocidad: 120 }),
    ];
    render(<TelemetryTripChart puntos={puntos} />);
    // Velocidad es el PID por defecto: min 0, media 60, max 120.
    expect(screen.getByText('0', { selector: 'p.font-display' })).toBeInTheDocument();
    expect(screen.getByText('60', { selector: 'p.font-display' })).toBeInTheDocument();
    expect(screen.getByText('120', { selector: 'p.font-display' })).toBeInTheDocument();
  });

  it('recalcula las estadísticas al cambiar de PID', () => {
    const puntos = [
      punto({ timestamp_ms: 0, velocidad: 10, rpm: 1000 }),
      punto({ timestamp_ms: 1000, velocidad: 10, rpm: 3000 }),
    ];
    render(<TelemetryTripChart puntos={puntos} />);
    fireEvent.click(screen.getByRole('button', { name: 'RPM' }));
    // RPM: min 1000, max 3000.
    expect(screen.getByText('1000', { selector: 'p.font-display' })).toBeInTheDocument();
    expect(screen.getByText('3000', { selector: 'p.font-display' })).toBeInTheDocument();
  });
});
