import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapGL, { Source, Layer, Marker, NavigationControl } from 'react-map-gl/mapbox';
import type { LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Route } from 'lucide-react';
import { TripForm } from '../components/trips/TripForm';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { useTrips } from '../hooks/useTrips';
import { useVehicle } from '../hooks/useVehicle';
import { tripsService } from '../services/trips.service';
import { formatKm } from '../utils/formatters';
import type { CreateTripInput } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

/* ─── Tipos de distancia ────────────────────────────────────────────────────
   corto < 50 km · medio 50–200 km · largo > 200 km                         */
type TagKind = 'corto' | 'medio' | 'largo';

const tagOf = (km: number): TagKind => (km < 50 ? 'corto' : km <= 200 ? 'medio' : 'largo');

const TAG_STYLE: Record<TagKind, { fg: string; bg: string; bar: string }> = {
  corto: { fg: '#0066cc', bg: 'rgba(0,102,204,.10)', bar: '#a1a1a6' },
  medio: { fg: '#707070', bg: '#f5f5f7',             bar: '#1d1d1f' },
  largo: { fg: '#b64400', bg: 'rgba(182,68,0,.08)',  bar: '#b64400' },
};

type FilterKey = 'all' | TagKind;
const FILTER_LABEL: Record<FilterKey, string> = {
  all: 'Todos', corto: '< 50 km', medio: '50–200 km', largo: '> 200 km',
};

const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dotDate = (iso: string) => format(parseISO(iso), 'dd·MM·yy');

/* ─── Chip de tipo de distancia ─────────────────────────────────────────── */
const TripTag = ({ tag }: { tag: TagKind }) => {
  const s = TAG_STYLE[tag];
  return (
    <span style={{
      display: 'inline-block',
      border: `1px solid ${s.fg}22`,
      borderRadius: 999,
      padding: '3px 9px',
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      fontSize: 10,
      letterSpacing: '.12em',
      color: s.fg,
      background: s.bg,
      whiteSpace: 'nowrap',
    }}>
      {tag}
    </span>
  );
};

/* ─── View-model de una fila ─────────────────────────────────────────────── */
interface Row {
  trip: ReturnType<typeof useTrips>['trips'][number];
  km: number;
  minutes: number;
  fuelL: number;
  avgKmh: number;
  tag: TagKind;
}

