import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, ExternalLink, AlertTriangle, Star } from 'lucide-react';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { documentsService } from '../services/documents.service';
import type { Document } from '../types';
import { formatDate } from '../utils/formatters';
import { isBefore, parseISO, addDays } from 'date-fns';
import { cn } from '../utils/cn';
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

  const isExpiringSoon = (expiry?: string) => expiry ? isBefore(parseISO(expiry), addDays(new Date(), 30)) : false;
  const isExpired = (expiry?: string) => expiry ? isBefore(parseISO(expiry), new Date()) : false;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
      <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-1">
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Documentos</h1>
          <p className="text-gray-400 text-sm mt-1.5">
            <span className="font-semibold text-white tabular-nums">{docs.length}</span> archivos
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} iconLeft={<Plus className="h-4 w-4" />}>
          Subir documento
        </Button>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos guardados"
          description="Sube tu seguro, ITV, ficha técnica o cualquier documento importante del vehículo. Te avisaremos antes de que venzan."
          action={
            <Button onClick={() => setShowUpload(true)} iconLeft={<Plus className="h-4 w-4" />}>
              Subir primer documento
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => {
            const expired = isExpired(doc.expiry_date);
            const soon = !expired && isExpiringSoon(doc.expiry_date);
            return (
              <li
                key={doc.id}
                className={cn(
                  'group bg-surface border rounded-2xl p-4 flex items-center gap-4 transition-all hover:-translate-y-0.5',
                  expired
                    ? 'border-danger-500/40 hover:border-danger-500/60'
                    : soon
                    ? 'border-warn-500/40 hover:border-warn-500/60'
                    : 'border-border/60 hover:border-brand-400/40',
                )}
              >
                <div className={cn(
                  'shrink-0 h-11 w-11 rounded-xl flex items-center justify-center border',
                  expired
                    ? 'bg-danger-500/10 border-danger-500/30 text-danger-400'
                    : soon
                    ? 'bg-warn-500/10 border-warn-500/30 text-warn-400'
                    : 'bg-surface-2 border-border text-gray-400',
                )}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium tracking-tight">{doc.doc_type}</p>
                    {doc.is_important && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-accent-500/15 text-accent-400 border border-accent-500/30 px-1.5 py-0.5 rounded-full">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Importante
                      </span>
                    )}
                    {expired && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-danger-500/15 text-danger-400 border border-danger-500/30 px-1.5 py-0.5 rounded-full">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Vencido
                      </span>
                    )}
                    {soon && !expired && (
                      <span className="text-[10px] font-semibold bg-warn-500/15 text-warn-400 border border-warn-500/30 px-1.5 py-0.5 rounded-full">
                        Vence pronto
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    {doc.file_name && <span className="truncate">{doc.file_name}</span>}
                    {doc.expiry_date && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span>Vence {formatDate(doc.expiry_date)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-gray-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors"
                    aria-label="Abrir documento"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-lg text-gray-600 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
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
