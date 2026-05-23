import { useMemo, useState } from 'react';
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import type { GalleryImage } from '../../services/gallery.service';
import { useThemeStore } from '../../store/themeStore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Props {
  images: GalleryImage[];
  onSelect: (img: GalleryImage) => void;
}

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

export const GalleryMap = ({ images, onSelect }: Props) => {
  const theme = useThemeStore((s) => s.theme);
  const [hover, setHover] = useState<GalleryImage | null>(null);

  const geoImages = useMemo(
    () => images.filter((i) => i.latitude != null && i.longitude != null),
    [images],
  );

  const initialView = useMemo(() => {
    if (geoImages.length === 0) {
      return { longitude: -3.70379, latitude: 40.416775, zoom: 4 };
    }
    if (geoImages.length === 1) {
      return {
        longitude: geoImages[0].longitude!,
        latitude: geoImages[0].latitude!,
        zoom: 12,
      };
    }
    // Centro = media de coordenadas; el zoom se queda razonable
    let sumLat = 0;
    let sumLng = 0;
    for (const i of geoImages) {
      sumLat += i.latitude!;
      sumLng += i.longitude!;
    }
    return {
      longitude: sumLng / geoImages.length,
      latitude: sumLat / geoImages.length,
      zoom: 6,
    };
  }, [geoImages]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="w-full rounded-[28px] flex flex-col items-center justify-center gap-2 px-6 text-center"
        style={{ minHeight: 420, background: 'var(--surface-card)' }}
      >
        <MapPin size={28} strokeWidth={1.4} style={{ color: 'var(--color-mist)' }} />
        <p className="font-mono text-graphite" style={{ fontSize: 11, letterSpacing: '.06em' }}>
          Añade VITE_MAPBOX_TOKEN en .env.local
        </p>
        <a
          href="https://account.mapbox.com"
          target="_blank"
          rel="noreferrer"
          className="text-azure"
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          Obtener token gratuito →
        </a>
      </div>
    );
  }

  if (geoImages.length === 0) {
    return (
      <div
        className="w-full rounded-[28px] flex flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ minHeight: 420, background: 'var(--surface-card)' }}
      >
        <div
          className="w-14 h-14 rounded-[18px] flex items-center justify-center"
          style={{ background: 'var(--surface-canvas)' }}
        >
          <MapPin className="w-7 h-7 text-ink" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-ink" style={{ fontWeight: 600, fontSize: 22 }}>
          Aún no hay fotos con ubicación
        </h3>
        <p className="text-graphite max-w-md" style={{ fontSize: 15, lineHeight: 1.5 }}>
          Las imágenes con datos GPS en su EXIF aparecerán aquí. Las fotos del iPhone incluyen
          ubicación si lo tenías activado al disparar.
        </p>
      </div>
    );
  }

  const mapStyle =
    theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

  return (
    <div
      className="w-full rounded-[28px] overflow-hidden"
      style={{ minHeight: 520, height: '70vh', position: 'relative' }}
    >
      <MapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialView}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {geoImages.map((img) => (
          <Marker key={img.id} longitude={img.longitude!} latitude={img.latitude!} anchor="center">
            <button
              type="button"
              className="gallery-map-marker"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(img);
              }}
              onMouseEnter={() => setHover(img)}
              onMouseLeave={() => setHover(null)}
              aria-label={img.file_name ?? 'Foto en el mapa'}
            >
              <img src={img.public_url} alt="" loading="lazy" decoding="async" />
            </button>
          </Marker>
        ))}

        {hover && (
          <Popup
            longitude={hover.longitude!}
            latitude={hover.latitude!}
            anchor="bottom"
            offset={28}
            closeButton={false}
            closeOnClick={false}
            className="gallery-map-popup"
          >
            <div style={{ width: 180 }}>
              <img
                src={hover.public_url}
                alt=""
                style={{
                  width: '100%',
                  height: 120,
                  objectFit: 'cover',
                  borderRadius: 8,
                  display: 'block',
                }}
              />
              {fmtDate(hover.taken_at) && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: 'var(--color-graphite)',
                    fontFamily: 'var(--font-sf-pro-text)',
                  }}
                >
                  {fmtDate(hover.taken_at)}
                </div>
              )}
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
};
