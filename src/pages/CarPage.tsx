import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, RotateCcw, Maximize2, Minimize2, AlertTriangle, Gauge,
} from 'lucide-react';
import { CarViewer } from '../components/3d/CarViewer';
import { PartInfoOverlay } from '../components/3d/PartInfoOverlay';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { useVehicleStore } from '../store/vehicleStore';
import { useMaintenance } from '../hooks/useMaintenance';
import { useVehicle } from '../hooks/useVehicle';
import { calculateAlerts } from '../utils/calculations';
import { formatKm } from '../utils/formatters';
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

  useEffect(() => {
    if (!selectedVehicle) {
      navigate('/dashboard');
      return;
    }
    fetchRecords();
  }, [selectedVehicle?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPart) setSelectedPart(null);
        else if (immersive) setImmersive(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedPart, immersive]);

  if (!selectedVehicle) return null;

  const alerts = useMemo(
    () => calculateAlerts(selectedVehicle, records),
    [selectedVehicle, records],
  );

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

  const vehicleTitle =
    `${selectedVehicle.brand ?? ''} ${selectedVehicle.model ?? ''}`.trim() || 'Vehículo';
  const plate = selectedVehicle.license_plate ?? '—';

  return (
    <div
      className={cn(
        'flex flex-col',
        immersive ? 'h-[100vh] fixed inset-0 z-50' : 'h-[calc(100vh-4rem)]',
      )}
      style={{
        background: '#f5f5f7',
        fontFamily: 'Inter, var(--font-sf-pro-text)',
        color: '#1d1d1f',
      }}
    >
      {/* ── Top status bar — Apple-style hero header ────────────────────── */}
      <div
        className="relative z-20 mx-4 sm:mx-6 mt-4 px-7 py-6 flex items-center justify-between gap-6"
        style={{
          borderRadius: 28,
          background: '#ffffff',
          border: '1px solid #e8e8ed',
        }}
      >
        <div className="flex items-center gap-5 min-w-0 flex-1">
          <span
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: '#1d1d1f', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Gauge size={26} strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex flex-col gap-1">
            <div
              className="text-[10px] tracking-[0.2em] uppercase flex items-center gap-2"
              style={{ color: '#707070', fontFamily: 'var(--font-mono)' }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 7, height: 7, background: '#1cb05c',
                  boxShadow: '0 0 0 4px rgba(28,176,92,0.18)',
                }}
              />
              Vehículo registrado
            </div>
            <div
              className="truncate font-semibold leading-[1.05]"
              style={{
                color: '#1d1d1f',
                fontSize: 'clamp(28px, 3.6vw, 40px)',
                letterSpacing: '-0.8px',
                fontFamily: 'Inter, var(--font-sf-pro-display)',
              }}
            >
              {vehicleTitle}
            </div>
            <div
              className="text-[14px] flex items-center gap-2 flex-wrap"
              style={{ color: '#707070', fontWeight: 400 }}
            >
              <span>{selectedVehicle.year}</span>
              <span style={{ color: '#d2d2d7' }}>·</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{plate}</span>
              <span style={{ color: '#d2d2d7' }}>·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Gauge size={13} strokeWidth={1.6} />
                {formatKm(selectedVehicle.current_km)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {alerts.length > 0 && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                background: '#fff1ea',
                color: '#b64400',
                border: '1px solid #f4cdb6',
              }}
            >
              <AlertTriangle size={12} strokeWidth={2.2} />
              {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
            </span>
          )}

          <button
            onClick={() => setAutoRotate((s) => !s)}
            title={autoRotate ? 'Detener rotación' : 'Rotación automática'}
            className="h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors"
            style={{
              background: autoRotate ? '#1d1d1f' : '#fff',
              color: autoRotate ? '#fff' : '#1d1d1f',
              border: `1px solid ${autoRotate ? '#1d1d1f' : '#e8e8ed'}`,
            }}
          >
            <RotateCcw
              size={15}
              strokeWidth={1.6}
              className={autoRotate ? 'animate-spin' : ''}
              style={{ animationDuration: '4s' }}
            />
          </button>

          <button
            onClick={() => setImmersive((s) => !s)}
            title={immersive ? 'Salir de inmersivo' : 'Modo inmersivo'}
            className="h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors"
            style={{
              background: '#fff',
              color: '#1d1d1f',
              border: '1px solid #e8e8ed',
            }}
          >
            {immersive
              ? <Minimize2 size={15} strokeWidth={1.6} />
              : <Maximize2 size={15} strokeWidth={1.6} />}
          </button>

          <button
            onClick={() => { setPrefilledType(''); setShowMaintenanceForm(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium rounded-full transition-colors"
            style={{
              background: '#1d1d1f',
              color: '#fff',
              letterSpacing: '-0.1px',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#000'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1d1d1f'; }}
          >
            <Plus size={15} strokeWidth={2.2} />
            Añadir
          </button>
        </div>
      </div>

      {/* ── Stage card with 3D viewer ────────────────────────────────────── */}
      <div className="relative flex-1 mx-4 sm:mx-6 my-4 overflow-hidden"
        style={{
          background: '#ffffff',
          borderRadius: 28,
          border: '1px solid #e8e8ed',
        }}
      >
        <div className="absolute inset-0">
          <CarViewer
            onPartClick={(k) => setSelectedPart(k)}
            autoRotate={autoRotate}
            modelUrl="/models/ford_focus.glb"
          />
        </div>

        {/* Hint — only when nothing is selected */}
        {!selectedPart && (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full pointer-events-none flex items-center gap-2 text-[12px] font-medium"
            style={{
              background: '#ffffff',
              border: '1px solid #e8e8ed',
              color: '#474747',
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 6, height: 6, background: '#0071e3',
                boxShadow: '0 0 0 4px rgba(0,113,227,0.18)',
              }}
            />
            Haz clic en una pieza para ver sus detalles
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
