import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Map, List, Download, Route, Filter, X, Gauge, Clock, Fuel, Search } from 'lucide-react';
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

const TripMap = lazy(() => import('../components/trips/TripMap').then((m) => ({ default: m.TripMap })));

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

  const [showForm, setShowForm]         = useState(false);
  const [view, setView]                 = useState<ViewMode>('list');
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [filterKm, setFilterKm]         = useState<FilterType>('all');
  const [search, setSearch]             = useState('');

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    fetchTrips();
  }, [selectedVehicle?.id]);

  if (!selectedVehicle || !user) return null;

  // ── Filtered list ────────────────────────────────────────────────────────────
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

  // ── Aggregate stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalKm:   trips.reduce((s, t) => s + (t.total_km ?? 0), 0),
    totalTime: trips.reduce((s, t) => s + (t.driving_time_minutes ?? 0), 0),
    totalFuel: trips.reduce((s, t) => s + (t.fuel_consumed ?? 0), 0),
  }), [trips]);

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
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="font-manrope text-caption text-sky-dark/80 tracking-wide mb-1">
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <h1 className="font-simeiz text-heading-lg font-light text-ink-black tracking-tight">Mis viajes</h1>
          <p className="font-manrope text-caption text-ink-charcoal/70 mt-1">
            <span className="font-semibold text-ink-black tabular-nums">{trips.length}</span> rutas registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            iconLeft={<Download className="h-3.5 w-3.5" />}
            disabled={trips.length === 0}
          >
            CSV
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            iconLeft={<Plus className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Nuevo viaje</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>
      </header>

      {/* Stats strip */}
      {trips.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Gauge, label: 'Km totales', value: formatKm(stats.totalKm) },
            { icon: Clock, label: 'Tiempo total', value: stats.totalTime >= 60 ? `${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m` : `${stats.totalTime}min` },
            { icon: Fuel,  label: 'Combustible', value: `${stats.totalFuel.toFixed(1)} L` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-cloud-white border border-sky-blueprint/20 rounded-card p-3 sm:p-4 text-center">
              <Icon className="h-4 w-4 text-sky-dark mx-auto mb-1" />
              <p className="font-simeiz text-subheading font-light text-ink-black tabular-nums">{value}</p>
              <p className="font-manrope text-caption text-ink-charcoal/60 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-charcoal/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar viaje…"
            className="w-full pl-8 pr-3 py-2 bg-cloud-white border border-sky-blueprint/25 rounded-button font-manrope text-caption text-ink-black placeholder-ink-charcoal/40 focus:outline-none focus:border-sky-blueprint/60 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-charcoal/50 hover:text-ink-black">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <Filter className="h-3.5 w-3.5 text-ink-charcoal/50 shrink-0" />
          {(Object.keys(filterLabel) as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterKm(f)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-button font-manrope text-caption font-medium border transition-all',
                filterKm === f
                  ? 'bg-sky-blueprint/15 text-sky-dark border-sky-blueprint/40'
                  : 'border-sky-blueprint/25 text-ink-charcoal hover:text-ink-black',
              )}
            >
              {filterLabel[f]}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex bg-canvas-50 border border-sky-blueprint/25 rounded-button p-0.5 shrink-0">
          {([['list', List], ['map', Map]] as const).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'p-2 rounded-button transition-colors',
                view === v ? 'bg-sky-blueprint/15 text-sky-dark' : 'text-ink-charcoal hover:text-ink-black',
              )}
              aria-label={v === 'list' ? 'Vista lista' : 'Vista mapa'}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 && trips.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Sin viajes registrados"
          description="Empieza a documentar tus rutas, consumo, clima y puntos de interés. Tu historial de conducción te espera."
          action={
            <Button onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" />} size="lg">
              Registrar primer viaje
            </Button>
          }
        />
      ) : view === 'map' ? (
        <div className="space-y-4">
          <Suspense fallback={<div className="h-80 bg-canvas-50 rounded-card animate-pulse" />}>
            <TripMap
              trips={filtered}
              selectedTripId={selectedId ?? undefined}
              onTripClick={setSelectedId}
              className="border border-sky-blueprint/20 shadow-subtle"
              style={{ height: 420 }}
            />
          </Suspense>

          {selectedTrip && (
            <div className="bg-cloud-white border border-sky-blueprint/25 rounded-card p-4 shadow-subtle">
              <p className="font-simeiz text-heading font-light text-ink-black">
                {selectedTrip.title ?? `${selectedTrip.start_location} → ${selectedTrip.end_location}`}
              </p>
              {selectedTrip.notes && (
                <p className="font-manrope text-caption text-ink-charcoal/70 mt-1 italic">"{selectedTrip.notes}"</p>
              )}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="secondary" onClick={() => tripsService.exportGPX(selectedTrip)} iconLeft={<Download className="h-3.5 w-3.5" />}>
                  GPX
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleShare(selectedTrip)} iconLeft={<Download className="h-3.5 w-3.5" />}>
                  Compartir
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(selectedTrip.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="font-manrope text-body text-ink-charcoal/60">Sin resultados para "{search || filterLabel[filterKm]}"</p>
          <button onClick={() => { setSearch(''); setFilterKm('all'); }} className="font-manrope text-caption text-sky-dark mt-2 hover:underline">
            Limpiar filtros
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
