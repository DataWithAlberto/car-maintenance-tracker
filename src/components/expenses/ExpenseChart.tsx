import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  expenses: Expense[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Combustible':   '#0071e3',
  'Mantenimiento': 'var(--color-ink)',
  'Reparación':    'var(--color-slate)',
  'Seguro':        '#0066cc',
  'ITV':           '#6e6e73',
  'Parking':       '#a8d3fb',
  'Lavado':        '#3a3a3c',
  'Accesorios':    'var(--color-graphite)',
  'Multas':        '#b64400',
  'Otros':         'var(--color-mist)',
};

export const ExpenseChart = ({ expenses }: Props) => {
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase(),
        value: 0,
      };
    });
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.find((x) => x.key === key);
      if (m) m.value += e.amount;
    });
    return months;
  }, [expenses]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e) => { cats[e.category] = (cats[e.category] ?? 0) + e.amount; });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const forecast = useMemo(() => {
    const ys = monthlyData.map((m) => m.value);
    const n = ys.length;
    const sumX = ys.reduce((s, _, i) => s + i, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = ys.reduce((s, y, i) => s + i * y, 0);
    const sumXX = ys.reduce((s, _, i) => s + i * i, 0);
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;
    const now = new Date();
    return Array.from({ length: 3 }, (_, k) => {
      const x = n + k;
      const d = new Date(now.getFullYear(), now.getMonth() + 1 + k, 1);
      return {
        label: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase(),
        value: Math.max(0, intercept + slope * x),
      };
    });
  }, [monthlyData]);

  const forecastTotal = forecast.reduce((s, f) => s + f.value, 0);
  const forecastMax = Math.max(...forecast.map((f) => f.value), 1);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const maxCat = categoryData[0]?.value ?? 1;
  const nonZeroMonths = monthlyData.filter((m) => m.value > 0).length;
  const avgPerMonth = nonZeroMonths > 0 ? total / nonZeroMonths : 0;

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 font-text text-graphite" style={{ fontSize: 14 }}>
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* KPI strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, background: 'var(--color-silver-mist)', borderRadius: 16, overflow: 'hidden',
      }}>
        {([
          ['TOTAL', formatCurrency(total)],
          ['MEDIA / MES', formatCurrency(avgPerMonth)],
          ['REGISTROS', String(expenses.length)],
        ] as const).map(([label, value]) => (
          <div key={label} style={{ padding: '18px 20px', background: 'var(--color-fog)' }}>
            <div
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 10, letterSpacing: '0.12em' }}
            >{label}</div>
            <div
              className="font-display text-ink tabular-nums"
              style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.3px', marginTop: 6 }}
            >{value}</div>
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      <div>
        <p
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 11, letterSpacing: '0.14em', marginBottom: 20 }}
        >
          Gasto mensual · últimos 12 meses
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyData} barSize={16} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fill: 'var(--color-mist)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fill: 'var(--color-mist)' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            />
            <Tooltip
              formatter={(val) => [formatCurrency(Number(val)), 'Gasto']}
              contentStyle={{
                background: 'var(--color-snow)', border: '1px solid var(--color-silver-mist)',
                borderRadius: 12, boxShadow: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                padding: '8px 14px',
              }}
              labelStyle={{ color: 'var(--color-ink)', fontWeight: 500, fontSize: 13, marginBottom: 2 }}
              itemStyle={{ color: 'var(--color-graphite)', fontSize: 13 }}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Bar dataKey="value" radius={[5, 5, 2, 2]}>
              {monthlyData.map((entry, i) => (
                <Cell key={i} fill={entry.value > 0 ? '#0071e3' : 'var(--color-silver-mist)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category horizontal bars */}
      <div>
        <p
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 11, letterSpacing: '0.14em', marginBottom: 20 }}
        >
          Por categoría
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {categoryData.map(({ name, value }) => {
            const pct = Math.round((value / total) * 100);
            const barW = (value / maxCat) * 100;
            const color = CATEGORY_COLORS[name] ?? 'var(--color-graphite)';
            return (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span className="font-text text-ink" style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="font-mono text-graphite" style={{ fontSize: 11 }}>{pct}%</span>
                    <span
                      className="font-display text-ink tabular-nums"
                      style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.1px' }}
                    >{formatCurrency(value)}</span>
                  </div>
                </div>
                <div style={{ height: 4, background: 'var(--color-silver-mist)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${barW}%`,
                    background: color, borderRadius: 999,
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast */}
      <div>
        <p
          className="font-mono uppercase text-graphite"
          style={{ fontSize: 11, letterSpacing: '0.14em', marginBottom: 20 }}
        >
          Proyección · próximos 3 meses
        </p>
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 16, background: 'var(--color-fog)', borderRadius: 16, padding: '20px 22px',
        }}>
          <div>
            <div
              className="font-mono uppercase text-graphite"
              style={{ fontSize: 10, letterSpacing: '0.12em' }}
            >GASTO ESTIMADO</div>
            <div
              className="font-display text-ink tabular-nums"
              style={{ fontWeight: 700, fontSize: 26, letterSpacing: '-0.3px', marginTop: 6 }}
            >{formatCurrency(forecastTotal)}</div>
            <div className="font-text text-graphite" style={{ fontSize: 12, marginTop: 4 }}>
              tendencia sobre los últimos 12 meses
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 80 }}>
            {forecast.map((f) => (
              <div key={f.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span className="font-mono text-graphite tabular-nums" style={{ fontSize: 10 }}>
                  {Math.round(f.value)}
                </span>
                <div style={{
                  width: 26,
                  height: `${Math.max(6, (f.value / forecastMax) * 56)}px`,
                  background: 'repeating-linear-gradient(45deg,#0071e3,#0071e3 3px,#a8d3fb 3px,#a8d3fb 6px)',
                  borderRadius: '5px 5px 2px 2px',
                }} />
                <span className="font-mono text-graphite" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
