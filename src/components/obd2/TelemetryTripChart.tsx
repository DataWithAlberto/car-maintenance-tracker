import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { TelemetriaPunto } from '../../types';

interface Props {
  puntos: TelemetriaPunto[];
}

type PidKey =
  | 'velocidad'
  | 'rpm'
  | 'temp_refrigerante'
  | 'carga_motor'
  | 'posicion_acelerador'
  | 'presion_admision'
  | 'temp_admision'
  | 'flujo_maf';

const PID_CONFIG: Record<PidKey, { label: string; unit: string; color: string; decimals: number }> =
  {
    velocidad: { label: 'Velocidad', unit: 'km/h', color: '#1a9e3f', decimals: 0 },
    rpm: { label: 'RPM', unit: 'rpm', color: '#0071e3', decimals: 0 },
    temp_refrigerante: { label: 'Refrigerante', unit: '°C', color: '#c77700', decimals: 0 },
    carga_motor: { label: 'Carga motor', unit: '%', color: '#ff9500', decimals: 0 },
    posicion_acelerador: { label: 'Acelerador', unit: '%', color: '#ff3b30', decimals: 0 },
    presion_admision: { label: 'Presión adm.', unit: 'kPa', color: '#5e5ce6', decimals: 0 },
    temp_admision: { label: 'Temp. admisión', unit: '°C', color: '#0a84ff', decimals: 0 },
    flujo_maf: { label: 'Flujo MAF', unit: 'g/s', color: '#bf5af2', decimals: 1 },
  };

const PID_ORDER = Object.keys(PID_CONFIG) as PidKey[];

/** Formatea segundos transcurridos como m:ss o h:mm:ss. */
const fmtElapsed = (seg: number): string => {
  const s = Math.max(0, Math.round(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}`;
};

// Mantiene el SVG ligero en viajes largos (~1 Hz → miles de puntos).
const MAX_POINTS = 400;

/**
 * Dashboard histórico de PIDs: traza cómo evolucionó un parámetro a lo largo de
 * un viaje de telemetría. Reutiliza los `telemetria_puntos` ya cargados por
 * `TelemetryTripsSection`, así que no hace consultas adicionales.
 */
export const TelemetryTripChart = ({ puntos }: Props) => {
  // Qué PIDs traen al menos un dato en este viaje.
  const available = useMemo(() => {
    const set = new Set<PidKey>();
    for (const p of puntos) {
      for (const key of PID_ORDER) {
        if (p[key] != null) set.add(key);
      }
    }
    return PID_ORDER.filter((k) => set.has(k));
  }, [puntos]);

  const [metric, setMetric] = useState<PidKey>('velocidad');
  // Si el PID elegido no tiene datos en este viaje, salta al primero disponible.
  const active: PidKey | null = available.includes(metric) ? metric : (available[0] ?? null);

  const t0 = puntos.length > 0 ? puntos[0].timestamp_ms : 0;

  const { data, min, max, avg } = useMemo(() => {
    if (!active) return { data: [], min: null, max: null, avg: null };

    const raw = puntos
      .filter((p) => p[active] != null)
      .map((p) => ({ t: (p.timestamp_ms - t0) / 1000, v: p[active] as number }));

    if (raw.length === 0) return { data: [], min: null, max: null, avg: null };

    const stride = Math.max(1, Math.ceil(raw.length / MAX_POINTS));
    const sampled = raw.filter((_, i) => i % stride === 0 || i === raw.length - 1);

    let mn = Infinity;
    let mx = -Infinity;
    let sum = 0;
    for (const r of raw) {
      if (r.v < mn) mn = r.v;
      if (r.v > mx) mx = r.v;
      sum += r.v;
    }

    return { data: sampled, min: mn, max: mx, avg: sum / raw.length };
  }, [puntos, active, t0]);

  if (available.length === 0) {
    return (
      <div className="bg-fog rounded-[18px] px-5 py-8 text-center">
        <p className="font-text text-graphite" style={{ fontSize: 13 }}>
          Este viaje no tiene datos de PIDs para graficar.
        </p>
      </div>
    );
  }

  const cfg = active ? PID_CONFIG[active] : null;
  const fmtVal = (v: number) => v.toFixed(cfg?.decimals ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {available.map((key) => {
          const sel = key === active;
          return (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className="px-3 py-1 rounded-full font-text transition-all"
              style={{
                fontSize: 13,
                background: sel ? PID_CONFIG[key].color : 'var(--color-fog)',
                color: sel ? '#fff' : 'var(--color-graphite)',
              }}
            >
              {PID_CONFIG[key].label}
            </button>
          );
        })}
      </div>

      {cfg && data.length > 0 && (
        <div className="bg-snow border border-silver-mist rounded-[20px] p-5">
          <div className="flex items-baseline justify-between mb-3">
            <p
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 10, letterSpacing: '0.12em' }}
            >
              {cfg.label} · {cfg.unit}
            </p>
            <p className="font-mono text-graphite" style={{ fontSize: 10 }}>
              {data.length} muestras
            </p>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`tg-${active}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cfg.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--color-silver-mist)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={fmtElapsed}
                tick={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 10,
                  fill: 'var(--color-mist)',
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={36}
              />
              <YAxis
                tick={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 10,
                  fill: 'var(--color-mist)',
                }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
              />
              <Tooltip
                formatter={(val) => [`${fmtVal(Number(val))} ${cfg.unit}`, cfg.label]}
                labelFormatter={(t) => `t+${fmtElapsed(Number(t))}`}
                contentStyle={{
                  background: 'var(--color-snow)',
                  border: '1px solid var(--color-silver-mist)',
                  borderRadius: 12,
                  boxShadow: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  padding: '8px 14px',
                }}
                labelStyle={{
                  color: 'var(--color-ink)',
                  fontWeight: 500,
                  fontSize: 13,
                  marginBottom: 2,
                }}
                itemStyle={{ color: 'var(--color-graphite)', fontSize: 13 }}
                cursor={{ stroke: cfg.color, strokeWidth: 1, strokeOpacity: 0.4 }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={cfg.color}
                strokeWidth={1.6}
                fill={`url(#tg-${active})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {(
              [
                ['Mín', min],
                ['Media', avg],
                ['Máx', max],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-fog rounded-[12px] px-3 py-2">
                <p
                  className="font-mono uppercase text-graphite"
                  style={{ fontSize: 9, letterSpacing: '0.1em' }}
                >
                  {label}
                </p>
                <p
                  className="font-display text-ink tabular-nums"
                  style={{ fontSize: 17, fontWeight: 600 }}
                >
                  {value != null ? fmtVal(value) : '—'}
                  <span className="font-text text-graphite" style={{ fontSize: 11, marginLeft: 3 }}>
                    {cfg.unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
