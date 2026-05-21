/**
 * Ejemplo 4: MapLibre GL JS — react-map-gl + maplibre-gl
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALAR ANTES:
 *   npm install maplibre-gl react-map-gl
 *
 * Tiles gratuitos con Maptiler (100k tiles/mes sin tarjeta):
 *   https://cloud.maptiler.com/account/keys/
 * Añadir en .env.local:
 *   VITE_MAPTILER_KEY=xxxxxxxxxxxxxxxxxxxxxxx
 *
 * SIN API KEY: usar tiles de OpenFreeMap (completamente gratis, sin registro).
 * Cambiar mapStyle por: "https://tiles.openfreemap.org/styles/liberty"
 *
 * Uso:
 *   import { RouteMapLibre } from '../examples/RouteMapLibre';
 *   <RouteMapLibre />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { LineLayer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// ── Coordenadas de la ruta A-66 Gijón → Oviedo ──────────────────────────────
// Formato GeoJSON: [lng, lat]  ← igual que Mapbox, inverso a Leaflet
const COORDINATES: [number, number][] = [
  [-5.6615, 43.5453], // Gijón centro
  [-5.6940, 43.5211], // Veriña
  [-5.7368, 43.4782], // Lugones / Siero
  [-5.7738, 43.4455], // Colloto
  [-5.8019, 43.4156], // Olloniego
  [-5.8187, 43.3902], // La Corredoria
  [-5.8492, 43.3614], // Oviedo centro
];

const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: COORDINATES },
  properties: {},
};

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

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? '';

export const RouteMapLibre = () => (
  <div style={{ width: '100%', height: 420, borderRadius: 18, overflow: 'hidden' }}>
    <Map
      initialViewState={{ longitude: -5.755, latitude: 43.455, zoom: 10.5 }}
      style={{ width: '100%', height: '100%' }}
      // Opción A — Maptiler (requiere VITE_MAPTILER_KEY)
      mapStyle={`https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`}
      // Opción B — OpenFreeMap (sin API key, descomentar y comentar la línea anterior)
      // mapStyle="https://tiles.openfreemap.org/styles/liberty"
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
          boxShadow: '0 0 0 2px #1d1d1f', cursor: 'default',
        }} title="Gijón · origen" />
      </Marker>

      {/* Marcador destino — Oviedo */}
      <Marker longitude={-5.8492} latitude={43.3614} anchor="center">
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#b64400', border: '2px solid #fff',
          boxShadow: '0 0 0 2px #b64400', cursor: 'default',
        }} title="Oviedo · destino" />
      </Marker>
    </Map>
  </div>
);
