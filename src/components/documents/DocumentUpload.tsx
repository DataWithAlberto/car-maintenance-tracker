import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { DOCUMENT_TYPES } from '../../utils/constants';
import { storageService } from '../../services/storage.service';
import { documentsService } from '../../services/documents.service';

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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Subir documento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo de documento</label>
            <select
              value={form.doc_type}
              onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccionar...</option>
              {DOCUMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Archivo</label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Upload className="h-6 w-6 text-gray-500 mb-1" />
              <span className="text-gray-500 text-sm">{file ? file.name : 'PDF, JPG o PNG'}</span>
            </label>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Fecha de vencimiento</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputCls} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_important} onChange={(e) => setForm({ ...form, is_important: e.target.checked })} className="rounded" />
            <span className="text-sm text-gray-400">Documento importante</span>
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2.5 text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors';
