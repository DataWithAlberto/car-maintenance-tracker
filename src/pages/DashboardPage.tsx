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
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-accent-400" />
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">Tu garaje</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p className="text-gray-400 text-sm mt-1.5">
            {vehicles.length === 0
              ? 'Añade tu primer vehículo para empezar'
              : `${vehicles.length} ${vehicles.length === 1 ? 'vehículo' : 'vehículos'} en seguimiento`}
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
            <AlertTriangle className="h-4 w-4 text-warn-400" />
            <h2 className="text-sm font-semibold text-white tracking-tight">Alertas más recientes</h2>
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white tracking-tight uppercase">Tus vehículos</h2>
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
    owner: { Icon: Crown, label: 'Propietario', cls: 'bg-brand-500/15 text-brand-300 border-brand-500/30' },
    editor: { Icon: Pencil, label: 'Editor', cls: 'bg-success-500/15 text-success-400 border-success-500/30' },
    viewer: { Icon: Eye, label: 'Visor', cls: 'bg-gray-700/40 text-gray-400 border-gray-700' },
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
      className="group relative overflow-hidden text-left bg-surface border border-border/60 hover:border-brand-400/60 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-brand-500/10 focus-ring"
    >
      {/* Decorative gradient blob */}
      <div className="absolute -right-20 -top-20 h-40 w-40 bg-brand-500/10 rounded-full blur-3xl group-hover:bg-brand-400/20 transition-colors" />
      <div className="absolute -right-10 -bottom-10 h-24 w-24 bg-accent-500/10 rounded-full blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <RoleBadge role={vehicle.role} />
            <h3 className="text-white font-semibold text-xl tracking-tight mt-2 truncate">
              {vehicle.brand} {vehicle.model}
            </h3>
            <p className="text-gray-400 text-sm">
              {vehicle.year}
              {vehicle.color && <span className="text-gray-500"> · {vehicle.color}</span>}
              {vehicle.fuel_type && <span className="text-gray-500"> · {vehicle.fuel_type}</span>}
            </p>
          </div>
          {alertsCount > 0 && (
            <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-danger-500/15 border border-danger-500/30">
              <AlertTriangle className="h-3 w-3 text-danger-400" />
              <span className="text-danger-400 text-xs font-semibold">{alertsCount}</span>
            </div>
          )}
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
          <Stat label="Km" value={formatKm(vehicle.current_km)} icon={Gauge} />
          <Stat label="Servicios" value={String(recordsCount)} icon={Wrench} />
          <Stat
            label="Último"
            value={lastRecord ? new Date(lastRecord.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
            icon={Calendar}
          />
        </div>

        <div className="mt-4 flex items-center text-brand-300 text-sm font-medium opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all">
          Abrir vehículo <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </div>
    </button>
  );
};

const Stat = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Gauge }) => (
  <div>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
      <Icon className="h-3 w-3" />
      {label}
    </div>
    <p className="text-white text-sm font-semibold tabular-nums truncate">{value}</p>
  </div>
);
