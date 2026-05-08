import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, X } from 'lucide-react';
import { MaintenanceList } from '../components/maintenance/MaintenanceList';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { Button } from '../components/ui/Button';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useMaintenance } from '../hooks/useMaintenance';
import { MAINTENANCE_TYPES } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

export const MaintenancePage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { records, loading, fetchRecords, createRecord, deleteRecord } = useMaintenance(selectedVehicle?.id);
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    fetchRecords();
  }, [selectedVehicle?.id]);

  if (!selectedVehicle) return null;

  const filtered = filterType ? records.filter((r) => r.type === filterType) : records;
  const totalCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);

  const handleCreate = async (data: Parameters<typeof createRecord>[0]) => {
    await createRecord(data);
    toast.success('Registro añadido');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await deleteRecord(id);
    toast.success('Registro eliminado');
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
      <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-charcoal font-semibold mb-1">
            {selectedVehicle.brand} {selectedVehicle.model}
          </p>
          <h1 className="font-simeiz text-heading-lg font-light text-ink-black tracking-tight">Mantenimiento</h1>
          <p className="text-ink-charcoal text-sm mt-1.5">
            <span className="font-semibold text-ink-black tabular-nums">{records.length}</span> registros · total{' '}
            <span className="font-semibold text-accent-400 tabular-nums">{formatCurrency(totalCost)}</span>
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" />}>
          Añadir registro
        </Button>
      </header>

      <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs text-ink-charcoal">
          <Filter className="h-3 w-3" /> Filtros:
        </span>
        <button
          onClick={() => setFilterType('')}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
            !filterType
              ? 'bg-sky-blueprint/15 text-sky-dark border-sky-blueprint/40'
              : 'border-sky-blueprint/25 text-ink-charcoal hover:text-ink-black hover:border-ink-charcoal/40',
          )}
        >
          Todos
        </button>
        {MAINTENANCE_TYPES.map((t) => {
          const active = filterType === t;
          return (
            <button
              key={t}
              onClick={() => setFilterType(active ? '' : t)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                active
                  ? 'bg-sky-blueprint/15 text-sky-dark border-sky-blueprint/40'
                  : 'border-sky-blueprint/25 text-ink-charcoal hover:text-ink-black hover:border-ink-charcoal/40',
              )}
            >
              {t}
            </button>
          );
        })}
        {filterType && (
          <button
            onClick={() => setFilterType('')}
            className="shrink-0 inline-flex items-center gap-1 text-ink-charcoal hover:text-ink-black text-xs"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <MaintenanceList records={filtered} onDelete={handleDelete} />
      )}

      {showForm && (
        <MaintenanceForm
          currentKm={selectedVehicle.current_km}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};
