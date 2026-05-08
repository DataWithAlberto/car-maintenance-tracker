import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Car, Wrench, Receipt, AlertTriangle, Gauge, Calendar,
  ArrowRight, Sparkles, Crown, Pencil, Eye,
} from 'lucide-react';
import { useVehicle } from '../hooks/useVehicle';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { AlertCard } from '../components/alerts/AlertCard';
import { calculateAlerts } from '../utils/calculations';
import { maintenanceService } from '../services/maintenance.service';
import { expensesService } from '../services/expenses.service';
import { useVehicleStore } from '../store/vehicleStore';
import { formatKm, formatCurrency } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { KpiCard } from '../components/ui/KpiCard';
import type { VehicleWithAccess, MaintenanceRecord, Expense } from '../types';
import toast from 'react-hot-toast';

interface VehicleStats {
  vehicle: VehicleWithAccess;
  records: MaintenanceRecord[];
  expenses: Expense[];
  alerts: ReturnType<typeof calculateAlerts>;
}

export const DashboardPage = () => {
  const { vehicles, loading, fetchVehicles, createVehicle } = useVehicle();
  const { setSelectedVehicle: storeSet } = useVehicleStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<Record<string, VehicleStats>>({});

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Aggregate stats per vehicle in parallel
  useEffect(() => {
    if (vehicles.length === 0) return;
    Promise.all(
      vehicles.map(async (v) => {
        const [records, expenses] = await Promise.all([
          maintenanceService.getByVehicle(v.id).catch(() => []),
          expensesService.getByVehicle(v.id).catch(() => []),
        ]);
        return {
          id: v.id,
          data: {
            vehicle: v,
            records,
            expenses,
            alerts: calculateAlerts(v, records).filter((a) => !a.is_dismissed),
          } satisfies VehicleStats,
        };
      }),
    ).then((results) => {
      const map: Record<string, VehicleStats> = {};
      results.forEach((r) => { map[r.id] = r.data; });
      setStats(map);
    });
  }, [vehicles]);

  const aggregate = useMemo(() => {
    const all = Object.values(stats);
    const totalKm = vehicles.reduce((s, v) => s + v.current_km, 0);
    const totalRecords = all.reduce((s, x) => s + x.records.length, 0);
    const ytd = new Date().getFullYear();
    const totalSpentYtd = all.reduce(
      (s, x) =>
        s + x.expenses.filter((e) => new Date(e.date).getFullYear() === ytd).reduce((a, e) => a + e.amount, 0)
        + x.records.filter((r) => new Date(r.date).getFullYear() === ytd).reduce((a, r) => a + (r.cost ?? 0), 0),
      0,
    );
    const totalAlerts = all.reduce((s, x) => s + x.alerts.length, 0);
    return { totalKm, totalRecords, totalSpentYtd, totalAlerts };
  }, [stats, vehicles]);

  const handleSelect = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    if (!v) return;
    storeSet(v);
    navigate('/car');
  };

  const handleCreate = async (data: Parameters<typeof createVehicle>[0]) => {
    try {
      const v = await createVehicle(data);
      toast.success('Vehículo añadido');
      storeSet({ ...v, role: 'owner' });
      navigate('/car');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear vehículo');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
      {/* Hero */}
      <header className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="tele-dot" />
            <p className="font-manrope text-caption text-sky-dark tracking-wide">Sistema activo</p>
            <span className="text-ink-charcoal/45">·</span>
            <p className="font-manrope text-caption text-ink-charcoal/70">Tu garaje</p>
          </div>
          <h1
            className="font-simeiz text-ink-black leading-tight mt-1"
            style={{ fontSize: '3rem', fontWeight: 300, letterSpacing: '-0.02em' }}
          >
            Bienvenido
            <span className="text-sunset-orange italic"> de vuelta</span>
          </h1>
          <p className="font-manrope text-body text-ink-charcoal/70 mt-2">
            {vehicles.length === 0
              ? '→ Añade tu primer vehículo para empezar'
              : `${vehicles.length} ${vehicles.length === 1 ? 'vehículo registrado' : 'vehículos registrados'} · FocusHub v2`}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" />}>
          Añadir vehículo
        </Button>
      </header>

      {/* KPI row */}
      {vehicles.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <KpiCard
            icon={Gauge}
            label="Km totales"
            value={formatKm(aggregate.totalKm)}
            tone="brand"
          />
          <KpiCard
            icon={Wrench}
            label="Mantenimientos"
            value={aggregate.totalRecords}
            tone="success"
            hint={aggregate.totalRecords === 0 ? 'Aún sin registros' : 'Histórico'}
          />
          <KpiCard
            icon={Receipt}
            label="Gasto YTD"
            value={formatCurrency(aggregate.totalSpentYtd)}
            tone="accent"
            hint={`${new Date().getFullYear()}`}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Alertas activas"
            value={aggregate.totalAlerts}
            tone={aggregate.totalAlerts > 0 ? 'danger' : 'success'}
            hint={aggregate.totalAlerts > 0 ? 'Requieren atención' : 'Todo en orden'}
          />
        </div>
      )}

      {/* Active alerts strip */}
      {aggregate.totalAlerts > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px flex-1 bg-border/60 max-w-[2rem]" />
            <AlertTriangle className="h-3.5 w-3.5 text-warn-400" />
            <h2 className="font-manrope text-caption text-ink-charcoal/70 tracking-wide">Alertas activas</h2>
            <span className="h-px flex-1 bg-border/60" />
          </div>
          <div className="space-y-2">
            {Object.values(stats)
              .flatMap((x) => x.alerts)
              .slice(0, 3)
              .map((a) => <AlertCard key={a.id} alert={a} />)}
          </div>
        </section>
      )}

      {/* Vehicle grid */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px flex-1 bg-border/60 max-w-[2rem]" />
          <h2 className="font-manrope text-caption text-ink-charcoal/70 tracking-wide">Flota registrada</h2>
          <span className="h-px flex-1 bg-border/60" />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="Tu garaje está vacío"
            description="Añade tu primer coche para empezar a registrar mantenimientos, gastos y mucho más."
            action={
              <Button onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" />} size="lg">
                Añadir mi primer coche
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                stats={stats[v.id]}
                onSelect={() => handleSelect(v.id)}
              />
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <VehicleForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
};

// ─── Vehicle card ────────────────────────────────────────────────────────────
interface VehicleCardProps {
  vehicle: VehicleWithAccess;
  stats?: VehicleStats;
  onSelect: () => void;
}

const RoleBadge = ({ role }: { role: 'owner' | 'editor' | 'viewer' }) => {
  const map = {
    owner: { Icon: Crown, label: 'Propietario', cls: 'bg-brand-500/15 text-sky-dark border-sky-blueprint/30' },
    editor: { Icon: Pencil, label: 'Editor', cls: 'bg-success-500/15 text-success-400 border-success-500/30' },
    viewer: { Icon: Eye, label: 'Visor', cls: 'bg-canvas-50 text-ink-charcoal border-sky-blueprint/25' },
  } as const;
  const { Icon, label, cls } = map[role];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

const VehicleCard = ({ vehicle, stats, onSelect }: VehicleCardProps) => {
  const alertsCount = stats?.alerts.length ?? 0;
  const recordsCount = stats?.records.length ?? 0;
  const lastRecord = stats?.records[0];

  return (
    <button
      onClick={onSelect}
      className="group relative overflow-hidden text-left bg-cloud-white border border-sky-blueprint/30 hover:border-sky-blueprint/50 rounded-card shadow-subtle hover:shadow-card-hover transition-all duration-200 focus-ring stripe-top stripe-top-brand"
    >
      {/* Header band */}
      <div className="relative px-5 pt-5 pb-4">
        {/* Corner accent line */}
        <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-sky-blueprint/40 to-transparent" />
        <div className="absolute top-0 right-0 h-16 w-px bg-gradient-to-b from-sky-blueprint/40 to-transparent" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <RoleBadge role={vehicle.role} />
            <h3
              className="font-simeiz text-ink-black leading-tight mt-2 truncate"
              style={{ fontSize: '1.5rem', fontWeight: 300, letterSpacing: '-0.01em' }}
            >
              {vehicle.brand} {vehicle.model}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-manrope text-caption text-ink-charcoal/70">{vehicle.year}</span>
              {vehicle.fuel_type && (
                <>
                  <span className="text-ink-charcoal/40">·</span>
                  <span className="font-manrope text-caption text-ink-charcoal/70">{vehicle.fuel_type}</span>
                </>
              )}
              {vehicle.color && (
                <>
                  <span className="text-ink-charcoal/40">·</span>
                  <span className="font-manrope text-caption text-ink-charcoal/70 capitalize">{vehicle.color}</span>
                </>
              )}
            </div>
          </div>
          {alertsCount > 0 ? (
            <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-button bg-sunset-orange/10 border border-sunset-orange/30">
              <AlertTriangle className="h-3 w-3 text-sunset-orange" />
              <span className="font-manrope text-caption font-semibold text-sunset-orange">{alertsCount}</span>
            </div>
          ) : (
            <div className="shrink-0 h-6 w-6 rounded-full bg-success-500/12 border border-success-500/25 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
            </div>
          )}
        </div>
      </div>

      {/* Divider with trace line */}
      <div className="mx-5 h-px bg-border/60" />

      {/* Telemetry stats row */}
      <div className="grid grid-cols-3 px-5 py-4">
        <TeleStat label="ODM" value={formatKm(vehicle.current_km)} icon={Gauge} />
        <TeleStat label="SVC" value={String(recordsCount)} icon={Wrench} />
        <TeleStat
          label="LAST"
          value={lastRecord
            ? new Date(lastRecord.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()
            : '—'}
          icon={Calendar}
        />
      </div>

      {/* Footer CTA strip */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-sky-blueprint/15 bg-canvas-50/40">
        <span className="font-manrope text-caption text-ink-charcoal/40">
          #{vehicle.id.slice(0, 8)}
        </span>
        <span className="flex items-center gap-1 font-manrope text-caption font-medium text-sky-dark opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200">
          Abrir <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
};

const TeleStat = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Gauge }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1">
      <Icon className="h-3 w-3 text-sky-dark/70" strokeWidth={1.5} />
      <span className="font-manrope text-caption text-ink-charcoal/60 tracking-wide">{label}</span>
    </div>
    <p
      className="font-simeiz text-ink-black tabular-nums truncate leading-none"
      style={{ fontSize: '1.1rem', fontWeight: 300, letterSpacing: '-0.01em' }}
    >
      {value}
    </p>
  </div>
);
