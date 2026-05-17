import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  expenses: Expense[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Combustible':   '#0071e3',
  'Mantenimiento': '#1d1d1f',
  'Reparación':    '#474747',
  'Seguro':        '#0066cc',
  'ITV':           '#6e6e73',
  'Parking':       '#a8d3fb',
  'Lavado':        '#3a3a3c',
  'Accesorios':    '#707070',
  'Multas':        '#b64400',
  'Otros':         '#a1a1a6',
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
        gap: 1, background: '#e8e8ed', borderRadius: 16, overflow: 'hidden',
      }}>
        {([
          ['TOTAL', formatCurrency(total)],
          ['MEDIA / MES', formatCurrency(avgPerMonth)],
          ['REGISTROS', String(expenses.length)],
        ] as const).map(([label, value]) => (
          <div key={label} style={{ padding: '18px 20px', background: '#f5f5f7' }}>
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
              tick={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fill: '#a1a1a6' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fill: '#a1a1a6' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            />
            <Tooltip
              formatter={(val) => [formatCurrency(Number(val)), 'Gasto']}
              contentStyle={{
                background: '#fff', border: '1px solid #e8e8ed',
                borderRadius: 12, boxShadow: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                padding: '8px 14px',
              }}
              labelStyle={{ color: '#1d1d1f', fontWeight: 500, fontSize: 13, marginBottom: 2 }}
              itemStyle={{ color: '#707070', fontSize: 13 }}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Bar dataKey="value" radius={[5, 5, 2, 2]}>
              {monthlyData.map((entry, i) => (
                <Cell key={i} fill={entry.value > 0 ? '#0071e3' : '#e8e8ed'} />
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
            const color = CATEGORY_COLORS[name] ?? '#707070';
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
                <div style={{ height: 4, background: '#e8e8ed', borderRadius: 999, overflow: 'hidden' }}>
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
    </div>
  );
};
