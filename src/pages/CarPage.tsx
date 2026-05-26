import { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, Gauge } from 'lucide-react';
const CarViewer = lazy(() =>
  import('../components/3d/CarViewer').then((m) => ({ default: m.CarViewer })),
);

// Resolución del modelo 3D para CarPage:
//   1) Primero intenta el modelo profesional ST-Line 2023 (definitivo).
//   2) Si no existe todavía, cae al genérico ya incluido en /public/models —
//      no es procedural: es un .glb real (Ford Focus, Sketchfab) que mantiene
//      operativa la click-detection sobre piezas para el flujo de mantenimiento.
//   3) Si tampoco existe, CarViewer mostrará el fallback elegante en DOM.
const PRIMARY_MODEL = '/models/ford-focus-st-line-2023.glb';
const FALLBACK_MODEL = '/models/ford_focus.glb';

async function resolveModelUrl(): Promise<string | undefined> {
  const head = async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const isHtml = (res.headers.get('content-type') ?? '').includes('text/html');
      return res.ok && !isHtml;
    } catch {
      return false;
    }
  };
  if (await head(PRIMARY_MODEL)) return PRIMARY_MODEL;
  if (await head(FALLBACK_MODEL)) return FALLBACK_MODEL;
  return undefined;
}
import { PartInfoOverlay } from '../components/3d/PartInfoOverlay';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { Button } from '../components/ui/Button';
import { useVehicleStore } from '../store/vehicleStore';
import { useMaintenance } from '../hooks/useMaintenance';
import { useVehicle } from '../hooks/useVehicle';
import { calculateAlerts } from '../utils/calculations';
import { formatKm } from '../utils/formatters';
import { CAR_PARTS } from '../utils/constants';
import type { PartAlert } from '../types/obd2Mapping';
import toast from 'react-hot-toast';

export const CarPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { records, fetchRecords, createRecord } = useMaintenance(selectedVehicle?.id);
  const { updateVehicle } = useVehicle();
  const navigate = useNavigate();

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [prefilledType, setPrefilledType] = useState('');
  const [prefilledDescription, setPrefilledDescription] = useState('');
  const [modelUrl, setModelUrl] = useState<string | undefined>(undefined);
  const [modelResolved, setModelResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveModelUrl().then((url) => {
      if (cancelled) return;
      setModelUrl(url);
      setModelResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const alerts = useMemo(
    () => (selectedVehicle ? calculateAlerts(selectedVehicle, records) : []),
    [selectedVehicle, records],
  );

  // Map part keys → severity (highest)
  const partSeverityMap = useMemo(() => {
    const map: Record<string, 'high' | 'medium' | 'low'> = {};
    if (!selectedVehicle) return map;
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

  if (!selectedVehicle) return null;

  // Cuando el click viene de una pieza con alerta OBD2 activa, abrimos el
  // formulario directamente con el tipo y la descripción sugeridos por el DTC
  // de mayor prioridad — saltándonos el overlay de historial.
  const handlePartClick = (partKey: string, alert?: PartAlert) => {
    if (alert && alert.triggers.length > 0) {
      const primary = alert.triggers.find((t) => t.severity === 'critical') ?? alert.triggers[0];
      setPrefilledType(primary.suggestedMaintenanceType);
      setPrefilledDescription(`[${primary.code}] ${primary.description}`);
      setShowMaintenanceForm(true);
      return;
    }
    setSelectedPart(partKey);
  };

  const handleAddMaintenance = (type: string) => {
    setPrefilledType(type);
    setPrefilledDescription('');
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

  return (
    <div className="px-6 sm:px-10 py-10">
      {/* ── Editorial header ── */}
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
            Vista general.
          </h1>
          <p
            className="font-text text-graphite mt-3 flex items-center gap-2 flex-wrap"
            style={{ fontSize: 17, lineHeight: 1.45, letterSpacing: '-0.1px' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="h-4 w-4" strokeWidth={1.6} />
              <span className="text-ink font-medium tabular-nums">
                {formatKm(selectedVehicle.current_km)}
              </span>
            </span>
            {alerts.length > 0 && (
              <>
                <span className="text-silver-mist">·</span>
                <span className="inline-flex items-center gap-1.5" style={{ color: '#b64400' }}>
                  <AlertTriangle className="h-4 w-4" strokeWidth={1.6} />
                  <span className="font-medium tabular-nums">{alerts.length}</span>{' '}
                  {alerts.length === 1 ? 'alerta' : 'alertas'}
                </span>
              </>
            )}
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => {
            setPrefilledType('');
            setPrefilledDescription('');
            setShowMaintenanceForm(true);
          }}
          iconLeft={<Plus className="h-4 w-4" strokeWidth={1.8} />}
        >
          Añadir
        </Button>
      </header>

      {/* ── 3D Viewer (clean, minimal) ── */}
      <div
        className="relative rounded-[28px] overflow-hidden border border-silver-mist"
        style={{ height: 'min(70vh, 600px)', background: 'var(--color-fog)' }}
      >
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-full border border-silver-mist" />
                <div className="absolute inset-0 rounded-full border border-transparent border-t-ink animate-spin" />
              </div>
            </div>
          }
        >
          {modelResolved && (
            <CarViewer onPartClick={handlePartClick} autoRotate={false} modelUrl={modelUrl} />
          )}
        </Suspense>

        {/* Alerts indicator — very subtle, top left */}
        {!selectedPart && alerts.length > 0 && (
          <button
            onClick={() => {
              const first = Object.entries(partSeverityMap)[0];
              if (first) handlePartClick(first[0]);
            }}
            className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 h-9 rounded-full bg-snow/90 border border-silver-mist hover:bg-snow transition-colors"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-60"
                style={{ background: '#b64400', animation: 'pulse-ring 2.4s ease-out infinite' }}
              />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: '#b64400' }}
              />
            </span>
            <span className="font-text font-medium text-ink tabular-nums" style={{ fontSize: 13 }}>
              {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
            </span>
          </button>
        )}
      </div>

      {selectedPart &&
        createPortal(
          <PartInfoOverlay
            partKey={selectedPart}
            records={records}
            onClose={() => setSelectedPart(null)}
            onAddMaintenance={handleAddMaintenance}
          />,
          document.body,
        )}

      {showMaintenanceForm && (
        <MaintenanceForm
          initialType={prefilledType}
          initialDescription={prefilledDescription || undefined}
          currentKm={selectedVehicle.current_km}
          onSubmit={handleCreateRecord}
          onClose={() => setShowMaintenanceForm(false)}
        />
      )}
    </div>
  );
};
