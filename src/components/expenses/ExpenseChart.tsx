import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// Apple palette — azure/ink/graphite tonal scale
const COLORS = [
  '#0071e3', // azure
  '#1d1d1f', // ink
  '#707070', // graphite
  '#0066cc', // cobalt-link
  '#474747', // slate
  '#333333', // ash
  '#a8d3fb', // azure-light
  '#e8e8ed', // silver-mist
  '#3a3a3c', // ink-mid
  '#6e6e73', // graphite-light
];

interface Props {
  expenses: Expense[];
}

export const ExpenseChart = ({ expenses }: Props) => {
  const data = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-ink-charcoal text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-4">
        <p className="font-manrope text-caption text-ink-charcoal uppercase tracking-wider">Total</p>
        <p className="font-simeiz text-heading-lg font-light text-ink-black tabular-nums">{formatCurrency(total)}</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val) => formatCurrency(Number(val))}
            contentStyle={{
              background: '#ffffff',
              border: '1px solid #e8e8ed',
              borderRadius: '28px',
              boxShadow: 'none',
              fontFamily: 'SF Pro Text, ui-sans-serif, system-ui, -apple-system, sans-serif',
            }}
            labelStyle={{ color: '#1d1d1f', fontWeight: 500 }}
            itemStyle={{ color: '#707070' }}
          />
          <Legend wrapperStyle={{ color: '#707070', fontSize: '12px', fontFamily: 'SF Pro Text, ui-sans-serif, system-ui, -apple-system, sans-serif' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
