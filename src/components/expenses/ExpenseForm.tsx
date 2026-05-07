import { useState } from 'react';
import { expenseSchema, type ExpenseInput } from '../../utils/validators';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { X } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  onSubmit: (data: ExpenseInput) => Promise<void>;
  onClose: () => void;
}

export const ExpenseForm = ({ onSubmit, onClose }: Props) => {
  const [form, setForm] = useState<Partial<ExpenseInput>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    amount: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof ExpenseInput, value: string | number | undefined) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coerced = { ...form, amount: Number(form.amount) };
    const result = expenseSchema.safeParse(coerced);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((e) => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await onSubmit(result.data);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Nuevo gasto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Categoría" error={errors.category}>
            <select value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} className={inputCls}>
              <option value="">Seleccionar...</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha" error={errors.date}>
              <input type="date" value={form.date ?? ''} onChange={(e) => set('date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Importe (€)" error={errors.amount}>
              <input type="number" step="0.01" value={form.amount ?? ''} onChange={(e) => set('amount', e.target.value)} className={inputCls} placeholder="0.00" />
            </Field>
          </div>

          <Field label="Descripción">
            <textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="Descripción opcional..." />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2.5 text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors';

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);
