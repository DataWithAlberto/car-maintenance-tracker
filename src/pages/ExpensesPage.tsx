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
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
      <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="font-manrope text-caption text-sky-dark/80 tracking-wide mb-1">
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <h1 className="font-simeiz text-heading-lg font-light text-ink-black tracking-tight">Gastos</h1>
          <p className="font-manrope text-caption text-ink-charcoal/70 mt-1.5">
            <span className="font-semibold text-ink-black tabular-nums">{expenses.length}</span> registros ·{' '}
            <span className="text-sunset-orange font-semibold tabular-nums">{formatCurrency(total)}</span> total ·{' '}
            <span className="text-sky-dark font-semibold tabular-nums">{formatCurrency(monthTotal)}</span> este mes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-canvas-50 border border-sky-blueprint/25 rounded-button p-1">
            <button
              onClick={() => setView('list')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                view === 'list' ? 'bg-sky-blueprint/15 text-sky-dark' : 'text-ink-charcoal hover:text-ink-black',
              )}
              aria-label="Vista lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('chart')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                view === 'chart' ? 'bg-sky-blueprint/15 text-sky-dark' : 'text-ink-charcoal hover:text-ink-black',
              )}
              aria-label="Vista gráfica"
            >
              <BarChart2 className="h-4 w-4" />
            </button>
          </div>
          <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" />}>
            Añadir
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : view === 'chart' ? (
        <div className="bg-cloud-white border border-sky-blueprint/25 rounded-card shadow-card p-20 sm:p-6">
          <ExpenseChart expenses={expenses} />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin gastos registrados"
          description="Lleva el control de gasolina, peajes, seguros y todo lo que pagues por tu coche."
          action={
            <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" />}>
              Registrar primer gasto
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="group bg-cloud-white border border-sky-blueprint/20 hover:border-sunset-orange/40 rounded-card p-4 flex items-center gap-4 transition-all hover:shadow-subtle"
            >
              <div className="shrink-0 h-11 w-11 rounded-input bg-gradient-to-br from-sunset-orange/20 to-sunset-orange/5 border border-sunset-orange/30 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-sunset-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-black font-medium truncate tracking-tight">{e.category}</span>
                  <span className="text-sunset-orange font-semibold tabular-nums shrink-0">{formatCurrency(e.amount)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-ink-charcoal">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(e.date)}
                  </span>
                  {e.description && (
                    <>
                      <span className="text-ink-charcoal/80">·</span>
                      <span className="truncate">{e.description}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(e.id)}
                className="text-ink-charcoal/80 hover:text-danger-400 hover:bg-danger-500/10 p-1.5 rounded-md transition-colors"
                aria-label="Eliminar gasto"
              >
                <Trash2 className="h-4 w-4" />
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
