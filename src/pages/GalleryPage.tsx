import { useEffect, useState } from 'react';
import { Image as ImageIcon, LayoutGrid, Map as MapIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { GalleryDropzone } from '../components/gallery/GalleryDropzone';
import { GalleryMasonry } from '../components/gallery/GalleryMasonry';
import { GalleryMap } from '../components/gallery/GalleryMap';
import { GalleryLightbox } from '../components/gallery/GalleryLightbox';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { galleryService, type GalleryImage } from '../services/gallery.service';

type View = 'grid' | 'map';

const VIEW_KEY = 'fh-gallery-view';

const readInitialView = (): View => {
  if (typeof window === 'undefined') return 'grid';
  const stored = window.localStorage.getItem(VIEW_KEY);
  return stored === 'map' ? 'map' : 'grid';
};

export const GalleryPage = () => {
  const { user } = useAuthStore();
  const { selectedVehicle } = useVehicleStore();

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<View>(readInitialView);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  useEffect(() => {
    window.localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    galleryService
      .list(user.id)
      .then((rows) => {
        if (!cancelled) setImages(rows);
      })
      .catch(() => toast.error('No se pudieron cargar las fotos'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) return null;

  const handleFiles = async (files: File[]) => {
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    const uploaded: GalleryImage[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        const row = await galleryService.upload(user.id, file, {
          vehicleId: selectedVehicle?.id ?? null,
        });
        uploaded.push(row);
        // Actualizar el estado tras CADA foto para feedback inmediato
        setImages((prev) => [row, ...prev]);
      } catch (err) {
        console.error('[gallery] upload failed', err);
        toast.error(`No se pudo subir ${file.name}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    if (uploaded.length) {
      toast.success(uploaded.length === 1 ? 'Foto subida' : `${uploaded.length} fotos subidas`);
    }
    setUploading(false);
    setProgress({ done: 0, total: 0 });
  };

  const handleDelete = async (img: GalleryImage) => {
    setDeletingId(img.id);
    const snapshot = images;
    setImages((prev) => prev.filter((x) => x.id !== img.id));
    try {
      await galleryService.remove(img);
      toast.success('Foto eliminada');
    } catch {
      setImages(snapshot);
      toast.error('No se pudo eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const geoCount = images.filter((i) => i.latitude != null && i.longitude != null).length;

  return (
    <div className="px-6 sm:px-10 py-10 page-enter">
      <header className="mb-8 sm:mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="eyebrow">Galería</span>
          <h1
            className="text-ink mt-2"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(32px, 5vw, 56px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Tus fotos
          </h1>
          <p className="text-graphite mt-3 max-w-xl" style={{ fontSize: 'var(--text-body)' }}>
            Sube imágenes de tu coche en máxima calidad. Las que tengan GPS aparecerán en el mapa.
          </p>
        </div>

        <div className="gallery-view-toggle" role="tablist" aria-label="Cambiar vista">
          <button
            type="button"
            role="tab"
            aria-pressed={view === 'grid'}
            className="gallery-view-toggle__btn focus-ring"
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="w-4 h-4" strokeWidth={1.8} />
            Cuadrícula
          </button>
          <button
            type="button"
            role="tab"
            aria-pressed={view === 'map'}
            className="gallery-view-toggle__btn focus-ring"
            onClick={() => setView('map')}
          >
            <MapIcon className="w-4 h-4" strokeWidth={1.8} />
            Mapa
            {geoCount > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 11,
                  padding: '1px 7px',
                  borderRadius: 999,
                  background: 'var(--color-azure)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {geoCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <section className="mb-8 sm:mb-10">
        <GalleryDropzone onFiles={handleFiles} uploading={uploading} />
        {uploading && progress.total > 0 && (
          <div className="mt-4">
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-silver-mist)' }}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full transition-[width] duration-300"
                style={{ width: `${progressPct}%`, background: 'var(--color-azure)' }}
              />
            </div>
            <p className="text-graphite mt-2" style={{ fontSize: 'var(--text-body-sm)' }}>
              {progress.done} de {progress.total} ({progressPct}%)
            </p>
          </div>
        )}
      </section>

      <section>
        {loading ? (
          <div className="gallery-masonry">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="gallery-masonry__item"
                style={{ aspectRatio: i % 2 ? '3 / 4' : '4 / 3' }}
              >
                <Skeleton className="w-full h-full rounded-[20px]" />
              </div>
            ))}
          </div>
        ) : images.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="Aún no hay fotos"
            description="Empieza subiendo una imagen desde el área de arriba."
          />
        ) : view === 'grid' ? (
          <GalleryMasonry
            images={images}
            onSelect={setLightbox}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ) : (
          <GalleryMap images={images} onSelect={setLightbox} />
        )}
      </section>

      <GalleryLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
};
