import { useState } from 'react';
import { maintenanceSchema, type MaintenanceInput } from '../../utils/validators';
import { MAINTENANCE_TYPES } from '../../utils/constants';
import { getNextServiceKm } from '../../utils/calculations';
import { X } from 'lucide-react';
import { format } from 'date-fns';

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Nuevo registro</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Tipo de mantenimiento" error={errors.type}>
            <select value={form.type ?? ''} onChange={(e) => handleTypeChange(e.target.value)} className={inputCls}>
              <option value="">Seleccionar...</option>
              {MAINTENANCE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha" error={errors.date}>
              <input type="date" value={form.date ?? ''} onChange={(e) => set('date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Kilómetros" error={errors.km_at_service}>
              <input type="number" value={form.km_at_service ?? ''} onChange={(e) => set('km_at_service', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Coste (€)">
              <input type="number" step="0.01" value={form.cost ?? ''} onChange={(e) => set('cost', e.target.value || undefined)} className={inputCls} placeholder="45.00" />
            </Field>
            <Field label="Próximo servicio (km)">
              <input type="number" value={form.next_service_km ?? ''} onChange={(e) => set('next_service_km', e.target.value || undefined)} className={inputCls} />
            </Field>
          </div>

          <Field label="Próximo servicio (fecha)">
            <input type="date" value={form.next_service_date ?? ''} onChange={(e) => set('next_service_date', e.target.value || undefined)} className={inputCls} />
          </Field>

          <Field label="Descripción">
            <textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="Notas adicionales..." />
          </Field>

          <Field label="Localización de piezas">
            <input value={form.parts_location ?? ''} onChange={(e) => set('parts_location', e.target.value)} className={inputCls} placeholder="Caja naranja en el maletero" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2.5 text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
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
