import { useEffect, useRef } from 'react';
import type { Trip } from '../../types';

// Leaflet CSS must be injected once
let cssInjected = false;
const injectLeafletCSS = () => {
  if (cssInjected || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  cssInjected = true;
};

interface TripMapProps {
  trips: Trip[];
  selectedTripId?: string;
  onTripClick?: (tripId: string) => void;
  className?: string;
  style?: React.CSSProperties;
  singleTrip?: boolean;
}

export const TripMap = ({ trips, selectedTripId, onTripClick, className = '', style, singleTrip = false }: TripMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    injectLeafletCSS();

    let L: typeof import('leaflet');
    let mounted = true;

    const initMap = async () => {
      L = await import('leaflet');

      // Fix default icon path issue with bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!containerRef.current || !mounted) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: !singleTrip });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      const startIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#81aed9;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const endIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#ff8562;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const waypointIcon = L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:#55a1ea;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.25)"></div>`,
        className: '',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      for (const trip of trips) {
        const isSelected = trip.id === selectedTripId;
        const color = isSelected ? '#ff8562' : '#81aed9';

        const pts: [number, number][] = [];

        if (trip.start_lat != null && trip.start_lng != null) {
          const p: [number, number] = [trip.start_lat, trip.start_lng];
          pts.push(p);
          bounds.push(p);
          L.marker(p, { icon: startIcon })
            .addTo(map)
            .bindPopup(`<b>${trip.start_location}</b><br/>Inicio`);
        }

        for (const wp of trip.waypoints ?? []) {
          const p: [number, number] = [wp.lat, wp.lng];
          pts.push(p);
          bounds.push(p);
          L.marker(p, { icon: waypointIcon })
            .addTo(map)
            .bindPopup(`<b>${wp.name ?? 'Punto de interés'}</b>${wp.description ? `<br/>${wp.description}` : ''}`);
        }

        if (trip.end_lat != null && trip.end_lng != null) {
          const p: [number, number] = [trip.end_lat, trip.end_lng];
          pts.push(p);
          bounds.push(p);
          L.marker(p, { icon: endIcon })
            .addTo(map)
            .bindPopup(`<b>${trip.end_location}</b><br/>Fin`);
        }

        if (pts.length >= 2) {
          const poly = L.polyline(pts, {
            color,
            weight: isSelected ? 4 : 2.5,
            opacity: isSelected ? 0.9 : 0.6,
          }).addTo(map);

          if (onTripClick) {
            poly.on('click', () => onTripClick(trip.id));
          }
        }
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
      } else {
        map.setView([40.416775, -3.703790], 6);
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
  // Rebuild map when trips list changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, selectedTripId]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-card overflow-hidden ${className}`}
      style={{ minHeight: 260, ...style }}
    />
  );
};
