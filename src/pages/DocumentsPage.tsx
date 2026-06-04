import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Star } from 'lucide-react';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { documentsService } from '../services/documents.service';
import type { Document } from '../types';
import { formatDate } from '../utils/formatters';
import { calculateDocumentAlerts } from '../utils/calculations';
import toast from 'react-hot-toast';

export const DocumentsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!selectedVehicle) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    documentsService
      .getByVehicle(selectedVehicle.id)
      .then(setDocs)
      .finally(() => setLoading(false));
  }, [navigate, selectedVehicle]);

  // Una sola pasada por docs, memoizada. Reusa la función canónica de
  // calculations.ts en lugar de duplicar la lógica de expiración con
  // date-fns por cada doc en cada render.
  const expiryMap = useMemo(() => {
    const map = new Map<string, 'expired' | 'soon'>();
    if (!selectedVehicle) return map;
    for (const a of calculateDocumentAlerts(selectedVehicle.id, docs)) {
      if (a.type === 'document_expired') {
        map.set(a.id.replace('doc-expired-', ''), 'expired');
      } else if (a.type === 'document_expiring') {
        map.set(a.id.replace('doc-soon-', ''), 'soon');
      }
    }
    return map;
  }, [docs, selectedVehicle]);

  if (!selectedVehicle || !user) return null;

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    const snapshot = docs;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try {
      await documentsService.delete(id);
      toast.success('Documento eliminado');
    } catch {
      setDocs(snapshot);
      toast.error('No se pudo eliminar el documento');
    }
  };

  return (
    <div className="px-6 sm:px-10 py-10">
      <header className="flex items-end justify-between mb-10 gap-6 flex-wrap">
        <div>
          <span className="eyebrow">
            {selectedVehicle.brand} {selectedVehicle.model}
            {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 56px)',
              lineHeight: 1.07,
              letterSpacing: '-0.9px',
              margin: '12px 0 0',
            }}
          >
            Documentos.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            <span className="text-ink font-medium tabular-nums">{docs.length}</span> archivos
            guardados
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => setShowUpload(true)}
          iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}
        >
          Subir documento
        </Button>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos guardados"
          description="Sube tu seguro, ITV, ficha técnica o cualquier documento importante del vehículo. Te avisaremos antes de que venzan."
          action={
            <Button
              variant="accent"
              onClick={() => setShowUpload(true)}
              iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}
            >
              Subir primer documento
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {docs.map((doc, i) => {
            const state = expiryMap.get(doc.id);
            const expired = state === 'expired';
            const soon = state === 'soon';
            return (
              <li
                key={doc.id}
                className="stagger-item group bg-snow border border-silver-mist rounded-[14px] p-4 flex items-center gap-4 transition-colors hover:bg-fog"
                style={{ '--i': Math.min(i, 10) } as CSSProperties}
              >
                <div className="shrink-0 h-11 w-11 rounded-[10px] bg-fog flex items-center justify-center">
                  <FileText className="h-5 w-5 text-ink" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-text text-ink font-medium" style={{ fontSize: 15 }}>
                      {doc.doc_type}
                    </p>
                    {doc.is_important && (
                      <span
                        className="inline-flex items-center gap-1 font-mono uppercase"
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.12em',
                          color: '#b64400',
                        }}
                      >
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Importante
                      </span>
                    )}
                    {expired && (
                      <span
                        className="font-mono uppercase"
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.12em',
                          color: '#b64400',
                        }}
                      >
                        ● Vencido
                      </span>
                    )}
                    {soon && !expired && (
                      <span
                        className="font-mono uppercase"
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.12em',
                          color: '#c77700',
                        }}
                      >
                        ● Vence pronto
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-2 mt-1 text-graphite font-text"
                    style={{ fontSize: 13 }}
                  >
                    {doc.file_name && <span className="truncate">{doc.file_name}</span>}
                    {doc.expiry_date && (
                      <>
                        <span className="text-silver-mist">·</span>
                        <span>Vence {formatDate(doc.expiry_date)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-text text-graphite hover:text-ink transition-colors"
                    style={{ fontSize: 13 }}
                  >
                    Abrir
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="font-text text-graphite hover:text-caution transition-colors"
                    style={{ fontSize: 13 }}
                  >
                    Eliminar
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
