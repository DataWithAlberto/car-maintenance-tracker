import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { GalleryImage } from '../../services/gallery.service';

interface Props {
  image: GalleryImage | null;
  onClose: () => void;
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

export const GalleryLightbox = ({ image, onClose }: Props) => {
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

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-4"
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
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
      >
        <X className="w-5 h-5" />
      </button>

      <img
        src={image.public_url}
        alt={image.file_name ?? ''}
        className="max-h-[88vh] max-w-full rounded-[16px] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {(taken || image.file_name) && (
        <div
          className="mt-4 px-4 py-2 rounded-full text-center"
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 13,
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {taken ?? image.file_name}
        </div>
      )}
    </div>
  );
};
