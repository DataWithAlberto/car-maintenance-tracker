import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, BarChart2, List, Receipt, Calendar } from 'lucide-react';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseChart } from '../components/expenses/ExpenseChart';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { expensesService } from '../services/expenses.service';
import type { Expense } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

export const ExpensesPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'chart'>('list');

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    setLoading(true);
    expensesService.getByVehicle(selectedVehicle.id)
      .then(setExpenses)
      .finally(() => setLoading(false));
  }, [selectedVehicle?.id]);

  if (!selectedVehicle) return null;

  const handleCreate = async (data: Parameters<typeof expensesService.create>[2]) => {
    if (!user) return;
    const e = await expensesService.create(selectedVehicle.id, user.id, data);
    setExpenses((prev) => [e, ...prev]);
    toast.success('Gasto añadido');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await expensesService.delete(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.success('Gasto eliminado');
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const now = new Date();
  const monthTotal = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="px-6 sm:px-10 py-10">
      <header className="flex items-end justify-between mb-10 gap-6 flex-wrap">
        <div>
          <span className="eyebrow">
            {selectedVehicle.brand} {selectedVehicle.model}
            {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 56px)',
              lineHeight: 1.07,
              letterSpacing: '-0.9px',
              margin: '12px 0 0',
            }}
          >
            Gastos.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            <span className="text-ink font-medium tabular-nums">{expenses.length}</span> registros ·{' '}
            <span className="text-ink font-medium tabular-nums">{formatCurrency(total)}</span> total ·{' '}
            <span className="text-ink font-medium tabular-nums">{formatCurrency(monthTotal)}</span> este mes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-fog rounded-full p-1">
            {([['list', List], ['chart', BarChart2]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors',
                  view === v ? 'bg-snow text-ink' : 'text-graphite hover:text-ink',
                )}
                aria-label={v === 'list' ? 'Vista lista' : 'Vista gráfica'}
              >
                <Icon className="h-4 w-4" strokeWidth={1.6} />
              </button>
            ))}
          </div>
          <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}>
            Añadir
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : view === 'chart' ? (
        <div className="bg-snow border border-silver-mist rounded-[28px] p-7">
          <ExpenseChart expenses={expenses} />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin gastos registrados"
          description="Lleva el control de gasolina, peajes, seguros y todo lo que pagues por tu coche."
          action={
            <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}>
              Registrar primer gasto
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="group bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center gap-4 transition-colors hover:bg-fog"
            >
              <div className="shrink-0 h-11 w-11 rounded-[10px] bg-fog flex items-center justify-center">
                <Receipt className="h-5 w-5 text-ink" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-text text-ink font-medium truncate" style={{ fontSize: 15 }}>
                    {e.category}
                  </span>
                  <span
                    className="font-display text-ink font-semibold tabular-nums shrink-0"
                    style={{ fontSize: 17, letterSpacing: '-0.1px' }}
                  >
                    {formatCurrency(e.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-graphite font-text" style={{ fontSize: 13 }}>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" strokeWidth={1.6} />
                    {formatDate(e.date)}
                  </span>
                  {e.description && (
                    <>
                      <span className="text-silver-mist">·</span>
                      <span className="truncate">{e.description}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(e.id)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full text-graphite hover:text-caution hover:bg-fog transition-colors"
                aria-label="Eliminar gasto"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <ExpenseForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
};