/* ─── Capa de líneas Mapbox ──────────────────────────────────────────────── */
const ROUTE_LAYER = {
  id: 'routes',
  type: 'line',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': ['case',
      ['boolean', ['get', 'isLongest'], false], '#b64400',
      ['boolean', ['get', 'isSelected'], false], '#1d1d1f',
      '#c4c4cc',
    ],
    'line-width': ['case',
      ['boolean', ['get', 'isLongest'], false], 3.5,
      ['boolean', ['get', 'isSelected'], false], 2.5,
      1.5,
    ],
    'line-opacity': ['case',
      ['boolean', ['get', 'isLongest'], false], 1,
      ['boolean', ['get', 'isSelected'], false], 0.9,
      0.55,
    ],
  },
} as unknown as LayerProps;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export const TripsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user }            = useAuthStore();
  const navigate            = useNavigate();
  const { trips, loading, fetchTrips, createTrip, deleteTrip } = useTrips(selectedVehicle?.id);
  const { updateVehicle } = useVehicle();

  const [showForm, setShowForm]     = useState(false);
  const [filter, setFilter]         = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    fetchTrips();
  }, [selectedVehicle?.id]);

  /* ─── Datos agregados ───────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const list: Row[] = [...trips]
      .sort((a, b) => (a.start_datetime < b.start_datetime ? 1 : -1))
      .map((t) => {
        const km = t.total_km ?? 0;
        return { trip: t, km, minutes: t.driving_time_minutes ?? 0, fuelL: t.fuel_consumed ?? 0, avgKmh: t.avg_speed ?? 0, tag: tagOf(km) };
      });

    const totalKm   = list.reduce((s, r) => s + r.km, 0);
    const totalMin  = list.reduce((s, r) => s + r.minutes, 0);
    const totalFuel = list.reduce((s, r) => s + r.fuelL, 0);
    const longest   = list.reduce<Row | null>((m, r) => (!m || r.km > m.km ? r : m), null);
    const avgKmh      = totalMin > 0 ? totalKm / (totalMin / 60) : 0;
    const consumption = totalKm > 0 ? (totalFuel / totalKm) * 100 : 0;

    const byTag = (tag: TagKind) => {
      const sub = list.filter((r) => r.tag === tag);
      return { count: sub.length, sumKm: sub.reduce((s, r) => s + r.km, 0), pct: list.length ? Math.round((sub.length / list.length) * 100) : 0 };
    };

    return { list, totalKm, totalMin, totalFuel, longest, avgKmh, consumption,
      byDistance: { corto: byTag('corto'), medio: byTag('medio'), largo: byTag('largo') } };
  }, [trips]);

  /* ─── GeoJSON de rutas (solo viajes con coordenadas) ───────────────────── */
  const routesGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: stats.list
      .filter(r => r.trip.start_lat != null && r.trip.end_lat != null)
      .map(r => ({
        type: 'Feature' as const,
        properties: {
          tripId: r.trip.id,
          isLongest:  r.trip.id === stats.longest?.trip.id,
          isSelected: r.trip.id === selectedId,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [r.trip.start_lng!, r.trip.start_lat!],
            [r.trip.end_lng!,   r.trip.end_lat!],
          ],
        },
      })),
  }), [stats.list, stats.longest, selectedId]);

  /* Hub: origen más frecuente con coordenadas ────────────────────────────── */
  const hubCoords = useMemo(() => {
    const withCoords = stats.list.filter(r => r.trip.start_lat != null);
    if (!withCoords.length) return null;
    const counts = new Map<string, { count: number; lat: number; lng: number }>();
    withCoords.forEach(r => {
      const key = r.trip.start_location;
      const ex  = counts.get(key);
      if (ex) ex.count++;
      else counts.set(key, { count: 1, lat: r.trip.start_lat!, lng: r.trip.start_lng! });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count)[0];
  }, [stats.list]);

  /* Marcadores de destino con coordenadas ────────────────────────────────── */
  const destMarkers = useMemo(
    () => stats.list.filter(r => r.trip.end_lat != null && r.trip.end_lng != null),
    [stats.list],
  );

  /* Centro inicial del mapa ──────────────────────────────────────────────── */
  const mapInitial = useMemo(() => {
    if (hubCoords) return { longitude: hubCoords.lng, latitude: hubCoords.lat, zoom: 9 };
    return { longitude: -3.7, latitude: 40.4, zoom: 5 }; // España
  }, [hubCoords]);

  /* Origen más frecuente (label) ─────────────────────────────────────────── */
  const hubName = useMemo(() => {
    const counts: Record<string, number> = {};
    trips.forEach(t => { counts[t.start_location] = (counts[t.start_location] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Origen';
  }, [trips]);

  /* Selección por defecto → viaje más largo ─────────────────────────────── */
  useEffect(() => {
    if (!stats.longest) { setSelectedId(null); return; }
    setSelectedId(prev => prev && trips.some(t => t.id === prev) ? prev : stats.longest!.trip.id);
  }, [trips]);

  if (!selectedVehicle || !user) return null;

  const hasTrips  = trips.length > 0;
  const longest   = stats.longest;
  const maxKm     = longest?.km || 1;
  const hasCoords = routesGeoJSON.features.length > 0;

  const periodDate = hasTrips ? parseISO(stats.list[0].trip.start_datetime) : new Date();
  const period     = format(periodDate, 'MMMM yyyy', { locale: es }).toUpperCase();
  const monthLower = format(periodDate, 'MMMM', { locale: es });

  const visibleRows = filter === 'all' ? stats.list : stats.list.filter(r => r.tag === filter);
  const visKm   = visibleRows.reduce((s, r) => s + r.km, 0);
  const visMin  = visibleRows.reduce((s, r) => s + r.minutes, 0);
  const visFuel = visibleRows.reduce((s, r) => s + r.fuelL, 0);
  const visKmh  = visMin > 0 ? visKm / (visMin / 60) : 0;

  /* ─── Handlers ─────────────────────────────────────────────────────────── */
  const handleCreate = async (data: CreateTripInput) => {
    await createTrip(user.id, data);
    toast.success('Viaje registrado');
    if (data.end_km != null && data.end_km > selectedVehicle.current_km) {
      try {
        await updateVehicle(selectedVehicle.id, { current_km: data.end_km });
        toast.success(`Odómetro actualizado a ${formatKm(data.end_km)}`);
      } catch { toast.error('No se pudo actualizar el odómetro'); }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este viaje?')) return;
    await deleteTrip(id);
    if (selectedId === id) setSelectedId(null);
    toast.success('Viaje eliminado');
  };

  const handleExportCSV = () => {
    if (!hasTrips) return;
    tripsService.exportCSV(stats.list.map(r => r.trip));
    toast.success('CSV exportado');
  };

  /* ─── Loading ──────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="px-6 sm:px-10 py-10 space-y-4">
        <SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  const mistMono = {
    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
    letterSpacing: '.22em', color: '#a1a1a6', textTransform: 'uppercase' as const,
  };

  return (
    <>
      <div className="page-enter" style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ─── [1] Top strip ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center" style={{ gap: 14 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#1cb05c', boxShadow: '0 0 0 4px rgba(28,176,92,.18)', display: 'inline-block' }} />
            <span className="font-mono uppercase text-graphite" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.18em' }}>
              {selectedVehicle.brand} {selectedVehicle.model}
            </span>
            <span style={{ width: 1, height: 12, background: 'var(--color-silver-mist)' }} />
            <span className="font-mono uppercase text-ink" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.14em' }}>
              {selectedVehicle.license_plate ?? '—'}
            </span>
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <button onClick={handleExportCSV} disabled={!hasTrips}
              className="bg-snow text-ink transition-colors hover:bg-fog disabled:opacity-40"
              style={{ border: '1px solid var(--color-silver-mist)', borderRadius: 999, padding: '8px 14px', fontWeight: 500, fontSize: 12, cursor: hasTrips ? 'pointer' : 'not-allowed' }}>
              ↓ CSV
            </button>
            <button onClick={() => setShowForm(true)}
              className="transition-opacity hover:opacity-85"
              style={{ background: '#1d1d1f', color: '#fff', borderRadius: 999, border: 'none', padding: '9px 16px', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
              ＋ Nuevo viaje
            </button>
          </div>
        </div>

        {/* ─── [2] Editorial + Distribución ───────────────────────────── */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] items-end" style={{ gap: 48 }}>
          <div>
            <span className="font-mono uppercase block" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.22em', color: '#0066cc' }}>
              § Cuaderno de telemetría · {period}
            </span>
            <h1 className="text-ink" style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 'clamp(64px, 8vw, 104px)', lineHeight: 0.92, letterSpacing: '-2.6px', margin: '18px 0 12px' }}>
              Viajes.
            </h1>
            <p className="text-slate" style={{ fontSize: 20, fontWeight: 300, lineHeight: 1.35, maxWidth: 520, textWrap: 'pretty' }}>
              {hasTrips ? (
                <>
                  <span className="text-ink" style={{ fontWeight: 500 }}>{trips.length} {trips.length === 1 ? 'entrada' : 'entradas'}</span>{' '}·{' '}
                  <span className="text-ink" style={{ fontWeight: 500 }}>{nf0.format(stats.totalKm)} km</span>{' '}
                  recorridos en {monthLower}.
                  {longest && <> El viaje más largo a {longest.trip.end_location}.</>}
                </>
              ) : (
                <>Aún no has registrado ningún viaje. Empieza a documentar tus rutas, consumo y kilómetros.</>
              )}
            </p>
          </div>

          <div className="bg-snow" style={{ border: '1px solid var(--color-silver-mist)', borderRadius: 18, padding: '20px 24px', overflow: 'hidden' }}>
            <span style={mistMono}>§ Distribución por distancia</span>
            <div style={{ marginTop: 8 }}>
              {(['corto', 'medio', 'largo'] as TagKind[]).map((tag, i) => {
                const d = stats.byDistance[tag];
                return (
                  <div key={tag} className="grid items-center"
                    style={{ gridTemplateColumns: '86px 1fr 56px', gap: 14, padding: '10px 0', borderTop: `1px solid ${i === 0 ? '#1d1d1f' : 'var(--color-silver-mist)'}` }}>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <TripTag tag={tag} />
                      <span className="font-mono" style={{ fontSize: 11, color: '#707070' }}>{d.count}</span>
                    </div>
                    <div style={{ height: 8, background: '#f5f5f7', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${d.pct}%`, height: '100%', background: TAG_STYLE[tag].bar, borderRadius: 999 }} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="text-ink tabular-nums" style={{ fontWeight: 600, fontSize: 14 }}>{nf0.format(d.sumKm)}</span>
                      <span style={{ fontSize: 10, color: '#a1a1a6', marginLeft: 3 }}>km</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── [3] KPIs ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 14 }}>
          {[
            { label: 'Distancia total',  value: hasTrips ? nf0.format(stats.totalKm) : '–',                               unit: 'km' },
            { label: 'Viaje más largo',  value: hasTrips && longest ? nf0.format(longest.km) : '–',                       unit: hasTrips && longest ? `km · ${longest.trip.end_location}` : 'km' },
            { label: 'Velocidad media',  value: hasTrips && stats.totalMin > 0 ? nf0.format(stats.avgKmh) : '–',          unit: 'km/h' },
            { label: 'Consumo medio',    value: hasTrips && stats.consumption > 0 ? nf1.format(stats.consumption) : '–',  unit: 'L / 100 km' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-snow" style={{ border: '1px solid var(--color-silver-mist)', borderRadius: 18, padding: '18px 22px' }}>
              <span style={mistMono}>{kpi.label}</span>
              <p style={{ marginTop: 12 }}>
                <span className="text-ink tabular-nums" style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 44, letterSpacing: '-0.9px' }}>
                  {kpi.value}
                </span>
                <span style={{ fontSize: 13, color: '#707070', marginLeft: 6 }}>{kpi.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* ─── [4] Mapa Mapbox + Bitácora ──────────────────────────────── */}
        <div className="grid lg:grid-cols-[420px_1fr]" style={{ gap: 20 }}>

          {/* 4a · Mapa de rutas — Mapbox GL */}
          <div className="bg-snow" style={{ border: '1px solid var(--color-silver-mist)', borderRadius: 18, padding: '22px 26px', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between">
              <span style={mistMono}>§ Mapa de rutas</span>
              <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '.12em', color: '#c7c7cc' }}>
                {hasCoords ? `${routesGeoJSON.features.length} rutas` : 'Sin coordenadas'}
              </span>
            </div>

            {/* Contenedor del mapa */}
            <div style={{ height: 310, marginTop: 14, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
              {!MAPBOX_TOKEN ? (
                /* Sin token configurado */
                <div style={{ height: '100%', background: '#f5f5f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, textAlign: 'center' }}>
                  <Route size={32} strokeWidth={1.4} style={{ color: '#c7c7cc' }} />
                  <p className="font-mono" style={{ fontSize: 11, color: '#a1a1a6', letterSpacing: '.06em' }}>
                    Añade VITE_MAPBOX_TOKEN en .env.local
                  </p>
                  <a href="https://account.mapbox.com" target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, fontWeight: 500, color: '#0066cc', marginTop: 4 }}>
                    Obtener token gratuito →
                  </a>
                </div>
              ) : (
                <MapGL
                  mapboxAccessToken={MAPBOX_TOKEN}
                  initialViewState={mapInitial}
                  style={{ width: '100%', height: '100%' }}
                  mapStyle="mapbox://styles/mapbox/light-v11"
                  attributionControl={false}
                >
                  <NavigationControl position="top-right" showCompass={false} />

                  {/* Rutas como LineString GeoJSON */}
                  <Source id="routes" type="geojson" data={routesGeoJSON}>
                    <Layer {...ROUTE_LAYER} />
                  </Source>

                  {/* Hub — origen más frecuente */}
                  {hubCoords && (
                    <Marker longitude={hubCoords.lng} latitude={hubCoords.lat} anchor="center">
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1d1d1f', border: '2px solid #fff', boxShadow: '0 0 0 3px rgba(29,29,31,.25)' }} />
                    </Marker>
                  )}

                  {/* Marcadores de destino */}
                  {destMarkers.map(r => {
                    const isMax = r.trip.id === longest?.trip.id;
                    const isSel = r.trip.id === selectedId;
                    return (
                      <Marker
                        key={r.trip.id}
                        longitude={r.trip.end_lng!}
                        latitude={r.trip.end_lat!}
                        anchor="center"
                        onClick={() => setSelectedId(isSel ? null : r.trip.id)}
                      >
                        <div title={`${r.trip.end_location} · ${nf0.format(r.km)} km`}
                          style={{ width: isSel ? 14 : 10, height: isSel ? 14 : 10, borderRadius: '50%', background: isMax ? '#b64400' : '#707070', border: '2px solid #fff', boxShadow: isSel ? `0 0 0 3px ${isMax ? '#b64400' : '#1d1d1f'}` : 'none', cursor: 'pointer', transition: 'all .15s ease' }} />
                      </Marker>
                    );
                  })}

                  {/* Overlay cuando no hay coordenadas */}
                  {!hasCoords && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.75)', backdropFilter: 'blur(3px)' }}>
                      <p className="font-mono" style={{ fontSize: 11, color: '#a1a1a6', letterSpacing: '.06em', textAlign: 'center', padding: '0 20px' }}>
                        Registra viajes con coordenadas GPS<br />para ver las rutas en el mapa
                      </p>
                    </div>
                  )}
                </MapGL>
              )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-silver-mist)', paddingTop: 14 }}>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: '#707070' }}>
                {hasTrips ? (
                  <>
                    <span className="text-ink" style={{ fontWeight: 500 }}>{trips.length} {trips.length === 1 ? 'ruta' : 'rutas'}</span>{' '}desde {hubName}.
                    {longest && <> Destino más lejano <span className="text-ink" style={{ fontWeight: 500 }}>{longest.trip.end_location}</span> a{' '}<span className="text-ink" style={{ fontWeight: 500 }}>{nf0.format(longest.km)} km</span>.</>}
                  </>
                ) : 'Sin rutas registradas todavía.'}
              </p>
            </div>
          </div>

          {/* 4b · Tabla-bitácora */}
          <div className="bg-snow" style={{ border: '1px solid var(--color-silver-mist)', borderRadius: 18, padding: '22px 28px', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
              <span style={mistMono}>§ Entradas · ordenadas por fecha</span>
              <div className="flex items-center" style={{ gap: 6 }}>
                <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '.18em', color: '#a1a1a6', marginRight: 2 }}>Filtros</span>
                {(Object.keys(FILTER_LABEL) as FilterKey[]).map(f => (
                  <button key={f} onClick={() => setFilter(f)} className="transition-colors"
                    style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, border: `1px solid ${filter === f ? '#1d1d1f' : 'var(--color-silver-mist)'}`, background: filter === f ? '#1d1d1f' : '#fff', color: filter === f ? '#fff' : '#1d1d1f', cursor: 'pointer' }}>
                    {FILTER_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            {!hasTrips ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '56px 20px', gap: 6 }}>
                <Route size={36} strokeWidth={1.4} style={{ color: '#c7c7cc' }} />
                <p className="text-ink" style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>Sin viajes registrados</p>
                <p style={{ fontSize: 13, color: '#707070', maxWidth: 320, textWrap: 'pretty' }}>
                  Documenta tu primera ruta para empezar tu cuaderno de telemetría.
                </p>
                <button onClick={() => setShowForm(true)} className="transition-opacity hover:opacity-85"
                  style={{ marginTop: 12, background: '#1d1d1f', color: '#fff', borderRadius: 999, border: 'none', padding: '10px 18px', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                  ＋ Registrar primer viaje
                </button>
              </div>
            ) : (
              <>
                {/* Cabecera */}
                <div className="grid" style={{ gridTemplateColumns: '32px 1.4fr 1.3fr 56px 50px 60px', gap: 14, padding: '8px 0', marginTop: 14, borderBottom: '1px solid #1d1d1f' }}>
                  {['#', 'Ruta · fecha', 'Distancia', 'Min', 'L', 'Km/h'].map((h, i) => (
                    <span key={h} className="font-mono uppercase" style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.18em', color: '#a1a1a6', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>

                {visibleRows.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, color: '#707070' }}>Sin viajes en «{FILTER_LABEL[filter]}».</p>
                    <button onClick={() => setFilter('all')} style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#0066cc' }}>
                      Ver todos →
                    </button>
                  </div>
                ) : (
                  <div className="scrollbar-none" style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {visibleRows.map((r, i) => {
                      const isMax = longest?.trip.id === r.trip.id;
                      const isSel = selectedId === r.trip.id;
                      return (
                        <div key={r.trip.id} onClick={() => setSelectedId(isSel ? null : r.trip.id)}
                          className="group grid items-center"
                          style={{ gridTemplateColumns: '32px 1.4fr 1.3fr 56px 50px 60px', gap: 14, padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-silver-mist)', cursor: 'pointer', position: 'relative', background: isSel ? 'var(--color-fog)' : 'transparent' }}>
                          <span className="font-mono" style={{ fontSize: 13, fontWeight: 500, color: '#a1a1a6', letterSpacing: '.06em' }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="flex items-baseline flex-wrap" style={{ gap: 8 }}>
                              <span style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.2px', color: isMax ? '#b64400' : '#1d1d1f' }}>
                                {r.trip.start_location}
                                <span style={{ fontWeight: 300, color: '#a1a1a6', margin: '0 6px' }}>→</span>
                                {r.trip.end_location}
                              </span>
                              <TripTag tag={r.tag} />
                            </div>
                            <p className="font-mono" style={{ fontSize: 11, fontWeight: 500, color: '#a1a1a6', letterSpacing: '.06em', marginTop: 6 }}>
                              {dotDate(r.trip.start_datetime)}
                            </p>
                          </div>
                          <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
                            <div style={{ flex: 1, height: 8, background: '#f5f5f7', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${(r.km / maxKm) * 100}%`, height: '100%', background: isMax ? '#b64400' : '#1d1d1f', borderRadius: 999 }} />
                            </div>
                            <span className="tabular-nums" style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: isMax ? 17 : 15, letterSpacing: '-0.2px', color: isMax ? '#b64400' : '#1d1d1f', minWidth: 42, textAlign: 'right' }}>
                              {nf0.format(r.km)}
                            </span>
                            <span style={{ fontSize: 10, color: '#a1a1a6', marginLeft: 2 }}>km</span>
                          </div>
                          {[nf0.format(r.minutes), r.fuelL > 0 ? nf1.format(r.fuelL) : '—', r.avgKmh > 0 ? nf0.format(r.avgKmh) : '—'].map((val, j) => (
                            <span key={j} className="font-mono tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: '#707070', letterSpacing: '.04em', textAlign: 'right' }}>{val}</span>
                          ))}
                          <button onClick={e => { e.stopPropagation(); handleDelete(r.trip.id); }}
                            aria-label="Eliminar viaje"
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-[#a1a1a6] hover:text-[#b64400]"
                            style={{ position: 'absolute', top: 10, right: -6, width: 22, height: 22, borderRadius: 999, border: 'none', background: 'var(--color-snow)', cursor: 'pointer', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer totales */}
                {visibleRows.length > 0 && (
                  <div className="grid items-baseline"
                    style={{ gridTemplateColumns: '32px 1.4fr 1.3fr 56px 50px 60px', gap: 14, marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #1d1d1f' }}>
                    <span className="font-mono" style={{ fontSize: 10, color: '#a1a1a6', letterSpacing: '.14em' }}>Σ</span>
                    <span className="font-mono uppercase" style={{ fontSize: 12, color: '#707070', letterSpacing: '.06em' }}>
                      Total · {visibleRows.length} {visibleRows.length === 1 ? 'ruta' : 'rutas'}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <span className="tabular-nums" style={{ fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.2px' }}>{nf0.format(visKm)}</span>
                      <span style={{ fontSize: 10, color: '#a1a1a6', marginLeft: 2 }}>km</span>
                    </span>
                    {[nf0.format(visMin), visFuel > 0 ? nf1.format(visFuel) : '—', visMin > 0 ? nf0.format(visKmh) : '—'].map((val, j) => (
                      <span key={j} className="font-mono tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: '#707070', textAlign: 'right' }}>{val}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <TripForm currentKm={selectedVehicle.current_km} onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </>
  );
};
