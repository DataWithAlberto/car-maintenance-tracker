import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, BarChart2, List } from 'lucide-react';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseChart } from '../components/expenses/ExpenseChart';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { expensesService } from '../services/expenses.service';
import type { Expense } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos</h1>
          <p className="text-gray-400 text-sm mt-1">
            {expenses.length} registros · {formatCurrency(total)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setView('chart')} className={`p-1.5 rounded ${view === 'chart' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
              <BarChart2 className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Añadir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'chart' ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <ExpenseChart expenses={expenses} />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Sin gastos registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{e.category}</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(e.amount)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-gray-400 text-sm">{formatDate(e.date)}</span>
                  {e.description && <span className="text-gray-500 text-sm truncate">· {e.description}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(e.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ExpenseForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
};
