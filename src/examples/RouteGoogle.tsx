/**
 * Ejemplo 3: Google Maps — @react-google-maps/api
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALAR ANTES:
 *   npm install @react-google-maps/api
 *
 * API key en: https://console.cloud.google.com/
 * Habilitar: Maps JavaScript API
 * Añadir en .env.local:
 *   VITE_GOOGLE_MAPS_KEY=AIzaSy...
 *
 * ⚠️  Requiere tarjeta de crédito vinculada, aunque hay $200/mes gratuitos.
 *
 * Uso:
 *   import { RouteGoogle } from '../examples/RouteGoogle';
 *   <RouteGoogle />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { GoogleMap, Polyline, OverlayView, useJsApiLoader } from '@react-google-maps/api';

// ── Coordenadas de la ruta A-66 Gijón → Oviedo ──────────────────────────────
// Formato Google Maps: { lat, lng }
const ROUTE: google.maps.LatLngLiteral[] = [
  { lat: 43.5453, lng: -5.6615 }, // Gijón centro
  { lat: 43.5211, lng: -5.6940 }, // Veriña
  { lat: 43.4782, lng: -5.7368 }, // Lugones / Siero
  { lat: 43.4455, lng: -5.7738 }, // Colloto
  { lat: 43.4156, lng: -5.8019 }, // Olloniego
  { lat: 43.3902, lng: -5.8187 }, // La Corredoria
  { lat: 43.3614, lng: -5.8492 }, // Oviedo centro
];

const ORIGIN      = ROUTE[0];
const DESTINATION = ROUTE[ROUTE.length - 1];
const CENTER      = { lat: 43.455, lng: -5.755 };

const DOT_STYLE: React.CSSProperties = {
  width: 14, height: 14, borderRadius: '50%',
  border: '2px solid #fff', transform: 'translate(-50%, -50%)',
};

export const RouteGoogle = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? '',
  });

  if (!isLoaded) {
    return (
      <div style={{
        width: '100%', height: 420, borderRadius: 18,
        background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#707070' }}>
          Cargando mapa…
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 420, borderRadius: 18, overflow: 'hidden' }}>
      <GoogleMap
        center={CENTER}
        zoom={11}
        mapContainerStyle={{ width: '100%', height: '100%' }}
        options={{
          // Estilo minimalista para no sobrecargar visualmente
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {/* Ruta */}
        <Polyline
          path={ROUTE}
          options={{
            strokeColor: '#1d1d1f',
            strokeWeight: 4,
            strokeOpacity: 0.9,
          }}
        />

        {/* Marcador origen — Gijón */}
        <OverlayView position={ORIGIN} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div style={{ ...DOT_STYLE, background: '#1d1d1f' }} title="Gijón · origen" />
        </OverlayView>

        {/* Marcador destino — Oviedo */}
        <OverlayView position={DESTINATION} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div style={{ ...DOT_STYLE, background: '#b64400' }} title="Oviedo · destino" />
        </OverlayView>
      </GoogleMap>
    </div>
  );
};
