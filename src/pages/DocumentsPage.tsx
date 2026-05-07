import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { documentsService } from '../services/documents.service';
import type { Document } from '../types';
import { formatDate } from '../utils/formatters';
import { isBefore, parseISO, addDays } from 'date-fns';
import toast from 'react-hot-toast';

export const DocumentsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    setLoading(true);
    documentsService.getByVehicle(selectedVehicle.id)
      .then(setDocs)
      .finally(() => setLoading(false));
  }, [selectedVehicle?.id]);

  if (!selectedVehicle || !user) return null;

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await documentsService.delete(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success('Documento eliminado');
  };

  const isExpiringSoon = (expiry?: string) => {
    if (!expiry) return false;
    return isBefore(parseISO(expiry), addDays(new Date(), 30));
  };

  const isExpired = (expiry?: string) => {
    if (!expiry) return false;
    return isBefore(parseISO(expiry), new Date());
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documentos</h1>
          <p className="text-gray-400 text-sm mt-1">{docs.length} archivos</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Subir
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Sin documentos</p>
          <p className="text-sm mt-1">Sube tu seguro, ITV, o cualquier documento del coche</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const expired = isExpired(doc.expiry_date);
            const soon = !expired && isExpiringSoon(doc.expiry_date);
            return (
              <div key={doc.id} className={`bg-gray-800 rounded-xl p-4 flex items-center gap-4 border ${expired ? 'border-red-500/30' : soon ? 'border-yellow-500/30' : 'border-transparent'}`}>
                <div className={`rounded-lg p-2.5 shrink-0 ${expired ? 'bg-red-400/10' : 'bg-gray-700'}`}>
                  <FileText className={`h-5 w-5 ${expired ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{doc.doc_type}</p>
                    {doc.is_important && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Importante</span>}
                    {expired && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Vencido</span>}
                    {soon && !expired && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Vence pronto</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-gray-400 text-sm">
                    {doc.file_name && <span className="truncate">{doc.file_name}</span>}
                    {doc.expiry_date && <span>· Vence: {formatDate(doc.expiry_date)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button onClick={() => handleDelete(doc.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && (
        <DocumentUpload
          vehicleId={selectedVehicle.id}
          userId={user.id}
          onSuccess={() => documentsService.getByVehicle(selectedVehicle.id).then(setDocs)}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};
