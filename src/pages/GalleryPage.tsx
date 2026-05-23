import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { GalleryDropzone } from '../components/gallery/GalleryDropzone';
import { GalleryGrid } from '../components/gallery/GalleryGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { galleryService, type GalleryImage } from '../services/gallery.service';

export const GalleryPage = () => {
  const { user } = useAuthStore();
  const { selectedVehicle } = useVehicleStore();

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      } catch (err) {
        console.error('[gallery] upload failed', err);
        toast.error(`No se pudo subir ${file.name}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    if (uploaded.length) {
      setImages((prev) => [...uploaded, ...prev]);
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
  const progressLabel =
    progress.total > 0 ? `Subiendo ${progress.done + 1} de ${progress.total}…` : undefined;

  return (
    <div className="px-6 sm:px-10 py-10 page-enter">
      <header className="mb-8 sm:mb-10">
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
          Sube imágenes de tu coche y consérvalas siempre a mano. Se guardan de forma segura en tu
          cuenta.
        </p>
      </header>

      <section className="mb-8 sm:mb-10">
        <GalleryDropzone
          onFiles={handleFiles}
          uploading={uploading}
          progressLabel={progressLabel}
        />
        {uploading && progress.total > 0 && (
          <div className="mt-4">
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-silver-mist)' }}
              aria-label="Progreso de subida"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} className="aspect-square p-0" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="Aún no hay fotos"
            description="Empieza subiendo una imagen desde el área de arriba."
          />
        ) : (
          <GalleryGrid images={images} onDelete={handleDelete} deletingId={deletingId} />
        )}
      </section>
    </div>
  );
};
