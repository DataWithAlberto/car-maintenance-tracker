import { useState } from 'react';
import { maintenanceSchema, type MaintenanceInput } from '../../utils/validators';
import { MAINTENANCE_TYPES } from '../../utils/constants';
import { getNextServiceKm } from '../../utils/calculations';
import { format } from 'date-fns';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FloatingInput, FloatingTextarea, FloatingSelect } from '../ui/FloatingInput';

interface Props {
  initialType?: string;
  currentKm?: number;
  onSubmit: (data: MaintenanceInput) => Promise<void>;
  onClose: () => void;
}

export const MaintenanceForm = ({ initialType, currentKm = 0, onSubmit, onClose }: Props) => {
  const [form, setForm] = useState<Partial<MaintenanceInput>>({
    type: initialType ?? '',
    date: format(new Date(), 'yyyy-MM-dd'),
    km_at_service: currentKm,
    next_service_km: initialType ? getNextServiceKm(initialType, currentKm) : undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof MaintenanceInput, value: string | number | undefined) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleTypeChange = (type: string) => {
    set('type', type);
    set('next_service_km', getNextServiceKm(type, Number(form.km_at_service ?? currentKm)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coerced = {
      ...form,
      km_at_service: Number(form.km_at_service),
      cost: form.cost ? Number(form.cost) : undefined,
      next_service_km: form.next_service_km ? Number(form.next_service_km) : undefined,
    };
    const result = maintenanceSchema.safeParse(coerced);
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
      title="Nuevo registro"
      description="Documenta un mantenimiento o reparación"
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>Cancelar</Button>
          <Button type="submit" form="maintenance-form" loading={loading} fullWidth>
            {loading ? 'Guardando...' : 'Guardar registro'}
          </Button>
        </div>
      }
    >
      <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-4">
        <FloatingSelect
          label="Tipo de mantenimiento"
          value={form.type ?? ''}
          onChange={(e) => handleTypeChange(e.target.value)}
          options={[
            { value: '', label: 'Seleccionar...' },
            ...MAINTENANCE_TYPES.map((t) => ({ value: t, label: t })),
          ]}
          error={errors.type}
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
            label="Kilómetros"
            value={form.km_at_service ?? ''}
            onChange={(e) => set('km_at_service', e.target.value)}
            error={errors.km_at_service}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            type="number"
            step="0.01"
            label="Coste (€)"
            value={form.cost ?? ''}
            onChange={(e) => set('cost', e.target.value || undefined)}
          />
          <FloatingInput
            type="number"
            label="Próximo servicio (km)"
            value={form.next_service_km ?? ''}
            onChange={(e) => set('next_service_km', e.target.value || undefined)}
          />
        </div>

        <FloatingInput
          type="date"
          label="Próximo servicio (fecha)"
          value={form.next_service_date ?? ''}
          onChange={(e) => set('next_service_date', e.target.value || undefined)}
        />

        <FloatingTextarea
          label="Descripción"
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          hint="Notas, taller, observaciones..."
        />

        <FloatingInput
          label="Localización de piezas"
          value={form.parts_location ?? ''}
          onChange={(e) => set('parts_location', e.target.value)}
          hint="Ej: Caja naranja en el maletero"
        />
      </form>
    </Modal>
  );
};
