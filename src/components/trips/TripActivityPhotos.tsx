import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { galleryService, type GalleryImage } from '../../services/gallery.service';
import { GalleryLightbox } from '../gallery/GalleryLightbox';
import type { BookingTheme } from '../../utils/bookingTheme';

interface Props {
  tripId: string;
  activityId: string;
  userId: string;
  vehicleId: string | null;
  theme: BookingTheme;
  editable?: boolean;
}

/* Carrusel horizontal compacto con lazy-loading nativo + actualización
 * optimista al subir. Se monta dentro de TripActivityCard como sub-componente.
 * No carga nada si no hay actividad/usuario. */
export const TripActivityPhotos = ({
  tripId,
  activityId,
  userId,
  vehicleId,
  theme: t,
  editable = true,
}: Props) => {
  const [photos, setPhotos] = useState<GalleryImage[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setPhotos(null);
    galleryService
      .listByActivity(activityId)
      .then((rows) => {
        if (!cancelled) setPhotos(rows);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const uploaded: GalleryImage[] = [];
    for (const file of files) {
      try {
        const row = await galleryService.upload(userId, file, {
          vehicleId,
          tripId,
          activityId,
        });
        uploaded.push(row);
        setPhotos((prev) => (prev ? [...prev, row] : [row]));
      } catch (err) {
        console.error('[activity-photos] upload failed', err);
        toast.error(`No se pudo subir ${file.name}`);
      }
    }
    setUploading(false);
    if (uploaded.length) {
      toast.success(uploaded.length === 1 ? 'Foto añadida' : `${uploaded.length} fotos añadidas`);
    }
  };

  const handleUpdate = (updated: GalleryImage) => {
    setPhotos((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null);
    setLightbox((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const hasPhotos = (photos?.length ?? 0) > 0;

  if (!editable && !hasPhotos) return null;

  return (
    <div
      style={{
        borderTop: `1px solid ${t.border}`,
        paddingTop: 12,
        marginTop: 4,
        display: 'grid',
        gap: 10,
      }}
    >
      {hasPhotos && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            paddingBottom: 2,
            scrollbarWidth: 'none',
          }}
        >
          {photos!.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setLightbox(p)}
              className="focus-ring"
              style={{
                flex: '0 0 auto',
                width: 96,
                height: 72,
                borderRadius: 10,
                overflow: 'hidden',
                border: `1px solid ${t.border}`,
                padding: 0,
                background: 'var(--surface-card)',
                cursor: 'pointer',
                scrollSnapAlign: 'start',
              }}
            >
              <img
                src={p.public_url}
                alt={p.caption ?? 'Foto de la actividad'}
                loading="lazy"
                decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}

      {editable && (
        <div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*"
            hidden
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              if (list.length) handleFiles(list);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="focus-ring"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: `1px dashed ${t.accent}`,
              color: t.accent,
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer',
              opacity: uploading ? 0.6 : 1,
              fontFamily: t.fontFamily,
            }}
          >
            {uploading ? (
              <X className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.8} />
            )}
            {uploading ? 'Subiendo…' : 'Añadir foto'}
          </button>
        </div>
      )}

      <GalleryLightbox image={lightbox} onClose={() => setLightbox(null)} onUpdate={handleUpdate} />
    </div>
  );
};
