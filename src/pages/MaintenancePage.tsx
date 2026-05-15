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
    <div className="px-6 sm:px-10 py-10">
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
            Mantenimiento.
          </h1>
          <p
            className="font-text text-graphite mt-3"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            <span className="text-ink font-medium tabular-nums">{records.length}</span> registros · gasto total{' '}
            <span className="text-ink font-medium tabular-nums">{formatCurrency(totalCost)}</span>
          </p>
        </div>
        <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}>
          Añadir registro
        </Button>
      </header>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
        <span className="shrink-0 inline-flex items-center gap-1.5 font-mono uppercase text-graphite" style={{ fontSize: 11, letterSpacing: '0.12em' }}>
          <Filter className="h-3 w-3" strokeWidth={1.6} /> Filtros
        </span>
        <button
          onClick={() => setFilterType('')}
          className={cn(
            'shrink-0 px-4 py-2 rounded-full font-text font-medium border transition-colors',
            !filterType
              ? 'bg-ink text-snow border-ink'
              : 'bg-snow text-ink border-silver-mist hover:bg-fog',
          )}
          style={{ fontSize: 13 }}
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
                'shrink-0 px-4 py-2 rounded-full font-text font-medium border transition-colors',
                active
                  ? 'bg-ink text-snow border-ink'
                  : 'bg-snow text-ink border-silver-mist hover:bg-fog',
              )}
              style={{ fontSize: 13 }}
            >
              {t}
            </button>
          );
        })}
        {filterType && (
          <button
            onClick={() => setFilterType('')}
            className="shrink-0 inline-flex items-center gap-1 text-graphite hover:text-ink font-text"
            style={{ fontSize: 13 }}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.6} /> Limpiar
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
