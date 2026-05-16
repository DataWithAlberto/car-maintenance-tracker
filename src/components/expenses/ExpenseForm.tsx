import { useState } from 'react';
import { expenseSchema, type ExpenseInput } from '../../utils/validators';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { format } from 'date-fns';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FloatingInput, FloatingTextarea, FloatingSelect } from '../ui/FloatingInput';

interface Props {
  initialData?: Partial<ExpenseInput>;
  onSubmit: (data: ExpenseInput) => Promise<void>;
  onClose: () => void;
}

export const ExpenseForm = ({ initialData, onSubmit, onClose }: Props) => {
  const isEdit = initialData != null;
  const [form, setForm] = useState<Partial<ExpenseInput>>(
    initialData ?? {
      date: format(new Date(), 'yyyy-MM-dd'),
      category: '',
      amount: undefined,
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof ExpenseInput, value: string | number | undefined) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

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
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Editar gasto' : 'Nuevo gasto'}
      description="Registra un gasto del vehículo"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>Cancelar</Button>
          <Button type="submit" form="expense-form" variant="accent" loading={loading} fullWidth>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar gasto'}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        <FloatingSelect
          label="Categoría"
          value={form.category ?? ''}
          onChange={(e) => set('category', e.target.value)}
          options={[
            { value: '', label: 'Seleccionar...' },
            ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
          error={errors.category}
        />

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            type="date"
            label="Fecha"
            value={form.date ?? ''}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <FloatingInput
            type="number"
            step="0.01"
            label="Importe (€)"
            value={form.amount ?? ''}
            onChange={(e) => set('amount', e.target.value)}
            error={errors.amount}
          />
        </div>

        <FloatingTextarea
          label="Descripción"
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          hint="Detalles opcionales"
        />
      </form>
    </Modal>
  );
};
