import { Trash2, Loader2, MapPin } from 'lucide-react';
import type { GalleryImage } from '../../services/gallery.service';

interface Props {
  images: GalleryImage[];
  onSelect: (img: GalleryImage) => void;
  onDelete?: (img: GalleryImage) => void;
  deletingId?: string | null;
}

/* Masonry sin libs: CSS multi-column. break-inside: avoid evita cortes y
 * width:100%; height:auto preserva el aspect-ratio original de cada foto. */
export const GalleryMasonry = ({ images, onSelect, onDelete, deletingId }: Props) => {
  return (
    <div className="gallery-masonry">
      {images.map((img, i) => {
        const aspect =
          img.width && img.height && img.width > 0 && img.height > 0
            ? `${img.width} / ${img.height}`
            : undefined;
        return (
          <figure
            key={img.id}
            className="gallery-masonry__item stagger-item group"
            style={{ ['--i' as never]: i } as React.CSSProperties}
            onClick={() => onSelect(img)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(img);
              }
            }}
          >
            <div
              className="gallery-masonry__media"
              style={aspect ? { aspectRatio: aspect } : undefined}
            >
              <img
                src={img.public_url}
                alt={img.file_name ?? 'Foto del coche'}
                loading="lazy"
                decoding="async"
                className="gallery-masonry__img"
              />
            </div>

            {img.latitude != null && img.longitude != null && (
              <span
                className="gallery-masonry__badge"
                aria-label="Foto con ubicación"
                title="Foto con ubicación"
              >
                <MapPin className="w-3 h-3" strokeWidth={2.2} />
              </span>
            )}

            {onDelete && (
              <button
                type="button"
                aria-label="Eliminar foto"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('¿Eliminar esta foto?')) onDelete(img);
                }}
                disabled={deletingId === img.id}
                className="gallery-masonry__delete"
              >
                {deletingId === img.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </figure>
        );
      })}
    </div>
  );
};
