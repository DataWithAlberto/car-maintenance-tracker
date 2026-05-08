import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// Dyotanya palette — sky/sunset/vivid + tonal variations
const COLORS = [
  '#81aed9', // sky-blueprint
  '#ff8562', // sunset-orange
  '#55a1ea', // vivid-blue
  '#ffb3a0', // sunset-light
  '#5a8ab3', // sky-dark
  '#a8c9e8', // sky-light
  '#e55c3a', // sunset-deep
  '#436a8c', // sky-deeper
  '#ffd1c2', // sunset-pale
  '#333333', // ink-charcoal
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
              border: '1px solid rgba(129, 174, 217, 0.4)',
              borderRadius: '20px',
              boxShadow: '5px -5px 0px 0px rgb(51, 51, 51)',
              fontFamily: 'Manrope, sans-serif',
            }}
            labelStyle={{ color: '#000000', fontWeight: 500 }}
            itemStyle={{ color: '#333333' }}
          />
          <Legend wrapperStyle={{ color: '#333333', fontSize: '12px', fontFamily: 'Manrope, sans-serif' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
