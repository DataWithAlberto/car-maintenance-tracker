import { useEffect, useRef } from 'react';
import type { Mechanic } from '../../types';

let cssInjected = false;
const injectLeafletCSS = () => {
  if (cssInjected || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  cssInjected = true;
};

interface MechanicsMapProps {
  origin: { lat: number; lng: number } | null;
  mechanics: Mechanic[];
  recommendedIds?: string[];
  selectedId?: string;
  onMechanicClick?: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MechanicsMap = ({
  origin,
  mechanics,
  recommendedIds = [],
  selectedId,
  onMechanicClick,
  className = '',
  style,
}: MechanicsMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    injectLeafletCSS();
    let mounted = true;

    const initMap = async () => {
      const L = await import('leaflet');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!containerRef.current || !mounted) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, { zoomControl: true });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      if (origin) {
        const p: [number, number] = [origin.lat, origin.lng];
        bounds.push(p);
        const originIcon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#0071e3;border:3px solid white;box-shadow:0 0 0 2px #0071e3;"></div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker(p, { icon: originIcon }).addTo(map).bindPopup('<b>Tu ubicación</b>');
      }

      for (const m of mechanics) {
        const p: [number, number] = [m.lat, m.lng];
        bounds.push(p);
        const isRecommended = recommendedIds.includes(m.id);
        const isSelected = m.id === selectedId;
        const color = isRecommended ? '#b64400' : '#1d1d1f';
        const size = isSelected ? 16 : isRecommended ? 14 : 11;

        const icon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;${isSelected ? 'box-shadow:0 0 0 3px rgba(182,68,0,0.4);' : ''}"></div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker(p, { icon })
          .addTo(map)
          .bindPopup(
            `<b>${m.name}</b><br/>${m.distanceKm.toFixed(1)} km${m.brand ? `<br/>Especialista: ${m.brand}` : ''}`,
          );

        if (onMechanicClick) marker.on('click', () => onMechanicClick(m.id));
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else {
        map.setView([40.416775, -3.70379], 6);
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, mechanics, recommendedIds, selectedId]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-card overflow-hidden ${className}`}
      style={{ minHeight: 320, ...style }}
    />
  );
};
