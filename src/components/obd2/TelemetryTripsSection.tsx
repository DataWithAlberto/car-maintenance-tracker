import { useEffect, useState } from 'react';
import {
  Route,
  Gauge,
  Zap,
  Thermometer,
  Clock,
  MapPin,
  ChevronRight,
  Trash2,
  RefreshCw,
  CloudDownload,
  LineChart,
} from 'lucide-react';
import { telemetriaService } from '../../services/telemetria.service';
import { TelemetryRouteMap } from './TelemetryRouteMap';
import { TelemetryTripChart } from './TelemetryTripChart';
import type { TelemetriaPunto, ViajeTelemetria, ViajeTelemetriaStats } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  vehicleId: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtDuration = (seg: number) => {
  if (!seg) return '—';
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

const StatPill = ({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: typeof Gauge;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
}) => (
  <div className="bg-fog rounded-[16px] p-4">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="rounded-full" style={{ width: 5, height: 5, background: color }} />
      <span
        className="font-mono uppercase text-graphite truncate"
        style={{ fontSize: 9, letterSpacing: '0.1em' }}
      >
        {label}
      </span>
      <Icon className="h-3 w-3 text-graphite ml-auto shrink-0" strokeWidth={1.6} />
    </div>
    <p
      className="text-ink tabular-nums"
      style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-0.3px' }}
    >
      {value}
      {unit && (
        <span className="font-text text-graphite" style={{ fontSize: 11, marginLeft: 3 }}>
          {unit}
        </span>
      )}
    </p>
  </div>
);

/**
 * Sección de "Viajes registrados": lista los viajes ingeridos automáticamente
 * desde OBDLink (Dropbox → Supabase) y permite ver la ruta GPS en Mapbox con
 * sus estadísticas. Es la cara de lectura del pipeline serverless `api/webhook.py`.
 */
export const TelemetryTripsSection = ({ vehicleId }: Props) => {
  const [viajes, setViajes] = useState<ViajeTelemetria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [puntos, setPuntos] = useState<TelemetriaPunto[]>([]);
  const [stats, setStats] = useState<ViajeTelemetriaStats | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const data = await telemetriaService.getViajes(vehicleId);
      if (cancelled) return;
      setViajes(data);
      setLoading(false);
      // Auto-selecciona el viaje más reciente si no hay ninguno elegido
      setSelectedId((prev) => prev ?? (data.length > 0 ? data[0].id : null));
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, refreshKey]);

  useEffect(() => {
    const viaje = selectedId ? viajes.find((v) => v.id === selectedId) : null;
    let cancelled = false;
    const load = async () => {
      if (!viaje) {
        setPuntos([]);
        setStats(null);
        return;
      }
      setLoadingDetail(true);
      const pts = await telemetriaService.getPuntos(viaje.id);
      if (cancelled) return;
      setPuntos(pts);
      setStats(telemetriaService.computeStats(viaje, pts));
      setLoadingDetail(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedId, viajes]);

  const loadViajes = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (e: React.MouseEvent, viajeId: string) => {
    e.stopPropagation();
    if (!confirm('¿Borrar este viaje y todos sus puntos de telemetría?')) return;
    const ok = await telemetriaService.deleteViaje(viajeId);
    if (ok) {
      toast.success('Viaje eliminado');
      if (selectedId === viajeId) setSelectedId(null);
      setViajes((prev) => prev.filter((v) => v.id !== viajeId));
    } else {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Route className="h-4 w-4 text-graphite" strokeWidth={1.6} />
          <h2
            className="font-mono uppercase text-graphite"
            style={{ fontSize: 11, letterSpacing: '0.14em' }}
          >
            Viajes registrados
          </h2>
          <span className="font-text text-graphite text-xs">{viajes.length} total</span>
        </div>
        <button
          onClick={loadViajes}
          className="inline-flex items-center gap-1.5 font-text text-azure"
          style={{ fontSize: 13 }}
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.7} />
          Actualizar
        </button>
      </div>

      <p className="font-text text-graphite" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Cada viaje que OBDLink sube a Dropbox al apagar el coche se ingiere automáticamente con su
        ruta GPS y telemetría. No necesitas hacer nada.
      </p>

      {loading ? (
        <div className="bg-fog rounded-[18px] px-5 py-8 text-center">
          <p className="font-text text-graphite" style={{ fontSize: 14 }}>
            Cargando viajes…
          </p>
        </div>
      ) : viajes.length === 0 ? (
        <div className="bg-fog rounded-[18px] px-5 py-10 text-center">
          <CloudDownload className="h-8 w-8 mx-auto mb-3 text-graphite" strokeWidth={1.4} />
          <p className="font-display text-ink" style={{ fontWeight: 600, fontSize: 16 }}>
            Aún no hay viajes
          </p>
          <p
            className="font-text text-graphite mt-1.5 max-w-sm mx-auto"
            style={{ fontSize: 13, lineHeight: 1.5 }}
          >
            Cuando termines tu primer trayecto con OBDLink, aparecerá aquí automáticamente con su
            mapa y datos.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-5">
          {/* Lista de viajes */}
          <div className="space-y-2 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
            {viajes.map((v) => {
              const active = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className="w-full text-left rounded-[16px] px-4 py-3 transition-colors group"
                  style={{
                    background: active ? 'var(--color-ink)' : 'var(--color-fog)',
                    border: `1px solid ${active ? 'var(--color-ink)' : 'var(--color-silver-mist)'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={1.7}
                      style={{ color: active ? '#fff' : 'var(--color-graphite)' }}
                    />
                    <span
                      className="font-display truncate flex-1"
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: active ? '#fff' : 'var(--color-ink)',
                      }}
                    >
                      {v.nombre}
                    </span>
                    <span
                      onClick={(e) => handleDelete(e, v.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      role="button"
                      tabIndex={0}
                    >
                      <Trash2
                        className="h-3.5 w-3.5"
                        strokeWidth={1.6}
                        style={{ color: active ? '#fff' : 'var(--color-graphite)' }}
                      />
                    </span>
                    {!active && (
                      <ChevronRight
                        className="h-3.5 w-3.5 text-graphite shrink-0"
                        strokeWidth={1.7}
                      />
                    )}
                  </div>
                  <p
                    className="font-text mt-1"
                    style={{
                      fontSize: 11,
                      color: active ? 'rgba(255,255,255,.7)' : 'var(--color-graphite)',
                    }}
                  >
                    {fmtDate(v.fecha)}
                    {v.distancia_km ? ` · ${v.distancia_km} km` : ''}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detalle: mapa + stats */}
          <div className="space-y-4">
            {loadingDetail ? (
              <div className="bg-fog rounded-[18px] h-[360px] flex items-center justify-center">
                <p className="font-text text-graphite" style={{ fontSize: 13 }}>
                  Cargando ruta…
                </p>
              </div>
            ) : (
              <>
                <TelemetryRouteMap puntos={puntos} />
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatPill
                      icon={Route}
                      label="Distancia"
                      value={stats.distanciaKm}
                      unit="km"
                      color="#0a84ff"
                    />
                    <StatPill
                      icon={Clock}
                      label="Duración"
                      value={fmtDuration(stats.duracionSeg)}
                      color="#5e5ce6"
                    />
                    <StatPill
                      icon={Gauge}
                      label="Vel. máx"
                      value={stats.velocidadMax ?? '—'}
                      unit={stats.velocidadMax != null ? 'km/h' : ''}
                      color="#ff3b30"
                    />
                    <StatPill
                      icon={Gauge}
                      label="Vel. media"
                      value={stats.velocidadMedia ?? '—'}
                      unit={stats.velocidadMedia != null ? 'km/h' : ''}
                      color="#1a9e3f"
                    />
                    <StatPill
                      icon={Zap}
                      label="RPM máx"
                      value={stats.rpmMax != null ? stats.rpmMax.toLocaleString('es-ES') : '—'}
                      color="#ff9500"
                    />
                    <StatPill
                      icon={Thermometer}
                      label="Refrig. máx"
                      value={stats.tempRefrigeranteMax ?? '—'}
                      unit={stats.tempRefrigeranteMax != null ? '°C' : ''}
                      color="#c77700"
                    />
                    <StatPill
                      icon={MapPin}
                      label="Puntos GPS"
                      value={stats.puntos.toLocaleString('es-ES')}
                      color="#bf5af2"
                    />
                  </div>
                )}
                {puntos.length > 0 && (
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-3">
                      <LineChart className="h-3.5 w-3.5 text-graphite" strokeWidth={1.7} />
                      <span
                        className="font-mono uppercase text-graphite"
                        style={{ fontSize: 10, letterSpacing: '0.12em' }}
                      >
                        Histórico de parámetros
                      </span>
                    </div>
                    <TelemetryTripChart puntos={puntos} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
