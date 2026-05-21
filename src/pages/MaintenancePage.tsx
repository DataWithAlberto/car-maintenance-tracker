import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, X, Sparkles, Loader2 } from 'lucide-react';
import { MaintenanceList } from '../components/maintenance/MaintenanceList';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { FailureForecast } from '../components/maintenance/FailureForecast';
import { Button } from '../components/ui/Button';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useVehicleStore } from '../store/vehicleStore';
import { useMaintenance } from '../hooks/useMaintenance';
import { useSettingsStore } from '../store/settingsStore';
import { expensesService } from '../services/expenses.service';
import { claudeService } from '../services/claude.service';
import { MAINTENANCE_TYPES } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { cn } from '../utils/cn';
import type { MaintenanceRecord, MaintenanceInsight } from '../types';
import type { MaintenanceInput } from '../utils/validators';
import toast from 'react-hot-toast';

const SEVERITY_COLOR: Record<string, string> = {
  high: '#b64400',
  medium: '#c77700',
  low: 'var(--color-graphite)',
};
const SEVERITY_LABEL: Record<string, string> = {
  high: 'Urgente',
  medium: 'Atención',
  low: 'Informativo',
};

const toInput = (r: MaintenanceRecord): Partial<MaintenanceInput> => ({
  type: r.type,
  date: r.date,
  km_at_service: r.km_at_service,
  cost: r.cost ?? undefined,
  description: r.description ?? undefined,
  parts_location: r.parts_location ?? undefined,
  next_service_km: r.next_service_km ?? undefined,
  next_service_date: r.next_service_date ?? undefined,
});

export const MaintenancePage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { records, loading, fetchRecords, createRecord, updateRecord, deleteRecord } = useMaintenance(selectedVehicle?.id);
  const { anthropicApiKey } = useSettingsStore();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [filterType, setFilterType] = useState('');
  const [insights, setInsights] = useState<MaintenanceInsight[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!selectedVehicle) { navigate('/dashboard'); return; }
    fetchRecords();
  }, [selectedVehicle?.id]);

  if (!selectedVehicle) return null;

  const filtered = filterType ? records.filter((r) => r.type === filterType) : records;
  const totalCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);

  const handleSubmit = async (data: MaintenanceInput) => {
    if (editing) {
      await updateRecord(editing.id, data);
      toast.success('Registro actualizado');
    } else {
      await createRecord(data);
      toast.success('Registro añadido');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await deleteRecord(id);
    toast.success('Registro eliminado');
  };

  const handleAnalyze = async () => {
    if (!selectedVehicle) return;
    if (!anthropicApiKey) {
      toast.error('Configura la API key de Claude en Ajustes');
      navigate('/settings');
      return;
    }
    setAnalyzing(true);
    try {
      const expenses = await expensesService.getByVehicle(selectedVehicle.id).catch(() => []);
      const result = await claudeService.analyzeMaintenance({
        apiKey: anthropicApiKey,
        vehicle: selectedVehicle,
        records,
        expenses,
      });
      setInsights(result);
      if (result.length === 0) toast('Sin observaciones relevantes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar el análisis');
    } finally {
      setAnalyzing(false);
    }
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
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleAnalyze}
            loading={analyzing}
            iconLeft={<Sparkles className="h-4 w-4" strokeWidth={1.7} />}
          >
            Análisis IA
          </Button>
          <Button variant="accent" onClick={() => setShowForm(true)} iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}>
            Añadir registro
          </Button>
        </div>
      </header>

      {/* AI insights */}
      {(analyzing || insights) && (
        <div className="bg-snow border border-silver-mist rounded-[28px] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span
              className="inline-flex items-center gap-2 font-mono uppercase text-graphite"
              style={{ fontSize: 11, letterSpacing: '0.14em' }}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} /> Análisis IA del historial
            </span>
            {insights && (
              <button
                onClick={() => setInsights(null)}
                className="text-graphite hover:text-ink transition-colors"
                aria-label="Cerrar análisis"
              >
                <X className="h-4 w-4" strokeWidth={1.7} />
              </button>
            )}
          </div>
          {analyzing ? (
            <div className="flex items-center gap-2 text-graphite font-text" style={{ fontSize: 14 }}>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
              Analizando mantenimiento y gastos…
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex gap-3">
                  <span
                    className="shrink-0 mt-1 h-2 w-2 rounded-full"
                    style={{ background: SEVERITY_COLOR[ins.severity] ?? 'var(--color-graphite)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-text text-ink font-semibold" style={{ fontSize: 15 }}>
                        {ins.title}
                      </span>
                      <span
                        className="font-mono uppercase"
                        style={{
                          fontSize: 9, letterSpacing: '0.1em',
                          color: SEVERITY_COLOR[ins.severity] ?? 'var(--color-graphite)',
                        }}
                      >
                        {SEVERITY_LABEL[ins.severity] ?? ins.severity}
                      </span>
                    </div>
                    <p className="font-text text-graphite mt-0.5" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
                      {ins.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-text text-graphite" style={{ fontSize: 14 }}>
              Sin observaciones relevantes por ahora.
            </p>
          )}
        </div>
      )}

      {/* Failure prediction */}
      {!loading && <FailureForecast vehicle={selectedVehicle} records={records} />}

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
        <span className="shrink-0 inline-flex items-center gap-1.5 font-mono uppercase text-graphite" style={{ fontSize: 11, letterSpacing: '0.12em' }}>
          <Filter className="h-3 w-3" strokeWidth={1.6} /> Filtros
        </span>
        <button
          type="button"
          onClick={() => setFilterType('')}
          aria-pressed={!filterType}
          aria-label="Mostrar todos los registros"
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
              type="button"
              onClick={() => setFilterType(active ? '' : t)}
              aria-pressed={active}
              aria-label={`Filtrar por ${t}`}
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
        <MaintenanceList records={filtered} onDelete={handleDelete} onSelect={setEditing} />
      )}

      {(showForm || editing) && (
        <MaintenanceForm
          currentKm={selectedVehicle.current_km}
          initialData={editing ? toInput(editing) : undefined}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
};
