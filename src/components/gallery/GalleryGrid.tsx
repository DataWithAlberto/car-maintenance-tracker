import { useEffect, useState } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import type { GalleryImage } from '../../services/gallery.service';

interface Props {
  images: GalleryImage[];
  onDelete?: (img: GalleryImage) => void;
  deletingId?: string | null;
}

export const GalleryGrid = ({ images, onDelete, deletingId }: Props) => {
  const [active, setActive] = useState<GalleryImage | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {images.map((img, i) => (
          <figure
            key={img.id}
            className="stagger-item group relative aspect-square overflow-hidden rounded-[20px] cursor-zoom-in"
            style={
              {
                background: 'var(--surface-canvas)',
                ['--i' as never]: i,
              } as React.CSSProperties
            }
            onClick={() => setActive(img)}
          >
            <img
              src={img.public_url}
              alt={img.file_name ?? 'Foto del coche'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {onDelete && (
              <button
                type="button"
                aria-label="Eliminar foto"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('¿Eliminar esta foto?')) onDelete(img);
                }}
                disabled={deletingId === img.id}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {deletingId === img.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </figure>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={(e) => {
              e.stopPropagation();
              setActive(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={active.public_url}
            alt={active.file_name ?? ''}
            className="max-h-full max-w-full rounded-[16px] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
