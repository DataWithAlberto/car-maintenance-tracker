import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TripAlbum, TripActivity } from '../../types';
import { galleryService, type GalleryImage } from '../../services/gallery.service';
import { tripActivitiesService } from '../../services/tripActivities.service';
import { BOOKING_TYPE_LABEL, getBookingTheme } from '../../utils/bookingTheme';
import { Skeleton } from '../ui/Skeleton';
import { TripStatusBadge } from '../trips/TripStatusBadge';
import { GalleryLightbox } from './GalleryLightbox';

interface Props {
  album: TripAlbum;
  userId: string;
  vehicleId: string | null;
  onBack: () => void;
}

interface PhotoGroup {
  key: string;
  label: string;
  sublabel?: string;
  accent?: string;
  photos: GalleryImage[];
}

const groupPhotos = (photos: GalleryImage[], activities: TripActivity[]): PhotoGroup[] => {
  if (photos.length === 0) return [];
  const byActivity = new Map<string, GalleryImage[]>();
  const unbound: GalleryImage[] = [];

  for (const p of photos) {
    if (p.activity_id) {
      const list = byActivity.get(p.activity_id);
      if (list) list.push(p);
      else byActivity.set(p.activity_id, [p]);
    } else {
      unbound.push(p);
    }
  }

  const groups: PhotoGroup[] = [];
  for (const a of activities) {
    const list = byActivity.get(a.id);
    if (!list || list.length === 0) continue;
    const theme = getBookingTheme(a.provider);
    groups.push({
      key: a.id,
      label: a.title,
      sublabel: BOOKING_TYPE_LABEL[a.type],
      accent: theme.accent,
      photos: list,
    });
  }
  if (unbound.length > 0) {
    groups.push({
      key: '__loose',
      label: 'Otros recuerdos',
      sublabel: 'Sin actividad',
      photos: unbound,
    });
  }
  return groups;
};

export const AlbumDetailView = ({ album, userId, vehicleId, onBack }: Props) => {
  const { trip } = album;
  const [photos, setPhotos] = useState<GalleryImage[] | null>(null);
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setPhotos(null);
    Promise.all([
      galleryService.listByTrip(trip.id),
      tripActivitiesService.getByTrip(trip.id).catch(() => [] as TripActivity[]),
    ])
      .then(([ph, acts]) => {
        if (cancelled) return;
        setPhotos(ph);
        setActivities(acts);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setPhotos([]);
          toast.error(err.message ?? 'No se pudo cargar el álbum');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const groups = useMemo(
    () => (photos ? groupPhotos(photos, activities) : []),
    [photos, activities],
  );

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      try {
        const row = await galleryService.upload(userId, file, {
          vehicleId,
          tripId: trip.id,
        });
        setPhotos((prev) => (prev ? [...prev, row] : [row]));
      } catch (err) {
        console.error('[album] upload failed', err);
        toast.error(`No se pudo subir ${file.name}`);
      }
    }
    setUploading(false);
    toast.success(files.length === 1 ? 'Foto añadida' : `${files.length} fotos añadidas`);
  };

  const handleUpdate = (updated: GalleryImage) => {
    setPhotos((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null);
    setLightbox((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  return (
    <section className="page-enter" style={{ display: 'grid', gap: 28 }}>
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div style={{ display: 'grid', gap: 8 }}>
          <button
            type="button"
            onClick={onBack}
            className="text-graphite inline-flex items-center focus-ring"
            style={{
              gap: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} /> Volver a álbumes
          </button>
          <div className="flex items-center" style={{ gap: 10, flexWrap: 'wrap' }}>
            <h2
              className="text-ink"
              style={{
                fontFamily: 'Inter, var(--font-sf-pro-display)',
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 42px)',
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              {trip.title ?? trip.end_location ?? 'Álbum sin título'}
            </h2>
            <TripStatusBadge status={trip.status} />
          </div>
          {trip.end_location && (
            <span
              className="text-graphite inline-flex items-center"
              style={{ gap: 5, fontSize: 14 }}
            >
              <MapPin className="w-4 h-4" strokeWidth={1.6} />
              {trip.end_location}
            </span>
          )}
        </div>

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
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="focus-ring"
            style={{
              background: 'var(--color-azure, #0066cc)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer',
              opacity: uploading ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ImagePlus className="w-4 h-4" strokeWidth={2} />
            {uploading ? 'Subiendo…' : 'Añadir fotos al álbum'}
          </button>
        </div>
      </header>

      {photos === null ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '4 / 3' }}>
              <Skeleton className="rounded-2xl w-full h-full" />
            </div>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div
          className="text-graphite"
          style={{
            border: '1px dashed var(--color-silver-mist, #e5e5ea)',
            borderRadius: 20,
            padding: '48px 20px',
            textAlign: 'center',
            fontSize: 14,
          }}
        >
          Aún no hay fotos en este álbum. Usa «Añadir fotos al álbum» para subir las primeras.
        </div>
      ) : (
        groups.map((group) => <AlbumGroup key={group.key} group={group} onSelect={setLightbox} />)
      )}

      <GalleryLightbox image={lightbox} onClose={() => setLightbox(null)} onUpdate={handleUpdate} />
    </section>
  );
};

const AlbumGroup = ({
  group,
  onSelect,
}: {
  group: PhotoGroup;
  onSelect: (img: GalleryImage) => void;
}) => (
  <div style={{ display: 'grid', gap: 14 }}>
    <div className="flex items-center" style={{ gap: 10 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: group.accent ?? 'var(--color-graphite, #86868b)',
        }}
      />
      <h3
        className="text-ink"
        style={{
          fontFamily: 'Inter, var(--font-sf-pro-display)',
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: '-0.01em',
          margin: 0,
        }}
      >
        {group.label}
      </h3>
      {group.sublabel && (
        <span
          className="font-mono text-graphite uppercase"
          style={{ fontSize: 10, letterSpacing: '.16em' }}
        >
          {group.sublabel}
        </span>
      )}
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}
    >
      {group.photos.map((p) => (
        <button
          type="button"
          key={p.id}
          onClick={() => onSelect(p)}
          className="focus-ring"
          style={{
            border: 'none',
            background: 'var(--color-fog, #f5f5f7)',
            padding: 0,
            borderRadius: 14,
            overflow: 'hidden',
            cursor: 'pointer',
            aspectRatio: '4 / 3',
            position: 'relative',
          }}
        >
          <img
            src={p.public_url}
            alt={p.caption ?? p.file_name ?? 'Foto del álbum'}
            loading="lazy"
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform .35s ease',
            }}
            onLoad={(e) => (e.currentTarget.style.opacity = '1')}
          />
          {p.taken_at && (
            <span
              className="font-mono"
              style={{
                position: 'absolute',
                bottom: 6,
                left: 6,
                background: 'rgba(0,0,0,.55)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 10,
                letterSpacing: '.04em',
              }}
            >
              {format(parseISO(p.taken_at), "d MMM ''yy", { locale: es })}
            </span>
          )}
        </button>
      ))}
    </div>
  </div>
);
