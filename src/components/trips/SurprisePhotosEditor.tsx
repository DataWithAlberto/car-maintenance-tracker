import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Loader2, Check, Pencil } from 'lucide-react';
import { galleryService, type GalleryImage } from '../../services/gallery.service';
import toast from 'react-hot-toast';

interface Props {
  tripId: string;
  userId: string;
  vehicleId?: string | null;
}

/* Gestiona el «Álbum de Recuerdos» que aparece en el reveal de la sorpresa:
 * subir fotos del destino, editar pies de foto y borrarlas. Las fotos se
 * vinculan al viaje (trip_id) y el reveal las lee de ahí. */
export const SurprisePhotosEditor = ({ tripId, userId, vehicleId = null }: Props) => {
  const [photos, setPhotos] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      const list = await galleryService.listByTrip(tripId);
      setPhotos(list);
    } catch {
      toast.error('No se pudieron cargar las fotos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of files) {
      try {
        await galleryService.upload(userId, file, { tripId, vehicleId });
        ok++;
      } catch {
        /* sigue con las demás */
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (ok > 0) {
      toast.success(`${ok} ${ok === 1 ? 'foto subida' : 'fotos subidas'}`);
      load();
    } else {
      toast.error('No se pudo subir ninguna foto');
    }
  };

  const saveCaption = async (id: string) => {
    try {
      await galleryService.updateCaption(id, captionDraft.trim() || null);
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, caption: captionDraft.trim() || null } : p)),
      );
      setEditingId(null);
      toast.success('Pie de foto guardado');
    } catch {
      toast.error('No se pudo guardar');
    }
  };

  const remove = async (img: GalleryImage) => {
    if (!confirm('¿Eliminar esta foto del álbum?')) return;
    try {
      await galleryService.remove(img);
      setPhotos((prev) => prev.filter((p) => p.id !== img.id));
      toast.success('Foto eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface-card, #fff)',
        border: '1px dashed var(--color-silver-mist, #e5e5ea)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 10 }}>
        <span
          className="font-mono uppercase text-graphite flex items-center"
          style={{ fontSize: 10, letterSpacing: '.18em', gap: 6 }}
        >
          <ImagePlus className="h-3 w-3" /> Álbum de fotos · opcional
        </span>
        <span className="font-mono text-graphite" style={{ fontSize: 10 }}>
          {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
        </span>
      </div>

      {loading ? (
        <div
          className="flex items-center text-graphite"
          style={{ gap: 8, fontSize: 12, padding: '8px 0' }}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…
        </div>
      ) : (
        <>
          {photos.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                gap: 8,
                marginBottom: 10,
              }}
            >
              {photos.map((p) => (
                <figure
                  key={p.id}
                  className="group"
                  style={{
                    position: 'relative',
                    margin: 0,
                    borderRadius: 8,
                    overflow: 'hidden',
                    aspectRatio: '1 / 1',
                    background: 'var(--color-fog, #f5f5f7)',
                  }}
                >
                  <img
                    src={p.public_url}
                    alt={p.caption ?? 'Foto del viaje'}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      display: 'flex',
                      gap: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(p.id);
                        setCaptionDraft(p.caption ?? '');
                      }}
                      aria-label="Editar pie"
                      style={iconBtn}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      aria-label="Eliminar foto"
                      style={iconBtn}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {p.caption && editingId !== p.id && (
                    <figcaption
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '12px 6px 4px',
                        fontSize: 9,
                        color: '#fff',
                        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.6))',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}

          {/* Editor de pie de foto inline */}
          {editingId && (
            <div className="flex items-center" style={{ gap: 6, marginBottom: 10 }}>
              <input
                autoFocus
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCaption(editingId)}
                placeholder="Pie de foto…"
                style={{
                  flex: 1,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--color-silver-mist)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 13,
                  color: 'var(--color-ink)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => saveCaption(editingId)}
                style={{
                  background: 'var(--color-ink)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <label
            className="transition-colors hover:bg-fog"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              color: 'var(--color-ink, #1d1d1f)',
              border: '1px solid var(--color-silver-mist, #e5e5ea)',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 500,
              cursor: uploading ? 'wait' : 'pointer',
            }}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading ? 'Subiendo…' : 'Añadir fotos'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              disabled={uploading}
              hidden
            />
          </label>
        </>
      )}

      <p className="text-graphite" style={{ fontSize: 10, marginTop: 8 }}>
        Estas fotos forman el «Álbum de Recuerdos» del reveal.
      </p>
    </div>
  );
};

const iconBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: 'none',
  background: 'rgba(0,0,0,.6)',
  color: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(4px)',
};
