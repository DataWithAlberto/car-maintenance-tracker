/**
 * Ejemplo 1: Leaflet + react-leaflet
 * ─────────────────────────────────────────────────────────────────────────────
 * YA INSTALADO — no necesita npm install adicional.
 * Paquetes: react-leaflet  leaflet  @types/leaflet
 *
 * Uso en cualquier página:
 *   import { RouteLeaflet } from '../examples/RouteLeaflet';
 *   <RouteLeaflet />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix necesario en Vite para los iconos por defecto de Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// ── Coordenadas de la ruta A-66 Gijón → Oviedo ──────────────────────────────
// Formato Leaflet: [lat, lng]
const ROUTE: [number, number][] = [
  [43.5453, -5.6615], // Gijón centro
  [43.5211, -5.6940], // Veriña
  [43.4782, -5.7368], // Lugones / Siero
  [43.4455, -5.7738], // Colloto
  [43.4156, -5.8019], // Olloniego
  [43.3902, -5.8187], // La Corredoria
  [43.3614, -5.8492], // Oviedo centro
];

const ORIGIN      = ROUTE[0];
const DESTINATION = ROUTE[ROUTE.length - 1];
const CENTER: [number, number] = [43.455, -5.755]; // punto medio

export const RouteLeaflet = () => (
  <div style={{ width: '100%', height: 420, borderRadius: 18, overflow: 'hidden' }}>
    <MapContainer
      center={CENTER}
      zoom={11}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      {/* Tiles OpenStreetMap — gratuito, sin API key */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Ruta */}
      <Polyline
        positions={ROUTE}
        pathOptions={{ color: '#1d1d1f', weight: 4, opacity: 0.9 }}
      />

      {/* Origen — Gijón */}
      <CircleMarker
        center={ORIGIN}
        radius={8}
        pathOptions={{ color: '#fff', fillColor: '#1d1d1f', fillOpacity: 1, weight: 2 }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]}>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>Gijón · origen</span>
        </Tooltip>
      </CircleMarker>

      {/* Destino — Oviedo */}
      <CircleMarker
        center={DESTINATION}
        radius={8}
        pathOptions={{ color: '#fff', fillColor: '#b64400', fillOpacity: 1, weight: 2 }}
      >
        <Tooltip permanent direction="bottom" offset={[0, 10]}>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>Oviedo · destino</span>
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  </div>
);
