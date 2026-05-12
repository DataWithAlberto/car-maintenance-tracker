import { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Maximize2, Minimize2, ChevronRight, Wrench, AlertTriangle, Gauge } from 'lucide-react';
const CarViewer = lazy(() => import('../components/3d/CarViewer').then(m => ({ default: m.CarViewer })));
import { PartInfoOverlay } from '../components/3d/PartInfoOverlay';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { AlertCard } from '../components/alerts/AlertCard';
import { Button } from '../components/ui/Button';
import { useVehicleStore } from '../store/vehicleStore';
import { useMaintenance } from '../hooks/useMaintenance';
import { useVehicle } from '../hooks/useVehicle';
import { calculateAlerts } from '../utils/calculations';
import { formatKm } from '../utils/formatters';
import { CAR_PARTS } from '../utils/constants';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

export const CarPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { records, fetchRecords, createRecord } = useMaintenance(selectedVehicle?.id);
  const { updateVehicle } = useVehicle();
  const navigate = useNavigate();

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [prefilledType, setPrefilledType] = useState('');
  const [autoRotate, setAutoRotate] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedVehicle) {
      navigate('/dashboard');
      return;
    }
    fetchRecords();
  }, [selectedVehicle?.id]);

  // Esc to close part overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPart(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!selectedVehicle) return null;

  const alerts = useMemo(
    () => calculateAlerts(selectedVehicle, records).filter((a) => !dismissedAlerts.has(a.id)),
    [selectedVehicle, records, dismissedAlerts],
  );

  // Map part keys → severity (highest)
  const partSeverityMap = useMemo(() => {
    const map: Record<string, 'high' | 'medium' | 'low'> = {};
    Object.keys(CAR_PARTS).forEach((partKey) => {
      const part = CAR_PARTS[partKey];
      const partAlerts = records
        .filter((r) => part.maintenanceTypes.includes(r.type) && r.next_service_km)
        .map((r) => {
          if (!r.next_service_km) return null;
          const left = r.next_service_km - selectedVehicle.current_km;
          if (left <= 0) return 'high';
          if (left <= 1500) return 'medium';
          return 'low';
        })
        .filter(Boolean) as Array<'high' | 'medium' | 'low'>;
      if (partAlerts.includes('high')) map[partKey] = 'high';
      else if (partAlerts.includes('medium')) map[partKey] = 'medium';
    });
    return map;
  }, [records, selectedVehicle]);

  const handlePartClick = (partKey: string) => {
    setSelectedPart(partKey);
    setAutoRotate(false);
  };

  const handleAddMaintenance = (type: string) => {
    setPrefilledType(type);
    setShowMaintenanceForm(true);
  };

  const handleCreateRecord = async (data: Parameters<typeof createRecord>[0]) => {
    await createRecord(data);
    await updateVehicle(selectedVehicle.id, {
      current_km: Math.max(selectedVehicle.current_km, data.km_at_service),
    });
    toast.success('Registro añadido');
    setShowMaintenanceForm(false);
  };

  const interactiveParts = Object.entries(CAR_PARTS);

  return (
    <div className={cn('flex flex-col', immersive ? 'h-[100vh] fixed inset-0 z-50 bg-snow' : 'h-[calc(100vh-4rem)]')}>
      {/* Header */}
      {!immersive && (
        <div
          className="border-b border-silver-mist px-6 sm:px-10 py-4 flex items-center justify-between gap-3"
          style={{ background: 'rgba(245, 245, 247, 0.85)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Status dot */}
            <span
              className="inline-block rounded-full shrink-0"
              style={{
                width: 7, height: 7, background: '#1cb05c',
                boxShadow: '0 0 0 4px rgba(28,176,92,0.22)',
              }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="eyebrow">
                {selectedVehicle.brand} {selectedVehicle.model} · {selectedVehicle.year}
              </span>
              <p className="font-text text-graphite flex items-center gap-2 mt-1" style={{ fontSize: 13 }}>
                <Gauge className="h-3.5 w-3.5" strokeWidth={1.6} />
                <span className="tabular-nums">{formatKm(selectedVehicle.current_km)}</span>
                {alerts.length > 0 && (
                  <>
                    <span className="text-silver-mist">·</span>
                    <span className="inline-flex items-center gap-1" style={{ color: '#b64400' }}>
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.6} />
                      {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRotate((s) => !s)}
              className={cn(
                'h-9 w-9 inline-flex items-center justify-center rounded-full border transition-colors',
                autoRotate
                  ? 'bg-ink text-snow border-ink'
                  : 'bg-snow text-ink border-silver-mist hover:bg-fog',
              )}
              title="Auto-rotar"
            >
              <RotateCcw className={cn('h-4 w-4', autoRotate && 'animate-spin')} strokeWidth={1.6} style={{ animationDuration: '4s' }} />
            </button>
            <button
              onClick={() => setImmersive(true)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-snow text-ink border border-silver-mist hover:bg-fog transition-colors"
              title="Modo inmersivo"
            >
              <Maximize2 className="h-4 w-4" strokeWidth={1.6} />
            </button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => { setPrefilledType(''); setShowMaintenanceForm(true); }}
              iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}
            >
              <span className="hidden sm:inline">Añadir</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>
        </div>
      )}

      {immersive && (
        <button
          onClick={() => setImmersive(false)}
          className="absolute top-4 right-4 z-50 h-10 w-10 inline-flex items-center justify-center rounded-full bg-snow text-ink border border-silver-mist hover:bg-fog transition-colors"
          title="Salir de inmersivo"
          style={{ backdropFilter: 'blur(20px)' }}
        >
          <Minimize2 className="h-4 w-4" strokeWidth={1.6} />
        </button>
      )}

      {/* Alerts strip */}
      {!immersive && alerts.length > 0 && (
        <div className="border-b border-silver-mist px-6 sm:px-10 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          {alerts.map((a) => (
            <div key={a.id} className="shrink-0 max-w-xs">
              <AlertCard alert={a} onDismiss={(id) => setDismissedAlerts((s) => new Set([...s, id]))} />
            </div>
          ))}
        </div>
      )}

      {/* 3D Viewer + side panel */}
      <div className="flex-1 relative" style={{ background: '#f5f5f7' }}>
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border border-silver-mist" />
                <div className="absolute inset-0 rounded-full border border-transparent border-t-ink animate-spin" />
              </div>
              <p className="font-text text-graphite" style={{ fontSize: 13 }}>Cargando modelo 3D...</p>
            </div>
          </div>
        }>
          <CarViewer
            onPartClick={handlePartClick}
            autoRotate={autoRotate}
            modelUrl="/models/ford_focus.glb"
          />
        </Suspense>

        {/* Hotspot legend (collapsed) */}
        {!selectedPart && Object.keys(partSeverityMap).length > 0 && (
          <div className="hidden md:flex absolute top-6 left-6 max-w-xs flex-col gap-1.5">
            <span className="eyebrow" style={{ color: '#b64400' }}>
              ● Atención requerida
            </span>
            <div className="flex flex-col gap-1.5 mt-1">
              {Object.entries(partSeverityMap).slice(0, 3).map(([key, sev]) => {
                const color = sev === 'high' ? '#b64400' : '#c77700';
                return (
                  <button
                    key={key}
                    onClick={() => handlePartClick(key)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-snow border border-silver-mist hover:bg-fog transition-colors font-text text-body-sm font-medium text-ink"
                    style={{ backdropFilter: 'blur(20px)' }}
                  >
                    <span className="rounded-full inline-block" style={{ width: 6, height: 6, background: color }} />
                    {CAR_PARTS[key]?.label}
                    <ChevronRight className="h-3.5 w-3.5 text-graphite" strokeWidth={1.6} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom hint */}
        {!selectedPart && (
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-snow border border-silver-mist text-ink px-4 py-2 rounded-full flex items-center gap-2 pointer-events-none font-text font-medium"
            style={{ fontSize: 13, backdropFilter: 'blur(20px)' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-azure opacity-60" style={{ animation: 'pulse-ring 2.4s ease-out infinite' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-azure" />
            </span>
            Haz clic en una parte del coche
          </div>
        )}

        {/* Quick parts (mobile) */}
        {!selectedPart && (
          <div className="md:hidden absolute bottom-24 inset-x-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {interactiveParts.slice(0, 6).map(([key, part]) => {
              const sev = partSeverityMap[key];
              const color = sev === 'high' ? '#b64400' : sev === 'medium' ? '#c77700' : null;
              return (
                <button
                  key={key}
                  onClick={() => handlePartClick(key)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-snow border border-silver-mist text-ink font-text text-body-sm font-medium"
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  {color && (
                    <span className="rounded-full inline-block" style={{ width: 6, height: 6, background: color }} />
                  )}
                  <Wrench className="h-3.5 w-3.5 text-graphite" strokeWidth={1.6} />
                  {part.label}
                </button>
              );
            })}
          </div>
        )}

        {selectedPart && (
          <PartInfoOverlay
            partKey={selectedPart}
            records={records}
            onClose={() => setSelectedPart(null)}
            onAddMaintenance={handleAddMaintenance}
          />
        )}
      </div>

      {showMaintenanceForm && (
        <MaintenanceForm
          initialType={prefilledType}
          currentKm={selectedVehicle.current_km}
          onSubmit={handleCreateRecord}
          onClose={() => setShowMaintenanceForm(false)}
        />
      )}
    </div>
  );
};
