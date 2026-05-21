/**
 * Ejemplo 2: Mapbox GL JS — react-map-gl
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALAR ANTES:
 *   npm install react-map-gl mapbox-gl
 *   npm install --save-dev @types/mapbox-gl
 *
 * API key gratuita en: https://account.mapbox.com/
 * Añadir en .env.local:
 *   VITE_MAPBOX_TOKEN=pk.eyJ1Ijoixxxxxxx...
 *
 * Uso:
 *   import { RouteMapbox } from '../examples/RouteMapbox';
 *   <RouteMapbox />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Map, { Source, Layer, Marker } from 'react-map-gl';
import type { LineLayer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── Coordenadas de la ruta A-66 Gijón → Oviedo ──────────────────────────────
// Formato GeoJSON: [lng, lat]  ← ojo, orden inverso al de Leaflet
const COORDINATES: [number, number][] = [
  [-5.6615, 43.5453], // Gijón centro
  [-5.6940, 43.5211], // Veriña
  [-5.7368, 43.4782], // Lugones / Siero
  [-5.7738, 43.4455], // Colloto
  [-5.8019, 43.4156], // Olloniego
  [-5.8187, 43.3902], // La Corredoria
  [-5.8492, 43.3614], // Oviedo centro
];

// GeoJSON LineString para la ruta
const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: COORDINATES },
  properties: {},
};

// Estilo de la línea
const lineLayer: LineLayer = {
  id: 'route',
  type: 'line',
  paint: {
    'line-color': '#1d1d1f',
    'line-width': 4,
    'line-opacity': 0.9,
  },
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
};

export const RouteMapbox = () => (
  <div style={{ width: '100%', height: 420, borderRadius: 18, overflow: 'hidden' }}>
    <Map
      initialViewState={{ longitude: -5.755, latitude: 43.455, zoom: 10.5 }}
      style={{ width: '100%', height: '100%' }}
      // Estilo minimalista claro de Mapbox — más opciones en studio.mapbox.com
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
    >
      {/* Ruta como LineString GeoJSON */}
      <Source id="route" type="geojson" data={routeGeoJSON}>
        <Layer {...lineLayer} />
      </Source>

      {/* Marcador origen — Gijón */}
      <Marker longitude={-5.6615} latitude={43.5453} anchor="center">
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#1d1d1f', border: '2px solid #fff',
          boxShadow: '0 0 0 2px #1d1d1f',
        }} title="Gijón · origen" />
      </Marker>

      {/* Marcador destino — Oviedo */}
      <Marker longitude={-5.8492} latitude={43.3614} anchor="center">
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#b64400', border: '2px solid #fff',
          boxShadow: '0 0 0 2px #b64400',
        }} title="Oviedo · destino" />
      </Marker>
    </Map>
  </div>
);
