import { useRef, useState } from 'react';
import { Camera, Sparkles, Loader2, Check } from 'lucide-react';
import { expenseSchema, type ExpenseInput } from '../../utils/validators';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { format } from 'date-fns';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FloatingInput, FloatingTextarea, FloatingSelect } from '../ui/FloatingInput';
import { storageService } from '../../services/storage.service';
import { claudeService } from '../../services/claude.service';
import { useApiKeyStore } from '../../store/apiKeyStore';
import toast from 'react-hot-toast';

interface Props {
  vehicleId: string;
  initialData?: Partial<ExpenseInput>;
  onSubmit: (data: ExpenseInput) => Promise<void>;
  onClose: () => void;
}

const fileToBase64 = (file: File): Promise<{ base64: string; mediaType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(',')[1] ?? '', mediaType: file.type });
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });

export const ExpenseForm = ({ vehicleId, initialData, onSubmit, onClose }: Props) => {
  const isEdit = initialData != null;
  const { anthropicApiKey } = useApiKeyStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<ExpenseInput>>(
    initialData ?? {
      date: format(new Date(), 'yyyy-MM-dd'),
      category: '',
      amount: undefined,
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const set = (field: keyof ExpenseInput, value: string | number | undefined) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  };

  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanning(true);
    try {
      const path = `receipts/${vehicleId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const url = await storageService.upload(path, file);
      setForm((f) => ({ ...f, receipt_url: url }));

      if (anthropicApiKey) {
        const { base64, mediaType } = await fileToBase64(file);
        const scan = await claudeService.parseReceipt({ apiKey: anthropicApiKey, base64, mediaType });
        setForm((f) => ({
          ...f,
          amount: scan.amount ?? f.amount,
          date: scan.date ?? f.date,
          category: EXPENSE_CATEGORIES.includes(scan.category as (typeof EXPENSE_CATEGORIES)[number])
            ? scan.category : f.category,
          description: scan.description ?? f.description,
        }));
        toast.success('Ticket leído por IA');
      } else {
        toast.success('Ticket adjuntado');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo procesar el ticket');
    } finally {
      setScanning(false);
    }
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
        {/* Receipt scan */}
        <div className="rounded-[14px] border border-silver-mist bg-fog p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-[10px] bg-snow flex items-center justify-center shrink-0">
            {scanning
              ? <Loader2 className="h-5 w-5 text-azure animate-spin" strokeWidth={1.8} />
              : form.receipt_url
                ? <Check className="h-5 w-5" style={{ color: '#2f6b34' }} strokeWidth={2} />
                : <Camera className="h-5 w-5 text-graphite" strokeWidth={1.6} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-text text-ink font-medium" style={{ fontSize: 14 }}>
              {form.receipt_url ? 'Ticket adjuntado' : 'Foto del ticket'}
            </p>
            <p className="font-text text-graphite" style={{ fontSize: 12 }}>
              {anthropicApiKey
                ? 'La IA rellenará importe, fecha y categoría'
                : 'Configura la API key de Claude para lectura automática'}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            iconLeft={<Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} />}
          >
            {scanning ? 'Leyendo…' : 'Escanear'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceipt}
            className="hidden"
          />
        </div>

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
