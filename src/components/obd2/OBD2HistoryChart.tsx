import { useState, useMemo } from 'react';
import type { OBD2Reading } from '../../types';

interface Props {
  readings: OBD2Reading[];
}

type DataKey =
  | 'rpm'
  | 'speed'
  | 'coolant_temp'
  | 'fuel_level'
  | 'odometer'
  | 'battery_voltage'
  | 'engine_load'
  | 'oil_pressure';

const METRIC_CONFIG: Record<
  DataKey,
  { label: string; unit: string; color: string; min: number; max: number }
> = {
  rpm: { label: 'RPM', unit: 'rev/min', color: '#0071e3', min: 0, max: 8000 },
  speed: { label: 'Velocidad', unit: 'km/h', color: '#1a9e3f', min: 0, max: 250 },
  coolant_temp: { label: 'Temperatura', unit: '°C', color: '#c77700', min: 50, max: 120 },
  fuel_level: { label: 'Combustible', unit: '%', color: '#b64400', min: 0, max: 100 },
  odometer: { label: 'Odómetro', unit: 'km', color: '#5e5ce6', min: 0, max: 500000 },
  battery_voltage: { label: 'Batería', unit: 'V', color: '#34c759', min: 8, max: 16 },
  engine_load: { label: 'Carga motor', unit: '%', color: '#ff9500', min: 0, max: 100 },
  oil_pressure: { label: 'Presión aceite', unit: 'kPa', color: '#f5a623', min: 0, max: 100 },
};

export const OBD2HistoryChart = ({ readings }: Props) => {
  const [selectedMetric, setSelectedMetric] = useState<DataKey>('rpm');

  const config = METRIC_CONFIG[selectedMetric];

  const chartData = useMemo(() => {
    if (readings.length === 0) return { values: [], timestamps: [] };

    const values = readings
      .map((r) => {
        const val = r[selectedMetric];
        return val !== null ? val : undefined;
      })
      .filter((v): v is number => v !== undefined);

    const timestamps = readings
      .filter((r) => r[selectedMetric] !== null)
      .map((r) => {
        if (!r.created_at) return '';
        const d = new Date(r.created_at);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      });

    return { values, timestamps };
  }, [readings, selectedMetric]);

  if (chartData.values.length === 0) {
    return (
      <div className="bg-fog rounded-[20px] px-5 py-8 text-center">
        <p className="font-text text-graphite" style={{ fontSize: 14 }}>
          Sin datos históricos para mostrar
        </p>
      </div>
    );
  }

  const minVal = Math.min(...chartData.values);
  const maxVal = Math.max(...chartData.values);
  const range = maxVal - minVal || 1;

  const points = chartData.values.map((v, i) => {
    const x = (i / (chartData.values.length - 1 || 1)) * 100;
    const y = ((maxVal - v) / range) * 100;
    return { x, y };
  });

  const pathD = points.length > 1 ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(METRIC_CONFIG) as DataKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedMetric(key)}
            className={`px-3 py-1 rounded-full text-sm font-text transition-all ${
              selectedMetric === key ? 'text-white' : 'bg-fog text-graphite hover:bg-silver-mist'
            }`}
            style={{
              background: selectedMetric === key ? METRIC_CONFIG[key].color : undefined,
            }}
          >
            {METRIC_CONFIG[key].label}
          </button>
        ))}
      </div>

      <div className="bg-snow border border-silver-mist rounded-[20px] p-5">
        <svg viewBox="0 0 100 60" className="w-full h-48 mb-4" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: config.color, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: config.color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {pathD && (
            <>
              <path
                d={pathD}
                fill="none"
                stroke={config.color}
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
              <path d={`${pathD} L 100,60 L 0,60 Z`} fill="url(#gradient)" />
            </>
          )}

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="0.5"
              fill={config.color}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-fog rounded-[12px] px-3 py-2">
            <p
              className="font-mono uppercase text-graphite text-xs"
              style={{ letterSpacing: '0.1em' }}
            >
              Mín
            </p>
            <p className="font-display text-ink" style={{ fontSize: 16, fontWeight: 600 }}>
              {minVal.toFixed(minVal > 100 ? 0 : 1)} {config.unit}
            </p>
          </div>
          <div className="bg-fog rounded-[12px] px-3 py-2">
            <p
              className="font-mono uppercase text-graphite text-xs"
              style={{ letterSpacing: '0.1em' }}
            >
              Máx
            </p>
            <p className="font-display text-ink" style={{ fontSize: 16, fontWeight: 600 }}>
              {maxVal.toFixed(maxVal > 100 ? 0 : 1)} {config.unit}
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-graphite font-text">
        {chartData.values.length} lecturas en los últimos datos
      </div>
    </div>
  );
};
