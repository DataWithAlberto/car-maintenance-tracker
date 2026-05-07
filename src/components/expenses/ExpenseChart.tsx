import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/formatters';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

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
      <div className="text-center py-8 text-gray-500 text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">Total</p>
        <p className="text-2xl font-bold text-white">{formatCurrency(total)}</p>
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
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#f9fafb' }}
          />
          <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
