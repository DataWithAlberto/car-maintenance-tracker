import { useMemo, useState } from 'react';
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, ImageOff } from 'lucide-react';
import toast from 'react-hot-toast';
import type { GalleryImage } from '../../services/gallery.service';
import { galleryService } from '../../services/gallery.service';
import { useThemeStore } from '../../store/themeStore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Props {
  images: GalleryImage[];
  onSelect: (img: GalleryImage) => void;
  onUpdate?: (img: GalleryImage) => void;
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

export const GalleryMap = ({ images, onSelect, onUpdate }: Props) => {
  const theme = useThemeStore((s) => s.theme);
  const [hover, setHover] = useState<GalleryImage | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const geoImages = useMemo(
    () => images.filter((i) => i.latitude != null && i.longitude != null),
    [images],
  );
  const noGeoImages = useMemo(
    () => images.filter((i) => i.latitude == null || i.longitude == null),
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

  const mapStyle =
    theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

  const persistCoords = async (
    img: GalleryImage,
    coords: { latitude: number; longitude: number },
  ) => {
    try {
      const updated = await galleryService.setLocation(img.id, coords);
      onUpdate?.(updated);
    } catch {
      toast.error('No se pudo guardar la ubicación');
    }
  };

  const assignClick = async (
    img: GalleryImage,
    coords: { latitude: number; longitude: number },
  ) => {
    setAssigningId(null);
    await persistCoords(img, coords);
    toast.success(`Ubicación asignada a ${img.file_name ?? 'la foto'}`);
  };

  return (
    <div className="space-y-4">
      {noGeoImages.length > 0 && (
        <div
          className="rounded-[20px] p-4 sm:p-5 flex items-start gap-3"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--color-silver-mist)',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--surface-canvas)' }}
          >
            <ImageOff className="w-4 h-4 text-graphite" strokeWidth={1.6} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ink" style={{ fontSize: 14, fontWeight: 500 }}>
              {noGeoImages.length}{' '}
              {noGeoImages.length === 1 ? 'foto sin ubicación' : 'fotos sin ubicación'}
            </p>
            <p className="text-graphite mt-0.5" style={{ fontSize: 13 }}>
              Selecciona una y haz clic en el mapa para asignársela, o arrastra un marcador
              existente para moverlo.
            </p>
            {assigningId && (
              <div
                className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(0,113,227,0.1)',
                  color: 'var(--color-azure)',
                  fontSize: 12,
                }}
              >
                <MapPin className="w-3.5 h-3.5" /> Haz clic en el mapa para fijar la ubicación
                <button
                  type="button"
                  onClick={() => setAssigningId(null)}
                  style={{ marginLeft: 'auto', color: 'var(--color-azure)', fontWeight: 500 }}
                >
                  Cancelar
                </button>
              </div>
            )}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {noGeoImages.slice(0, 12).map((img) => {
                const active = assigningId === img.id;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setAssigningId(active ? null : img.id)}
                    className="relative flex-shrink-0 rounded-[12px] overflow-hidden"
                    style={{
                      width: 56,
                      height: 56,
                      outline: active ? '2px solid var(--color-azure)' : 'none',
                      outlineOffset: 2,
                    }}
                    aria-label={`Asignar ubicación a ${img.file_name ?? 'foto'}`}
                  >
                    <img
                      src={img.public_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </button>
                );
              })}
              {noGeoImages.length > 12 && (
                <span
                  className="flex-shrink-0 flex items-center justify-center text-graphite"
                  style={{ width: 56, height: 56, fontSize: 12 }}
                >
                  +{noGeoImages.length - 12}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="w-full rounded-[28px] overflow-hidden"
        style={{
          minHeight: 520,
          height: '70vh',
          position: 'relative',
          cursor: assigningId ? 'crosshair' : 'default',
        }}
      >
        <MapGL
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={initialView}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          attributionControl={false}
          onClick={(e) => {
            if (!assigningId) return;
            const img = images.find((x) => x.id === assigningId);
            if (img) {
              assignClick(img, {
                latitude: e.lngLat.lat,
                longitude: e.lngLat.lng,
              });
            }
          }}
        >
          <NavigationControl position="top-right" showCompass={false} />

          {geoImages.map((img) => (
            <Marker
              key={img.id}
              longitude={img.longitude!}
              latitude={img.latitude!}
              anchor="center"
              draggable
              onDragEnd={(e) => {
                persistCoords(img, {
                  latitude: e.lngLat.lat,
                  longitude: e.lngLat.lng,
                });
              }}
            >
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
                {(hover.caption || fmtDate(hover.taken_at)) && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-sf-pro-text)',
                    }}
                  >
                    {hover.caption ?? fmtDate(hover.taken_at)}
                  </div>
                )}
              </div>
            </Popup>
          )}
        </MapGL>
      </div>
    </div>
  );
};
