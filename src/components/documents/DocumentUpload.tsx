import { useState, useRef } from 'react';
import { Upload, FileCheck2, Star } from 'lucide-react';
import { DOCUMENT_TYPES } from '../../utils/constants';
import { storageService } from '../../services/storage.service';
import { documentsService } from '../../services/documents.service';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FloatingInput, FloatingSelect } from '../ui/FloatingInput';
import { cn } from '../../utils/cn';

interface Props {
  vehicleId: string;
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const DocumentUpload = ({ vehicleId, userId, onSuccess, onClose }: Props) => {
  const [form, setForm] = useState({ doc_type: '', expiry_date: '', is_important: false });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !form.doc_type) {
      setError('Archivo y tipo son obligatorios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const path = `${vehicleId}/${Date.now()}-${file.name}`;
      const url = await storageService.upload(path, file);
      await documentsService.create(vehicleId, userId, {
        doc_type: form.doc_type,
        file_url: url,
        file_name: file.name,
        expiry_date: form.expiry_date || undefined,
        is_important: form.is_important,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const sizeKb = file ? Math.round(file.size / 1024) : 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Subir documento"
      description="ITV, seguro, ficha técnica o cualquier archivo"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>Cancelar</Button>
          <Button type="submit" form="upload-form" loading={loading} fullWidth disabled={!file || !form.doc_type}>
            {loading ? 'Subiendo...' : 'Subir documento'}
          </Button>
        </div>
      }
    >
      <form id="upload-form" onSubmit={handleSubmit} className="space-y-4">
        <FloatingSelect
          label="Tipo de documento"
          value={form.doc_type}
          onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
          options={[
            { value: '', label: 'Seleccionar...' },
            ...DOCUMENT_TYPES.map((t) => ({ value: t, label: t })),
          ]}
        />

        <div>
          <label
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all',
              file
                ? 'border-success-500/50 bg-success-500/5'
                : dragOver
                ? 'border-brand-400 bg-brand-500/10'
                : 'border-border hover:border-brand-400/50 hover:bg-brand-500/5',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.heic"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <FileCheck2 className="h-7 w-7 text-success-400 mb-1.5" />
                <span className="text-white text-sm font-medium truncate max-w-full px-4">{file.name}</span>
                <span className="text-gray-500 text-xs mt-0.5">{sizeKb} KB · click para cambiar</span>
              </>
            ) : (
              <>
                <Upload className="h-7 w-7 text-gray-400 mb-1.5" />
                <span className="text-white text-sm font-medium">Arrastra un archivo o haz clic</span>
                <span className="text-gray-500 text-xs mt-0.5">PDF, JPG, PNG, HEIC</span>
              </>
            )}
          </label>
        </div>

        <FloatingInput
          type="date"
          label="Fecha de vencimiento"
          value={form.expiry_date}
          onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
          hint="Opcional · te avisaremos antes de vencer"
        />

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-surface-2/40 border border-border/50 hover:border-accent-500/40 transition-colors">
          <input
            type="checkbox"
            checked={form.is_important}
            onChange={(e) => setForm({ ...form, is_important: e.target.checked })}
            className="h-4 w-4 rounded accent-accent-500"
          />
          <Star className={cn('h-4 w-4', form.is_important ? 'text-accent-400 fill-accent-400' : 'text-gray-500')} />
          <span className="text-sm text-gray-300 flex-1">Marcar como importante</span>
        </label>

        {error && (
          <p className="text-danger-400 text-sm bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">{error}</p>
        )}
      </form>
    </Modal>
  );
};
