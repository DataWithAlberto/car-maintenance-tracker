import { useState } from 'react';
import { vehicleSchema, type VehicleInput } from '../../utils/validators';
import { FUEL_TYPES, TRANSMISSION_TYPES } from '../../utils/constants';
import { X } from 'lucide-react';

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
    const result = vehicleSchema.safeParse({ ...form, year: Number(form.year), current_km: Number(form.current_km) });
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
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">
            {initialData ? 'Editar vehículo' : 'Añadir vehículo'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Marca" error={errors.brand}>
              <input value={form.brand ?? ''} onChange={(e) => set('brand', e.target.value)}
                className={inputCls} placeholder="Ford" />
            </Field>
            <Field label="Modelo" error={errors.model}>
              <input value={form.model ?? ''} onChange={(e) => set('model', e.target.value)}
                className={inputCls} placeholder="Focus" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Año" error={errors.year}>
              <input type="number" value={form.year ?? ''} onChange={(e) => set('year', e.target.value)}
                className={inputCls} placeholder="2023" />
            </Field>
            <Field label="Kilómetros actuales" error={errors.current_km}>
              <input type="number" value={form.current_km ?? ''} onChange={(e) => set('current_km', e.target.value)}
                className={inputCls} placeholder="86289" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Matrícula">
              <input value={form.license_plate ?? ''} onChange={(e) => set('license_plate', e.target.value)}
                className={inputCls} placeholder="1234 ABC" />
            </Field>
            <Field label="Color">
              <input value={form.color ?? ''} onChange={(e) => set('color', e.target.value)}
                className={inputCls} placeholder="Gris" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Combustible">
              <select value={form.fuel_type ?? ''} onChange={(e) => set('fuel_type', e.target.value)} className={inputCls}>
                {FUEL_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Transmisión">
              <select value={form.transmission ?? ''} onChange={(e) => set('transmission', e.target.value)} className={inputCls}>
                {TRANSMISSION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="VIN (opcional)">
            <input value={form.vin ?? ''} onChange={(e) => set('vin', e.target.value)}
              className={inputCls} placeholder="1HGBH41JXMN109186" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2.5 text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors';

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);
