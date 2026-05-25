import { useState } from 'react';
import { Sparkles, MapPin } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FloatingInput, FloatingTextarea } from '../ui/FloatingInput';
import { Button } from '../ui/Button';
import type { CreateDraftTripInput } from '../../types';

interface Props {
  onSubmit: (data: CreateDraftTripInput) => Promise<void>;
  onClose: () => void;
}

export const QuickPlanTripForm = ({ onSubmit, onClose }: Props) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateDraftTripInput>({ end_location: '' });

  const set = <K extends keyof CreateDraftTripInput>(k: K, v: CreateDraftTripInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Bocetar un viaje"
      description="Empieza con un destino. Los detalles vienen después."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatingInput
          label="¿A dónde te apetece ir?"
          value={form.end_location}
          onChange={(e) => set('end_location', e.target.value)}
          required
          iconLeft={<MapPin className="h-4 w-4" />}
        />
        <FloatingInput
          label="Nombre del viaje (opcional)"
          value={form.title ?? ''}
          onChange={(e) => set('title', e.target.value || undefined)}
        />
        <FloatingInput
          type="number"
          step="50"
          label="Presupuesto estimado (€)"
          value={form.estimated_budget ?? ''}
          onChange={(e) =>
            set('estimated_budget', e.target.value ? parseFloat(e.target.value) : undefined)
          }
        />
        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            type="date"
            label="Fecha aprox. inicio"
            value={form.start_date ?? ''}
            onChange={(e) => set('start_date', e.target.value || undefined)}
          />
          <FloatingInput
            type="date"
            label="Fecha aprox. fin"
            value={form.end_date ?? ''}
            onChange={(e) => set('end_date', e.target.value || undefined)}
          />
        </div>
        <FloatingTextarea
          label="Ideas sueltas, links, inspiración…"
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value || undefined)}
          rows={3}
        />

        <p className="text-graphite" style={{ fontSize: 12 }}>
          No te preocupes por las fechas exactas — todo es modificable mientras esté en
          planificación.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} iconLeft={<Sparkles className="h-4 w-4" />}>
            Empezar planificación
          </Button>
        </div>
      </form>
    </Modal>
  );
};
