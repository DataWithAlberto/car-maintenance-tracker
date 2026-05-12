import { useState } from 'react';
import { vehicleSchema, type VehicleInput } from '../../utils/validators';
import { FUEL_TYPES, TRANSMISSION_TYPES } from '../../utils/constants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FloatingInput, FloatingSelect } from '../ui/FloatingInput';

interface Props {
  initialData?: Partial<VehicleInput>;
  onSubmit: (data: VehicleInput) => Promise<void>;
  onClose: () => void;
}

export const VehicleForm = ({ initialData, onSubmit, onClose }: Props) => {
  const [form, setForm] = useState<Partial<VehicleInput>>({
    brand: 'Ford',
    model: 'Focus',
    year: 2023,
    current_km: 0,
    fuel_type: 'Gasolina',
    transmission: 'Manual',
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof VehicleInput, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = vehicleSchema.safeParse({
      ...form,
      year: Number(form.year),
      current_km: Number(form.current_km),
    });
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
      title={initialData ? 'Editar vehículo' : 'Añadir vehículo'}
      description={initialData ? 'Actualiza los datos de tu coche' : 'Cuéntanos sobre tu nuevo coche'}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>Cancelar</Button>
          <Button type="submit" form="vehicle-form" loading={loading} fullWidth>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FloatingInput label="Marca" value={form.brand ?? ''} onChange={(e) => set('brand', e.target.value)} error={errors.brand} />
          <FloatingInput label="Modelo" value={form.model ?? ''} onChange={(e) => set('model', e.target.value)} error={errors.model} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput type="number" label="Año" value={form.year ?? ''} onChange={(e) => set('year', e.target.value)} error={errors.year} />
          <FloatingInput type="number" label="Kilómetros" value={form.current_km ?? ''} onChange={(e) => set('current_km', e.target.value)} error={errors.current_km} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput label="Matrícula" value={form.license_plate ?? ''} onChange={(e) => set('license_plate', e.target.value)} hint="Opcional" />
          <FloatingInput label="Color" value={form.color ?? ''} onChange={(e) => set('color', e.target.value)} hint="Opcional" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FloatingSelect
            label="Combustible"
            value={form.fuel_type ?? ''}
            onChange={(e) => set('fuel_type', e.target.value)}
            options={FUEL_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <FloatingSelect
            label="Transmisión"
            value={form.transmission ?? ''}
            onChange={(e) => set('transmission', e.target.value)}
            options={TRANSMISSION_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </div>

        <FloatingInput
          label="VIN"
          value={form.vin ?? ''}
          onChange={(e) => set('vin', e.target.value)}
          hint="Número de chasis (opcional)"
        />
      </form>
    </Modal>
  );
};
