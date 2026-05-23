import { useEffect, useState } from 'react';
import { X, Calendar, MapPin, Ruler, HardDrive, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import type { GalleryImage } from '../../services/gallery.service';
import { galleryService } from '../../services/gallery.service';

interface Props {
  image: GalleryImage | null;
  onClose: () => void;
  onUpdate?: (img: GalleryImage) => void;
}

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('es-ES', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
};

const fmtSize = (b: number | null) => {
  if (!b) return null;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const fmtCoord = (n: number) => n.toFixed(5);

export const GalleryLightbox = ({ image, onClose, onUpdate }: Props) => {
  const [caption, setCaption] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setCaption(image?.caption ?? '');
    setDirty(false);
  }, [image?.id]);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [image, onClose]);

  if (!image) return null;

  const taken = fmtDate(image.taken_at);
  const dims = image.width && image.height ? `${image.width} × ${image.height} px` : null;
  const size = fmtSize(image.size_bytes);
  const hasGps = image.latitude != null && image.longitude != null;

  const saveCaption = async () => {
    if (!dirty) return;
    setSavingCaption(true);
    try {
      const updated = await galleryService.updateCaption(image.id, caption);
      onUpdate?.(updated);
      setDirty(false);
      toast.success('Pie guardado');
    } catch (err) {
      console.error('[gallery] updateCaption failed', err);
      const msg = err instanceof Error && err.message ? err.message : 'No se pudo guardar el pie';
      toast.error(msg);
    } finally {
      setSavingCaption(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-stretch justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="lightbox-shell" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-media">
          <img
            src={image.public_url}
            alt={image.caption ?? image.file_name ?? ''}
            className="lightbox-img"
          />
        </div>

        <aside className="lightbox-info">
          <div>
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '.14em',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              Pie de foto
            </span>
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setDirty(true);
              }}
              onBlur={saveCaption}
              placeholder="Añade una nota o descripción…"
              rows={3}
              className="lightbox-caption"
            />
            <div className="flex items-center justify-end mt-2">
              {dirty && !savingCaption && (
                <button type="button" onClick={saveCaption} className="lightbox-save-btn">
                  <Check className="w-3.5 h-3.5" /> Guardar
                </button>
              )}
              {savingCaption && (
                <span
                  className="inline-flex items-center gap-2"
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…
                </span>
              )}
            </div>
          </div>

          <div className="lightbox-meta">
            {taken && (
              <div className="lightbox-meta-row">
                <Calendar className="w-4 h-4" strokeWidth={1.6} />
                <div>
                  <span className="lightbox-meta-label">Capturada</span>
                  <span className="lightbox-meta-value">{taken}</span>
                </div>
              </div>
            )}

            <div className="lightbox-meta-row">
              <MapPin className="w-4 h-4" strokeWidth={1.6} />
              <div>
                <span className="lightbox-meta-label">Ubicación</span>
                {hasGps ? (
                  <span className="lightbox-meta-value">
                    {fmtCoord(image.latitude!)}, {fmtCoord(image.longitude!)}
                  </span>
                ) : (
                  <span className="lightbox-meta-value" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Sin GPS · arrastra el marcador en el mapa para asignar
                  </span>
                )}
              </div>
            </div>

            {dims && (
              <div className="lightbox-meta-row">
                <Ruler className="w-4 h-4" strokeWidth={1.6} />
                <div>
                  <span className="lightbox-meta-label">Dimensiones</span>
                  <span className="lightbox-meta-value">{dims}</span>
                </div>
              </div>
            )}

            {size && (
              <div className="lightbox-meta-row">
                <HardDrive className="w-4 h-4" strokeWidth={1.6} />
                <div>
                  <span className="lightbox-meta-label">Tamaño</span>
                  <span className="lightbox-meta-value">{size}</span>
                </div>
              </div>
            )}

            {image.file_name && (
              <div
                className="lightbox-meta-row"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}
              >
                <div style={{ width: 16 }} />
                <div>
                  <span className="lightbox-meta-label">Archivo</span>
                  <span
                    className="lightbox-meta-value"
                    style={{ wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                  >
                    {image.file_name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
