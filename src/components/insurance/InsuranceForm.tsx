import { useState } from 'react';
import { insuranceSchema, type InsuranceInput } from '../../utils/validators';
import { INSURANCE_COVERAGE_LABELS, INSURANCE_PAYMENT_LABELS } from '../../utils/constants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FloatingInput, FloatingTextarea, FloatingSelect } from '../ui/FloatingInput';

interface Props {
  initialData?: Partial<InsuranceInput>;
  onSubmit: (data: InsuranceInput) => Promise<void>;
  onClose: () => void;
}

export const InsuranceForm = ({ initialData, onSubmit, onClose }: Props) => {
  const isEdit = initialData != null;
  const [form, setForm] = useState<Partial<InsuranceInput>>(
    initialData ?? { provider: '', coverage_type: undefined },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof InsuranceInput, value: string | number | undefined) => {
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
    const coerced = {
      ...form,
      premium_amount:
        form.premium_amount === undefined || form.premium_amount === ('' as unknown)
          ? undefined
          : Number(form.premium_amount),
      deductible:
        form.deductible === undefined || form.deductible === ('' as unknown)
          ? undefined
          : Number(form.deductible),
    };
    const result = insuranceSchema.safeParse(coerced);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
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
      title={isEdit ? 'Editar póliza' : 'Nueva póliza'}
      description="Datos del seguro del vehículo"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>Cancelar</Button>
          <Button type="submit" form="insurance-form" variant="accent" loading={loading} fullWidth>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar póliza'}
          </Button>
        </div>
      }
    >
      <form id="insurance-form" onSubmit={handleSubmit} className="space-y-4">
        <FloatingInput
          label="Aseguradora"
          value={form.provider ?? ''}
          onChange={(e) => set('provider', e.target.value)}
          error={errors.provider}
        />

        <FloatingInput
          label="Número de póliza"
          value={form.policy_number ?? ''}
          onChange={(e) => set('policy_number', e.target.value)}
          error={errors.policy_number}
        />

        <FloatingSelect
          label="Cobertura"
          value={form.coverage_type ?? ''}
          onChange={(e) => set('coverage_type', e.target.value || undefined)}
          options={[
            { value: '', label: 'Seleccionar...' },
            ...Object.entries(INSURANCE_COVERAGE_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          error={errors.coverage_type}
        />

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            type="date"
            label="Inicio"
            value={form.start_date ?? ''}
            onChange={(e) => set('start_date', e.target.value)}
            error={errors.start_date}
          />
          <FloatingInput
            type="date"
            label="Fin"
            value={form.end_date ?? ''}
            onChange={(e) => set('end_date', e.target.value)}
            error={errors.end_date}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            type="number"
            step="0.01"
            label="Prima (€)"
            value={form.premium_amount ?? ''}
            onChange={(e) => set('premium_amount', e.target.value)}
            error={errors.premium_amount}
          />
          <FloatingSelect
            label="Frecuencia de pago"
            value={form.payment_frequency ?? ''}
            onChange={(e) => set('payment_frequency', e.target.value || undefined)}
            options={[
              { value: '', label: 'Seleccionar...' },
              ...Object.entries(INSURANCE_PAYMENT_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            error={errors.payment_frequency}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            type="number"
            step="0.01"
            label="Franquicia (€)"
            value={form.deductible ?? ''}
            onChange={(e) => set('deductible', e.target.value)}
            error={errors.deductible}
          />
          <FloatingInput
            label="Teléfono de contacto"
            value={form.contact_phone ?? ''}
            onChange={(e) => set('contact_phone', e.target.value)}
            error={errors.contact_phone}
          />
        </div>

        <FloatingTextarea
          label="Notas"
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          hint="Detalles opcionales (asistencia en carretera, coche de sustitución...)"
        />
      </form>
    </Modal>
  );
};
