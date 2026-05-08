import { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Maximize2, Minimize2, Sparkles, ChevronRight, Wrench, AlertTriangle, Gauge } from 'lucide-react';
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
    <div className={cn('flex flex-col', immersive ? 'h-[100vh] fixed inset-0 z-50 bg-canvas-white' : 'h-[calc(100vh-4rem)]')}>
      {/* Header */}
      {!immersive && (
        <div className="bg-canvas-white/95 border-b border-sky-blueprint/25 px-4 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Status indicator */}
            <div className="shrink-0 h-9 w-9 rounded-lg bg-cloud-white border border-sky-blueprint/35 flex items-center justify-center">
              <span className="tele-dot" />
            </div>
            <div className="min-w-0">
              <h1
                className="text-ink-black font-black uppercase tracking-wide leading-none truncate"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}
              >
                {selectedVehicle.brand} {selectedVehicle.model}
                <span className="text-ink-charcoal/80 font-normal"> /{selectedVehicle.year}</span>
              </h1>
              <p className="text-ink-charcoal text-[11px] font-mono flex items-center gap-1.5 mt-0.5">
                <Gauge className="h-3 w-3" />
                {formatKm(selectedVehicle.current_km)}
                {alerts.length > 0 && (
                  <>
                    <span className="text-ink-charcoal/65">·</span>
                    <span className="text-warn-400 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {alerts.length} {alerts.length === 1 ? 'ALERTA' : 'ALERTAS'}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAutoRotate((s) => !s)}
              className={cn(
                'h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-all',
                autoRotate
                  ? 'bg-accent-500/15 border-accent-500/40 text-accent-400'
                  : 'border-sky-blueprint/25 text-ink-charcoal hover:text-ink-black hover:bg-cloud-white',
              )}
              title="Auto-rotar"
            >
              <RotateCcw className={cn('h-3.5 w-3.5', autoRotate && 'animate-spin')} style={{ animationDuration: '4s' }} />
            </button>
            <button
              onClick={() => setImmersive(true)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-sky-blueprint/25 text-ink-charcoal hover:text-ink-black hover:bg-cloud-white transition-all"
              title="Modo inmersivo"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <Button
              size="sm"
              onClick={() => { setPrefilledType(''); setShowMaintenanceForm(true); }}
              iconLeft={<Plus className="h-4 w-4" />}
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
          className="absolute top-4 right-4 z-50 h-9 w-9 inline-flex items-center justify-center rounded-lg glass-strong border border-sky-blueprint/25 text-ink-black hover:text-ink-black"
          title="Salir de inmersivo"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      )}

      {/* Alerts strip */}
      {!immersive && alerts.length > 0 && (
        <div className="border-b border-sky-blueprint/20 px-4 sm:px-6 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
          {alerts.map((a) => (
            <div key={a.id} className="shrink-0 max-w-xs">
              <AlertCard alert={a} onDismiss={(id) => setDismissedAlerts((s) => new Set([...s, id]))} />
            </div>
          ))}
        </div>
      )}

      {/* 3D Viewer + side panel */}
      <div className="flex-1 relative">
        {/* Background pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.18), transparent 60%), radial-gradient(circle at 80% 80%, rgba(163, 224, 18, 0.08), transparent 50%)',
          }}
        />

        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-400 border-r-brand-400 animate-spin" />
              </div>
              <p className="text-ink-charcoal text-sm">Cargando modelo 3D...</p>
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
          <div className="hidden md:flex absolute top-4 left-4 max-w-xs flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider text-ink-charcoal font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-warn-400" />
              Atención requerida
            </p>
            {Object.entries(partSeverityMap).slice(0, 3).map(([key, sev]) => (
              <button
                key={key}
                onClick={() => handlePartClick(key)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border backdrop-blur',
                  sev === 'high'
                    ? 'bg-danger-500/15 border-danger-500/40 text-danger-400 hover:bg-danger-500/25'
                    : 'bg-warn-500/15 border-warn-500/40 text-warn-400 hover:bg-warn-500/25',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', sev === 'high' ? 'bg-danger-500' : 'bg-warn-500')} />
                {CAR_PARTS[key]?.label}
                <ChevronRight className="h-3 w-3 opacity-60" />
              </button>
            ))}
          </div>
        )}

        {/* Bottom hint */}
        {!selectedPart && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass border border-sky-blueprint/25 text-ink-black text-xs px-4 py-2 rounded-full flex items-center gap-2 pointer-events-none">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" style={{ animation: 'pulse-ring 2.4s ease-out infinite' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            Haz clic en una parte del coche
          </div>
        )}

        {/* Quick parts (mobile) */}
        {!selectedPart && (
          <div className="md:hidden absolute bottom-20 inset-x-3 flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {interactiveParts.slice(0, 6).map(([key, part]) => {
              const sev = partSeverityMap[key];
              return (
                <button
                  key={key}
                  onClick={() => handlePartClick(key)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur transition-all',
                    sev === 'high'
                      ? 'bg-danger-500/15 border-danger-500/40 text-danger-400'
                      : sev === 'medium'
                      ? 'bg-warn-500/15 border-warn-500/40 text-warn-400'
                      : 'bg-cloud-white/70 border-sky-blueprint/25 text-ink-black',
                  )}
                >
                  <Wrench className="h-3 w-3" />
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
