import { useMemo, useState } from 'react';
import { Bed, Ticket, ExternalLink, Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FloatingInput, FloatingTextarea, FloatingSelect } from '../ui/FloatingInput';
import { Button } from '../ui/Button';
import {
  BOOKING_TYPE_LABEL,
  LODGING_PROVIDERS,
  ACTIVITY_PROVIDERS,
  getBookingTheme,
} from '../../utils/bookingTheme';
import type { CreateTripBookingInput, TripBookingType, TripBookingProvider } from '../../types';

interface TripBookingFormProps {
  onSubmit: (data: CreateTripBookingInput) => Promise<void>;
  onClose: () => void;
}

const TYPE_OPTIONS = (Object.keys(BOOKING_TYPE_LABEL) as TripBookingType[]).map((v) => ({
  value: v,
  label: BOOKING_TYPE_LABEL[v],
}));

const toLocalDatetimeString = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/* Convierte el string de un <input type="datetime-local"> (hora LOCAL, sin
 * zona, ej. "2026-06-15T20:30") al ISO UTC correcto. Sin esto, Postgres
 * interpreta el string como UTC y la hora se guarda desfasada. */
const localInputToISO = (s: string | undefined | null): string | undefined => {
  if (!s) return undefined;
  const d = new Date(s); // el constructor interpreta el string sin zona como hora local
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

export const TripBookingForm = ({ onSubmit, onClose }: TripBookingFormProps) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateTripBookingInput>({
    title: '',
    type: 'activity',
    provider: 'standard',
    start_datetime: toLocalDatetimeString(new Date()),
    metadata: {},
  });

  const set = <K extends keyof CreateTripBookingInput>(k: K, v: CreateTripBookingInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setMeta = (k: string, v: unknown) =>
    setForm((f) => ({ ...f, metadata: { ...(f.metadata ?? {}), [k]: v } }));

  const providerOptions = useMemo<TripBookingProvider[]>(() => {
    if (form.type === 'lodging') return LODGING_PROVIDERS;
    if (form.type === 'activity') return ACTIVITY_PROVIDERS;
    return ['standard'];
  }, [form.type]);

  const onTypeChange = (next: TripBookingType) => {
    const allowed: TripBookingProvider[] =
      next === 'lodging'
        ? LODGING_PROVIDERS
        : next === 'activity'
          ? ACTIVITY_PROVIDERS
          : ['standard'];
    setForm((f) => ({
      ...f,
      type: next,
      provider: allowed.includes(f.provider) ? f.provider : 'standard',
    }));
  };

  const previewTheme = getBookingTheme(form.provider);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Normaliza las fechas locales a ISO UTC para que la hora se guarde bien
      await onSubmit({
        ...form,
        start_datetime: localInputToISO(form.start_datetime) ?? form.start_datetime,
        end_datetime: localInputToISO(form.end_datetime),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const Icon = form.type === 'lodging' ? Bed : Ticket;

  return (
    <Modal
      open
      onClose={onClose}
      title="Añadir reserva al viaje"
      description="Alojamientos, museos, actividades, entradas…"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div
          className="flex items-center"
          style={{
            gap: 10,
            padding: '10px 14px',
            borderRadius: 12,
            background: previewTheme.accentSoft,
            border: `1px solid ${previewTheme.border}`,
            color: previewTheme.textPrimary,
            fontFamily: previewTheme.fontFamily,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: previewTheme.accent }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {BOOKING_TYPE_LABEL[form.type]} · {previewTheme.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FloatingSelect
            label="Tipo de entrada"
            value={form.type}
            onChange={(e) => onTypeChange(e.target.value as TripBookingType)}
            options={TYPE_OPTIONS}
          />

          {providerOptions.length > 1 && (
            <FloatingSelect
              label="Proveedor"
              value={form.provider}
              onChange={(e) => set('provider', e.target.value as TripBookingProvider)}
              options={providerOptions.map((p) => ({
                value: p,
                label: getBookingTheme(p).label,
              }))}
            />
          )}
        </div>

        <FloatingInput
          label="Título"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FloatingInput
            type="datetime-local"
            label={form.type === 'lodging' ? 'Check-in' : 'Inicio'}
            value={form.start_datetime}
            onChange={(e) => set('start_datetime', e.target.value)}
            required
          />
          <FloatingInput
            type="datetime-local"
            label={form.type === 'lodging' ? 'Check-out' : 'Fin (opcional)'}
            value={form.end_datetime ?? ''}
            onChange={(e) => set('end_datetime', e.target.value || undefined)}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <FloatingInput
              type="number"
              step="0.01"
              label="Precio"
              value={form.price ?? ''}
              onChange={(e) =>
                set('price', e.target.value ? parseFloat(e.target.value) : undefined)
              }
            />
          </div>
          <FloatingSelect
            label="Moneda"
            value={form.currency ?? 'EUR'}
            onChange={(e) => set('currency', e.target.value)}
            options={[
              { value: 'EUR', label: '€ EUR' },
              { value: 'USD', label: '$ USD' },
              { value: 'GBP', label: '£ GBP' },
            ]}
          />
        </div>

        {form.type === 'lodging' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FloatingInput
              label="Dirección"
              value={(form.metadata?.address as string) ?? ''}
              onChange={(e) => setMeta('address', e.target.value || undefined)}
            />
            <FloatingInput
              type="number"
              step="0.1"
              label={form.provider === 'airbnb' ? 'Puntuación (0–5)' : 'Puntuación (0–10)'}
              value={(form.metadata?.rating as number | undefined) ?? ''}
              onChange={(e) =>
                setMeta('rating', e.target.value ? parseFloat(e.target.value) : undefined)
              }
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FloatingInput
            label="URL de la reserva"
            value={form.booking_url ?? ''}
            onChange={(e) => set('booking_url', e.target.value || undefined)}
            iconLeft={<ExternalLink className="h-4 w-4" />}
          />
          <FloatingInput
            label="Código de confirmación"
            value={form.confirmation_code ?? ''}
            onChange={(e) => set('confirmation_code', e.target.value || undefined)}
          />
        </div>

        <FloatingTextarea
          label="Notas"
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value || undefined)}
          rows={3}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} iconLeft={<Save className="h-4 w-4" />}>
            Guardar reserva
          </Button>
        </div>
      </form>
    </Modal>
  );
};
