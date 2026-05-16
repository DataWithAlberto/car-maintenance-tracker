import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Route, Filter, X, Gauge, Clock, Fuel, Search,
} from 'lucide-react';
import { TripForm } from '../components/trips/TripForm';
import { TripCard } from '../components/trips/TripCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useAuthStore } from '../store/authStore';
import { useTrips } from '../hooks/useTrips';
import { tripsService } from '../services/trips.service';
import { formatKm } from '../utils/formatters';
import { cn } from '../utils/cn';
import type { CreateTripInput, Trip } from '../types';
import toast from 'react-hot-toast';

const TripMap = lazy(() =>
  import('../components/trips/TripMap').then((m) => ({ default: m.TripMap })),
);

type ViewMode = 'list' | 'map';
type FilterType = 'all' | 'short' | 'medium' | 'long';

const filterLabel: Record<FilterType, string> = {
  all:    'Todos',
  short:  '< 50 km',
  medium: '50–200 km',
  long:   '> 200 km',
};

export const TripsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { user }            = useAuthStore();
  const navigate            = useNavigate();
  const { trips, loading, fetchTrips, createTrip, deleteTrip } = useTrips(selectedVehicle?.id);

  const [showForm, setShowForm]     = useState(false);
  const [view, setView]             = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterKm, setFilterKm]     = useState<FilterType>('all');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    fetchTrips();
  }, [selectedVehicle?.id]);

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = trips;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.start_location.toLowerCase().includes(q) ||
          t.end_location.toLowerCase().includes(q) ||
          (t.title ?? '').toLowerCase().includes(q) ||
          (t.notes ?? '').toLowerCase().includes(q),
      );
    }
    if (filterKm !== 'all') {
      list = list.filter((t) => {
        const km = t.total_km ?? 0;
        if (filterKm === 'short')  return km < 50;
        if (filterKm === 'medium') return km >= 50 && km <= 200;
        if (filterKm === 'long')   return km > 200;
        return true;
      });
    }
    return list;
  }, [trips, search, filterKm]);

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalKm:   trips.reduce((s, t) => s + (t.total_km ?? 0), 0),
    totalTime: trips.reduce((s, t) => s + (t.driving_time_minutes ?? 0), 0),
    totalFuel: trips.reduce((s, t) => s + (t.fuel_consumed ?? 0), 0),
  }), [trips]);

  if (!selectedVehicle || !user) return null;

  const handleCreate = async (data: CreateTripInput) => {
    await createTrip(user.id, data);
    toast.success('Viaje registrado');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este viaje?')) return;
    await deleteTrip(id);
    if (selectedId === id) setSelectedId(null);
    toast.success('Viaje eliminado');
  };

  const handleShare = (trip: Trip) => {
    const link = `${window.location.origin}/trips/${trip.id}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Link copiado'));
  };

  const handleExportCSV = () => {
    tripsService.exportCSV(filtered);
    toast.success('CSV exportado');
  };

  const selectedTrip = trips.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="px-6 sm:px-10 py-10">
      {/* Header */}
      <header className="flex items-end justify-between mb-10 gap-6 flex-wrap">
        <div>
          <span className="eyebrow">
            {selectedVehicle.brand} {selectedVehicle.model}
            {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
          </span>
          <h1
            className="text-ink"
            style={{
              fontFamily: 'Inter, var(--font-sf-pro-display)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 6vw, 56px)',
              lineHeight: 1.07,
              letterSpacing: '-0.9px',
              margin: '12px 0 0',
            }}
          >
            Viajes.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            <span className="text-ink font-medium tabular-nums">{trips.length}</span> rutas registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-silver-mist/60 rounded-full p-1 gap-0.5 select-none">
            {([['list', 'Lista'], ['map', 'Mapa']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'focus-ring px-4 h-8 rounded-full font-text font-medium transition-all duration-200 text-sm',
                  view === v
                    ? 'bg-snow text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-silver-mist/80'
                    : 'text-graphite hover:text-ink hover:bg-snow/40',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            iconLeft={<Download className="h-4 w-4" strokeWidth={1.6} />}
            disabled={trips.length === 0}
          >
            CSV
          </Button>
          <Button
            variant="accent"
            onClick={() => setShowForm(true)}
            iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}
          >
            Nuevo viaje
          </Button>
        </div>
      </header>

      {/* Stats strip */}
      {trips.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Gauge, label: 'KM TOTALES',   value: formatKm(stats.totalKm) },
            { icon: Clock, label: 'TIEMPO TOTAL', value: stats.totalTime >= 60
                ? `${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m`
                : `${stats.totalTime}min` },
            { icon: Fuel,  label: 'COMBUSTIBLE',  value: `${stats.totalFuel.toFixed(1)} L` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-snow border border-silver-mist rounded-[20px] p-5">
              <div className="flex items-center justify-between mb-3">
                <span
                  className="font-mono uppercase text-graphite"
                  style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em' }}
                >
                  {label}
                </span>
                <Icon className="h-4 w-4 text-graphite" strokeWidth={1.6} />
              </div>
              <p
                className="font-display text-ink tabular-nums"
                style={{
                  fontWeight: 700, fontSize: 28, lineHeight: 1, letterSpacing: '-0.3px',
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-graphite" strokeWidth={1.6} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar viaje…"
          className={cn(
            'w-full pl-11 pr-10 h-11 rounded-full',
            'bg-snow border border-silver-mist',
            'font-text text-ink placeholder:text-graphite',
            'focus:outline-none focus:border-azure transition-colors',
          )}
          style={{ fontSize: 14 }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-graphite hover:text-ink transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
        <span
          className="shrink-0 inline-flex items-center gap-1.5 font-mono uppercase text-graphite"
          style={{ fontSize: 11, letterSpacing: '0.12em' }}
        >
          <Filter className="h-3 w-3" strokeWidth={1.6} /> Filtros
        </span>
        {(Object.keys(filterLabel) as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilterKm(f)}
            className={cn(
              'shrink-0 px-4 py-2 rounded-full font-text font-medium border transition-colors',
              filterKm === f
                ? 'bg-ink text-snow border-ink'
                : 'bg-snow text-ink border-silver-mist hover:bg-fog',
            )}
            style={{ fontSize: 13 }}
          >
            {filterLabel[f]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 && trips.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Sin viajes registrados"
          description="Empieza a documentar tus rutas, consumo, clima y puntos de interés. Tu historial de conducción te espera."
          action={
            <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />} size="lg">
              Registrar primer viaje
            </Button>
          }
        />
      ) : view === 'map' ? (
        <div className="space-y-4">
          <Suspense fallback={
            <div className="h-80 bg-fog rounded-[28px] animate-pulse border border-silver-mist" />
          }>
            <TripMap
              trips={filtered}
              selectedTripId={selectedId ?? undefined}
              onTripClick={setSelectedId}
              className="border border-silver-mist rounded-[28px] overflow-hidden"
              style={{ height: 420 }}
            />
          </Suspense>

          {selectedTrip && (
            <div className="bg-snow border border-silver-mist rounded-[20px] p-5">
              <p
                className="font-display text-ink"
                style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-0.2px' }}
              >
                {selectedTrip.title ?? `${selectedTrip.start_location} → ${selectedTrip.end_location}`}
              </p>
              {selectedTrip.notes && (
                <p
                  className="font-text text-graphite mt-2 italic"
                  style={{ fontSize: 14, lineHeight: 1.45 }}
                >
                  "{selectedTrip.notes}"
                </p>
              )}
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button size="sm" variant="secondary" onClick={() => tripsService.exportGPX(selectedTrip)} iconLeft={<Download className="h-3.5 w-3.5" strokeWidth={1.6} />}>
                  GPX
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleShare(selectedTrip)}>
                  Compartir link
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(selectedTrip.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-text text-graphite" style={{ fontSize: 15 }}>
            Sin resultados para "{search || filterLabel[filterKm]}"
          </p>
          <button
            onClick={() => { setSearch(''); setFilterKm('all'); }}
            className="font-text text-cobalt-link hover:opacity-70 mt-3"
            style={{ fontSize: 14 }}
          >
            Limpiar filtros →
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              selected={trip.id === selectedId}
              onClick={() => setSelectedId(trip.id === selectedId ? null : trip.id)}
              onDelete={() => handleDelete(trip.id)}
              onShare={() => handleShare(trip)}
            />
          ))}
        </ul>
      )}

      {showForm && (
        <TripForm
          currentKm={selectedVehicle.current_km}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};
