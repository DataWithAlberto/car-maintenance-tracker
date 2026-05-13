import { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, RotateCcw, Maximize2, Minimize2, AlertTriangle, Gauge,
} from 'lucide-react';
const CarViewer = lazy(() =>
  import('../components/3d/CarViewer').then((m) => ({ default: m.CarViewer })),
);
import { PartInfoOverlay } from '../components/3d/PartInfoOverlay';
import { MaintenanceForm } from '../components/maintenance/MaintenanceForm';
import { useVehicleStore } from '../store/vehicleStore';
import { useMaintenance } from '../hooks/useMaintenance';
import { useVehicle } from '../hooks/useVehicle';
import { calculateAlerts } from '../utils/calculations';
import { formatKm } from '../utils/formatters';
import { OIL_CHANGE_KM_INTERVAL } from '../utils/constants';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

type SubStatus = 'optimal' | 'pending' | 'warning';

interface Subsystem {
  letter: string;
  key: string;
  label: string;
  status: SubStatus;
  partKey?: string;
  prefilledType?: string;
}

const STATUS_COLOR: Record<SubStatus, string> = {
  optimal: '#1cb05c',
  pending: '#b64400',
  warning: '#c77700',
};

const STATUS_TEXT: Record<SubStatus, string> = {
  optimal: '#1d1d1f',
  pending: '#b64400',
  warning: '#8a5200',
};

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

  // ─── Derived subsystem statuses ────────────────────────────────────────────
  const subsystems = useMemo<Subsystem[]>(() => {
    const km = selectedVehicle.current_km;

    const lastOil = records
      .filter((r) => r.type === 'Cambio de aceite')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const oilStatus: SubStatus = !lastOil
      ? 'pending'
      : km - lastOil.km_at_service > OIL_CHANGE_KM_INTERVAL
        ? 'warning'
        : 'optimal';

    const fromTypes = (types: string[]): SubStatus => {
      const due = records
        .filter((r) => types.includes(r.type) && r.next_service_km)
        .map((r) => (r.next_service_km ?? 0) - km);
      if (due.some((d) => d <= 0)) return 'pending';
      if (due.some((d) => d <= 1500)) return 'warning';
      return 'optimal';
    };

    return [
      { letter: 'A', key: 'engine', label: 'Motor', status: fromTypes(['Filtro de aire', 'Filtro de combustible', 'Bujías', 'Revisión general']), partKey: 'engine' },
      { letter: 'B', key: 'brakes', label: 'Frenos', status: fromTypes(['Frenos delanteros', 'Frenos traseros', 'Líquido de frenos']), partKey: 'brakes_front' },
      { letter: 'C', key: 'oil',    label: 'Aceite', status: oilStatus, prefilledType: 'Cambio de aceite' },
      { letter: 'D', key: 'tires',  label: 'Neumáticos', status: fromTypes(['Neumáticos', 'Alineación y equilibrado']), partKey: 'tires_front_left' },
      { letter: 'E', key: 'susp',   label: 'Suspensión', status: fromTypes(['Suspensión', 'Amortiguadores']), partKey: 'suspension' },
      { letter: 'F', key: 'elec',   label: 'Eléctrico',  status: fromTypes(['Batería']), partKey: 'battery' },
      { letter: 'G', key: 'escape', label: 'Escape',     status: 'optimal' },
    ];
  }, [records, selectedVehicle]);

  const activeSub = subsystems.find((s) => s.status !== 'optimal') ?? subsystems[0];

  const onSubsystemClick = (s: Subsystem) => {
    if (s.partKey) {
      setSelectedPart(s.partKey);
    } else if (s.prefilledType) {
      setPrefilledType(s.prefilledType);
      setShowMaintenanceForm(true);
    }
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

  const engineBlock = useMemo(() => {
    const lastOil = records
      .filter((r) => r.type === 'Cambio de aceite')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const oilLifePct = lastOil
      ? Math.max(
          0,
          Math.min(100, Math.round(
            100 - ((selectedVehicle.current_km - lastOil.km_at_service) / OIL_CHANGE_KM_INTERVAL) * 100,
          )),
        )
      : null;

    return {
      title: selectedVehicle.brand || '—',
      sub: selectedVehicle.model || '',
      fuel: selectedVehicle.fuel_type?.toUpperCase() ?? 'MOTOR',
      kmTotal: formatKm(selectedVehicle.current_km),
      oilPct: oilLifePct == null ? '—' : `${oilLifePct} %`,
      oilState: oilLifePct == null ? 'pending' as const : oilLifePct < 30 ? 'warning' as const : 'optimal' as const,
      records: records.length,
    };
  }, [records, selectedVehicle]);

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
      {/* ── Top status bar ───────────────────────────────────────────────── */}
      <div
        className="relative z-20 mx-4 sm:mx-6 mt-4 px-5 py-3 flex items-center justify-between gap-3"
        style={{
          borderRadius: 999,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid #e8e8ed',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className="inline-block rounded-full shrink-0"
            style={{
              width: 8, height: 8, background: '#1cb05c',
              boxShadow: '0 0 0 4px rgba(28,176,92,0.18)',
            }}
            aria-hidden
          />
          <span
            className="text-[10px] tracking-[0.18em] uppercase shrink-0"
            style={{ color: '#707070', fontFamily: 'var(--font-mono)' }}
          >
            Vehículo registrado
          </span>
          <span
            className="hidden sm:inline-block w-px h-4 shrink-0"
            style={{ background: '#e8e8ed' }}
          />
          {/* NOTE: deliberately not <h1> — global CSS forces 96px on h1 */}
          <span
            className="truncate text-[15px] font-semibold tracking-[-0.2px] min-w-0"
            style={{ color: '#1d1d1f' }}
          >
            {vehicleTitle}
          </span>
          <span
            className="hidden md:inline text-[11px] tracking-[0.08em] shrink-0"
            style={{ color: '#a1a1a6', fontFamily: 'var(--font-mono)' }}
          >
            · {selectedVehicle.year} · {plate}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[12px]"
            style={{ color: '#474747', fontFamily: 'var(--font-mono)' }}
            title="Kilometraje actual"
          >
            <Gauge size={12} strokeWidth={1.8} />
            {formatKm(selectedVehicle.current_km)}
          </span>

          {alerts.length > 0 && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                background: '#fff1ea',
                color: '#b64400',
                border: '1px solid #f4cdb6',
              }}
            >
              <AlertTriangle size={11} strokeWidth={2.2} />
              {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
            </span>
          )}

          <button
            onClick={() => { setPrefilledType(''); setShowMaintenanceForm(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold rounded-full transition-colors"
            style={{
              background: '#0071e3',
              color: '#fff',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#0066cc'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#0071e3'; }}
          >
            <Plus size={13} strokeWidth={2.4} />
            Añadir
          </button>

          <button
            onClick={() => setImmersive((s) => !s)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors"
            style={{
              background: '#fff',
              color: '#1d1d1f',
              border: '1px solid #e8e8ed',
            }}
            title={immersive ? 'Salir de inmersivo' : 'Modo inmersivo'}
          >
            {immersive
              ? <Minimize2 size={14} strokeWidth={1.6} />
              : <Maximize2 size={14} strokeWidth={1.6} />}
          </button>
        </div>
      </div>

      {/* ── Main stage ───────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden mt-3">
        {/* 3D Viewer fills the stage */}
        <div className="absolute inset-0">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border border-[#e8e8ed]" />
                  <div className="absolute inset-0 rounded-full border border-transparent border-t-[#1d1d1f] animate-spin" />
                </div>
                <p className="text-[13px]" style={{ color: '#707070' }}>
                  Cargando modelo 3D…
                </p>
              </div>
            </div>
          }>
            <CarViewer
              onPartClick={(k) => setSelectedPart(k)}
              autoRotate={autoRotate}
              modelUrl="/models/ford_focus.glb"
            />
          </Suspense>
        </div>

        {/* Subsystems panel — top left */}
        <SubsystemsPanel
          items={subsystems}
          activeKey={activeSub?.key}
          onClick={onSubsystemClick}
        />

        {/* Engine spec panel — top right (hidden when PartInfoOverlay is open
            to avoid stacking) */}
        {!selectedPart && (
          <EnginePanel
            data={engineBlock}
            onOpen={() => navigate('/maintenance')}
          />
        )}

        {/* Bottom-left info card */}
        {!selectedPart && (
          <InfoCard subsystem={activeSub} onAction={onSubsystemClick} />
        )}

        {/* Bottom-right controls */}
        <ViewControls
          autoRotate={autoRotate}
          onRotate={() => setAutoRotate((s) => !s)}
        />

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

// ─── SubsystemsPanel ─────────────────────────────────────────────────────────
const SubsystemsPanel = ({
  items, activeKey, onClick,
}: {
  items: Subsystem[];
  activeKey?: string;
  onClick: (s: Subsystem) => void;
}) => (
  <div
    className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 w-[240px] rounded-2xl p-2.5"
    style={{
      background: 'rgba(255,255,255,0.94)',
      border: '1px solid #e8e8ed',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}
  >
    <div
      className="px-3 pt-1.5 pb-2 text-[10px] tracking-[0.2em] uppercase"
      style={{ color: '#a1a1a6', fontFamily: 'var(--font-mono)' }}
    >
      § Subsistemas
    </div>
    <ul className="flex flex-col gap-0.5">
      {items.map((s) => {
        const isActive = s.key === activeKey;
        const dot = STATUS_COLOR[s.status];
        return (
          <li key={s.key}>
            <button
              onClick={() => onClick(s)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left"
              style={{
                background: isActive ? 'rgba(0,113,227,0.08)' : 'transparent',
                border: isActive
                  ? '1px solid rgba(0,113,227,0.25)'
                  : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span
                className="text-[10px] w-4 text-center shrink-0"
                style={{
                  color: isActive ? '#0071e3' : '#a1a1a6',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s.letter}
              </span>
              <span
                className="inline-block rounded-full shrink-0"
                style={{
                  width: 7, height: 7, background: dot,
                  boxShadow: `0 0 0 3px ${dot}22`,
                }}
              />
              <span
                className="flex-1 text-[13px] font-medium"
                style={{ color: STATUS_TEXT[s.status] }}
              >
                {s.label}
              </span>
              {s.status !== 'optimal' && (
                <AlertTriangle
                  size={12}
                  strokeWidth={2}
                  style={{ color: STATUS_COLOR[s.status] }}
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);

// ─── EnginePanel ─────────────────────────────────────────────────────────────
const EnginePanel = ({
  data, onOpen,
}: {
  data: {
    title: string; sub: string; fuel: string; kmTotal: string;
    oilPct: string; oilState: SubStatus; records: number;
  };
  onOpen: () => void;
}) => (
  <div
    className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-[260px] rounded-2xl p-4"
    style={{
      background: 'rgba(255,255,255,0.94)',
      border: '1px solid #e8e8ed',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}
  >
    <div className="flex items-center gap-2 mb-2.5">
      <span
        className="inline-block rounded-full"
        style={{
          width: 7, height: 7, background: '#1cb05c',
          boxShadow: '0 0 0 3px rgba(28,176,92,0.2)',
        }}
      />
      <span
        className="text-[10px] tracking-[0.18em] uppercase"
        style={{ color: '#707070', fontFamily: 'var(--font-mono)' }}
      >
        A · Motor · Óptimo
      </span>
    </div>
    <div
      className="text-[20px] font-semibold leading-tight"
      style={{ letterSpacing: '-0.3px', color: '#1d1d1f' }}
    >
      {data.title}
      {data.sub && (
        <span style={{ color: '#a1a1a6', fontWeight: 400 }}> · {data.sub}</span>
      )}
    </div>

    <div className="grid grid-cols-2 gap-2 mt-3.5">
      {[
        ['Combustible', data.fuel],
        ['Km total',    data.kmTotal],
        ['Aceite',      data.oilPct, data.oilState],
        ['Registros',   String(data.records)],
      ].map(([l, v, state]) => (
        <div
          key={l as string}
          className="rounded-xl px-3 py-2"
          style={{
            background: '#f5f5f7',
            border: '1px solid #ececf0',
          }}
        >
          <div
            className="text-[9.5px] tracking-[0.18em] uppercase"
            style={{ color: '#a1a1a6', fontFamily: 'var(--font-mono)' }}
          >
            {l}
          </div>
          <div
            className="text-[15px] font-semibold mt-0.5"
            style={{
              color: state
                ? STATUS_TEXT[state as SubStatus]
                : '#1d1d1f',
            }}
          >
            {v}
          </div>
        </div>
      ))}
    </div>

    <button
      onClick={onOpen}
      className="mt-3 w-full text-[12px] font-medium px-3 py-2 rounded-full transition-colors"
      style={{
        background: '#1d1d1f',
        color: '#fff',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#000'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1d1d1f'; }}
    >
      Abrir ficha →
    </button>
  </div>
);

// ─── InfoCard ────────────────────────────────────────────────────────────────
const InfoCard = ({
  subsystem, onAction,
}: {
  subsystem?: Subsystem;
  onAction: (s: Subsystem) => void;
}) => {
  if (!subsystem) return null;
  const isOptimal = subsystem.status === 'optimal';
  const color = STATUS_COLOR[subsystem.status];
  const title = isOptimal
    ? `${subsystem.label} en óptimo estado`
    : `${subsystem.label}: mantenimiento pendiente.`;
  const subtitle = isOptimal
    ? 'Sin acciones pendientes.'
    : 'Registra el último realizado.';
  const actionLabel = isOptimal ? 'Ver historial →' : 'Registrar →';

  return (
    <div
      className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-10 w-[280px] rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.94)',
        border: isOptimal ? '1px solid #e8e8ed' : `1px solid ${color}66`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block rounded-full"
          style={{
            width: 7, height: 7, background: color,
            boxShadow: `0 0 0 3px ${color}22`,
          }}
        />
        <span
          className="text-[10px] tracking-[0.2em] uppercase"
          style={{ color: '#707070', fontFamily: 'var(--font-mono)' }}
        >
          Info · {subsystem.label}
        </span>
      </div>
      <div
        className="text-[14px] font-semibold leading-snug"
        style={{ color: '#1d1d1f' }}
      >
        {title}
      </div>
      <div
        className="text-[12.5px] mt-1"
        style={{ color: '#707070' }}
      >
        {subtitle}
      </div>
      <button
        onClick={() => onAction(subsystem)}
        className="mt-3 text-[12px] font-medium"
        style={{ color: isOptimal ? '#0071e3' : color }}
      >
        {actionLabel}
      </button>
    </div>
  );
};

// ─── ViewControls ────────────────────────────────────────────────────────────
const ViewControls = ({
  autoRotate, onRotate,
}: {
  autoRotate: boolean;
  onRotate: () => void;
}) => (
  <div
    className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10 flex items-center gap-1.5 p-1.5 rounded-full"
    style={{
      background: 'rgba(255,255,255,0.94)',
      border: '1px solid #e8e8ed',
      backdropFilter: 'blur(18px)',
    }}
  >
    <span
      className="px-2 text-[10px]"
      style={{ color: '#a1a1a6', fontFamily: 'var(--font-mono)' }}
    >
      Arrastra para girar
    </span>
    <button
      onClick={onRotate}
      title={autoRotate ? 'Detener rotación' : 'Rotar automático'}
      className="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors"
      style={{
        background: autoRotate ? '#0071e3' : '#fff',
        color: autoRotate ? '#fff' : '#1d1d1f',
        border: `1px solid ${autoRotate ? '#0071e3' : '#e8e8ed'}`,
      }}
    >
      <RotateCcw
        size={13}
        strokeWidth={1.8}
        className={autoRotate ? 'animate-spin' : ''}
        style={{ animationDuration: '4s' }}
      />
    </button>
  </div>
);
