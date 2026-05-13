import { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, RotateCcw, Maximize2, Minimize2, AlertTriangle, Minus,
  Contrast,
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
type ViewMode = 'rear' | 'side' | 'top' | '3d';

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
  pending: '#e07a2b',
  warning: '#d4752e',
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
  const [view, setView] = useState<ViewMode>('rear');
  const [zoom, setZoom] = useState(1);
  const [tone, setTone] = useState<'dim' | 'lit'>('dim');

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

  // ─── Derived: subsystem statuses (rolled-up from records / alerts) ─────────
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
      if (due.some((d) => d <= 0)) return 'warning';
      if (due.some((d) => d <= 1500)) return 'pending';
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

  const subsystemByLetter = useMemo(
    () => Object.fromEntries(subsystems.map((s) => [s.letter, s])) as Record<string, Subsystem>,
    [subsystems],
  );

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

  // ─── Engine block — derived stats (placeholders where no telemetry) ───────
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
      label:
        selectedVehicle.fuel_type
          ? `${selectedVehicle.fuel_type.toUpperCase()}`
          : 'MOTOR',
      title: selectedVehicle.brand
        ? `${selectedVehicle.brand}`
        : '—',
      sub: selectedVehicle.model ? `${selectedVehicle.model}` : '',
      temp: '92 °C',
      rpm: '780',
      oil: oilLifePct == null ? '—' : `${oilLifePct} %`,
      battery: '12,4 V',
    };
  }, [records, selectedVehicle]);

  // ─── Vehicle title ─────────────────────────────────────────────────────────
  const vehicleTitle =
    `${selectedVehicle.brand ?? ''} ${selectedVehicle.model ?? ''}`.trim() || 'Vehículo';
  const plate = selectedVehicle.license_plate ?? '—';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'flex flex-col text-white',
        immersive ? 'h-[100vh] fixed inset-0 z-50' : 'h-[calc(100vh-4rem)]',
      )}
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, #0d1018 0%, #07080d 65%, #04050a 100%)',
        fontFamily: 'Inter, var(--font-sf-pro-text)',
      }}
    >
      {/* Subtle technical grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(120,140,200,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,140,200,0.045) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 80%)',
        }}
      />

      {/* ── Top status bar ───────────────────────────────────────────────── */}
      <div
        className="relative z-10 mx-4 sm:mx-6 mt-4 px-5 py-3 flex items-center justify-between gap-3"
        style={{
          borderRadius: 999,
          background: 'rgba(15,18,26,0.82)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
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
            style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}
          >
            Vehículo registrado
          </span>
          <span
            className="hidden sm:inline-block w-px h-4"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />
          <h1
            className="truncate text-[15px] font-semibold tracking-[-0.2px]"
            style={{ color: '#fff' }}
          >
            {vehicleTitle}
          </h1>
          <span
            className="hidden md:inline text-[11px] tracking-[0.08em]"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}
          >
            · {selectedVehicle.year} · {plate}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[12px]"
            style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}
            title="Kilometraje actual"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {formatKm(selectedVehicle.current_km)}
          </span>

          {alerts.length > 0 && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                background: 'rgba(224,122,43,0.18)',
                color: '#ffb685',
                border: '1px solid rgba(224,122,43,0.4)',
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
              background: 'linear-gradient(180deg, #2592ff 0%, #0c6dd9 100%)',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(12,109,217,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            <Plus size={13} strokeWidth={2.4} />
            Añadir
          </button>

          <button
            onClick={() => setImmersive((s) => !s)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
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
      <div className="relative flex-1 overflow-hidden">
        {/* Subsystems panel — top left */}
        <SubsystemsPanel
          items={subsystems}
          activeKey={activeSub?.key}
          onClick={onSubsystemClick}
        />

        {/* Engine spec panel — top right */}
        <EnginePanel
          data={engineBlock}
          onOpen={() => navigate('/maintenance')}
        />

        {/* Centered stage — silhouette + callouts (or 3D) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {view === '3d' ? (
            <div className="absolute inset-0">
              <Suspense fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 rounded-full border border-white/15" />
                      <div className="absolute inset-0 rounded-full border border-transparent border-t-white animate-spin" />
                    </div>
                    <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
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
          ) : (
            <CarSilhouette
              view={view}
              zoom={zoom}
              tone={tone}
              subsystemByLetter={subsystemByLetter}
              onTagClick={(letter) => {
                const s = subsystemByLetter[letter];
                if (s) onSubsystemClick(s);
              }}
            />
          )}
        </div>

        {/* Bottom-left info card */}
        <InfoCard subsystem={activeSub} onAction={onSubsystemClick} />

        {/* Bottom-center view switcher */}
        <ViewSwitcher value={view} onChange={setView} />

        {/* Bottom-right controls */}
        <ViewControls
          zoom={zoom}
          onZoom={(d) => setZoom((z) => Math.max(0.6, Math.min(1.6, z + d)))}
          onTone={() => setTone((t) => (t === 'dim' ? 'lit' : 'dim'))}
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
    className="absolute top-6 left-6 z-10 w-[260px] rounded-2xl p-2.5"
    style={{
      background: 'rgba(15,18,26,0.78)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
    }}
  >
    <div
      className="px-3 pt-1.5 pb-2 text-[10px] tracking-[0.2em] uppercase"
      style={{ color: 'rgba(255,255,255,0.42)', fontFamily: 'var(--font-mono)' }}
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
                background: isActive ? 'rgba(37,146,255,0.16)' : 'transparent',
                border: isActive
                  ? '1px solid rgba(37,146,255,0.45)'
                  : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
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
                  color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s.letter}
              </span>
              <span
                className="inline-block rounded-full shrink-0"
                style={{
                  width: 7, height: 7, background: dot,
                  boxShadow: `0 0 0 3px ${dot}26`,
                }}
              />
              <span
                className="flex-1 text-[13px] font-medium"
                style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.88)' }}
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
  data: { label: string; title: string; sub: string; temp: string; rpm: string; oil: string; battery: string };
  onOpen: () => void;
}) => (
  <div
    className="absolute top-6 right-6 z-10 w-[300px] rounded-2xl p-4"
    style={{
      background: 'rgba(15,18,26,0.78)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
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
        style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}
      >
        A · Motor · Óptimo
      </span>
    </div>
    <div
      className="text-[24px] font-semibold leading-tight"
      style={{ letterSpacing: '-0.4px' }}
    >
      {data.title}
      <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}> · {data.sub || data.label}</span>
    </div>

    <div className="grid grid-cols-2 gap-2 mt-4">
      {[
        ['Temp',    data.temp],
        ['RPM',     data.rpm],
        ['Aceite',  data.oil],
        ['Batería', data.battery],
      ].map(([l, v]) => (
        <div
          key={l}
          className="rounded-xl px-3 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="text-[9.5px] tracking-[0.18em] uppercase"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}
          >
            {l}
          </div>
          <div className="text-[16px] font-semibold mt-0.5" style={{ color: '#fff' }}>
            {v}
          </div>
        </div>
      ))}
    </div>

    <button
      onClick={onOpen}
      className="mt-3 w-full text-[12px] font-medium px-3 py-2.5 rounded-full transition-colors"
      style={{
        background: '#fff',
        color: '#0d1018',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#e8e8ed'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
    >
      Abrir ficha →
    </button>
  </div>
);

// ─── CarSilhouette ───────────────────────────────────────────────────────────
const CarSilhouette = ({
  view, zoom, tone, subsystemByLetter, onTagClick,
}: {
  view: ViewMode;
  zoom: number;
  tone: 'dim' | 'lit';
  subsystemByLetter: Record<string, Subsystem>;
  onTagClick: (letter: string) => void;
}) => {
  const fillBody = tone === 'dim' ? '#10131b' : '#1a2030';
  const stroke = tone === 'dim' ? 'rgba(255,255,255,0.35)' : 'rgba(180,200,255,0.55)';
  const glassFill = tone === 'dim' ? '#06080d' : '#0c1220';

  // Anchor positions per view (% of canvas) — letter → [x, y]
  const anchorsByView: Record<ViewMode, Record<string, [number, number]>> = {
    rear: {
      A: [50, 28],
      B: [22, 60],
      D: [78, 60],
      C: [50, 86],
    },
    side: {
      A: [78, 38],
      B: [78, 70],
      D: [22, 70],
      C: [50, 86],
    },
    top: {
      A: [50, 22],
      B: [22, 50],
      D: [78, 50],
      C: [50, 78],
    },
    '3d': {
      A: [50, 28], B: [22, 60], D: [78, 60], C: [50, 86],
    },
  };

  const anchors = anchorsByView[view];

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{ transform: `scale(${zoom})`, transition: 'transform 240ms ease' }}
    >
      <svg
        viewBox="0 0 1000 600"
        width="min(72vw, 1100px)"
        height="auto"
        style={{ maxHeight: '70vh', overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bodyShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1c2230" />
            <stop offset="55%" stopColor={fillBody} />
            <stop offset="100%" stopColor="#06070b" />
          </linearGradient>
          <radialGradient id="floorGlow" cx="50%" cy="100%" r="60%">
            <stop offset="0%"  stopColor="rgba(80,120,200,0.15)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="taillight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#7a1a1a" />
            <stop offset="100%" stopColor="#3a0808" />
          </linearGradient>
        </defs>

        {/* Floor glow */}
        <ellipse cx="500" cy="540" rx="380" ry="40" fill="url(#floorGlow)" />

        {view === 'rear' && (
          <RearSilhouette stroke={stroke} glass={glassFill} />
        )}
        {view === 'side' && (
          <SideSilhouette stroke={stroke} glass={glassFill} />
        )}
        {view === 'top' && (
          <TopSilhouette stroke={stroke} glass={glassFill} />
        )}
      </svg>

      {/* Annotation chips */}
      {(['A', 'B', 'D', 'C'] as const).map((letter) => {
        const sub = subsystemByLetter[letter];
        if (!sub) return null;
        const [x, y] = anchors[letter] ?? [50, 50];
        const color = STATUS_COLOR[sub.status];
        const isActive = letter === 'A';
        const text =
          letter === 'A'
            ? 'A · Motor — activo'
            : letter === 'C'
              ? 'C · Aceite — cambio pendiente'
              : `${letter} · ${sub.label}`;
        return (
          <button
            key={letter}
            onClick={() => onTagClick(letter)}
            className="absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: isActive
                ? 'linear-gradient(180deg, #2592ff 0%, #0c6dd9 100%)'
                : 'rgba(15,18,26,0.85)',
              color: '#fff',
              border: isActive
                ? '1px solid rgba(255,255,255,0.4)'
                : `1px solid ${sub.status === 'optimal' ? 'rgba(255,255,255,0.18)' : color}`,
              boxShadow: isActive
                ? '0 8px 24px rgba(12,109,217,0.5)'
                : '0 4px 16px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 6, height: 6,
                background: isActive ? '#fff' : color,
                boxShadow: `0 0 0 3px ${isActive ? 'rgba(255,255,255,0.25)' : color + '33'}`,
              }}
            />
            {text}
          </button>
        );
      })}
    </div>
  );
};

// ─── Silhouette variants ─────────────────────────────────────────────────────
const RearSilhouette = ({ stroke, glass }: { stroke: string; glass: string }) => (
  <g>
    {/* Body */}
    <path
      d="M 200 470 Q 200 280 320 240 Q 500 180 680 240 Q 800 280 800 470 L 800 500 Q 800 510 790 510 L 210 510 Q 200 510 200 500 Z"
      fill="url(#bodyShine)"
      stroke={stroke}
      strokeWidth="1.5"
    />
    {/* Rear window */}
    <path
      d="M 320 260 Q 500 210 680 260 L 660 380 Q 500 360 340 380 Z"
      fill={glass}
      stroke={stroke}
      strokeWidth="1"
      opacity="0.85"
    />
    {/* Tail lights */}
    <rect x="240" y="420" width="80" height="36" rx="6" fill="url(#taillight)" stroke={stroke} strokeWidth="0.5" />
    <rect x="680" y="420" width="80" height="36" rx="6" fill="url(#taillight)" stroke={stroke} strokeWidth="0.5" />
    {/* Plate */}
    <rect x="450" y="440" width="100" height="22" rx="3" fill="#2a2d35" stroke={stroke} strokeWidth="0.5" />
    {/* Bumper line */}
    <line x1="220" y1="470" x2="780" y2="470" stroke={stroke} strokeWidth="0.6" opacity="0.5" />
    {/* Wheel arches (subtle shadows beneath) */}
    <ellipse cx="270" cy="510" rx="60" ry="10" fill="rgba(0,0,0,0.6)" />
    <ellipse cx="730" cy="510" rx="60" ry="10" fill="rgba(0,0,0,0.6)" />
  </g>
);

const SideSilhouette = ({ stroke, glass }: { stroke: string; glass: string }) => (
  <g>
    <path
      d="M 100 420 Q 100 360 160 340 L 260 280 Q 320 240 420 235 L 620 235 Q 720 240 780 280 L 860 340 Q 900 350 900 410 L 900 460 Q 900 470 890 470 L 110 470 Q 100 470 100 460 Z"
      fill="url(#bodyShine)"
      stroke={stroke}
      strokeWidth="1.5"
    />
    <path
      d="M 270 290 L 330 250 Q 380 240 470 240 L 530 240 L 540 290 Z M 560 290 L 550 240 L 660 240 Q 720 250 760 290 Z"
      fill={glass}
      stroke={stroke}
      strokeWidth="1"
    />
    <circle cx="250" cy="470" r="55" fill="#0a0d14" stroke={stroke} strokeWidth="1" />
    <circle cx="750" cy="470" r="55" fill="#0a0d14" stroke={stroke} strokeWidth="1" />
    <circle cx="250" cy="470" r="22" fill="#1a1f2c" stroke={stroke} strokeWidth="0.5" />
    <circle cx="750" cy="470" r="22" fill="#1a1f2c" stroke={stroke} strokeWidth="0.5" />
    <line x1="120" y1="430" x2="880" y2="430" stroke={stroke} strokeWidth="0.5" opacity="0.3" />
  </g>
);

const TopSilhouette = ({ stroke, glass }: { stroke: string; glass: string }) => (
  <g>
    <path
      d="M 350 110 Q 500 80 650 110 L 760 280 Q 780 400 760 490 L 650 530 Q 500 555 350 530 L 240 490 Q 220 400 240 280 Z"
      fill="url(#bodyShine)"
      stroke={stroke}
      strokeWidth="1.5"
    />
    <path
      d="M 360 200 Q 500 180 640 200 L 700 290 Q 710 360 700 430 L 640 460 Q 500 480 360 460 L 300 430 Q 290 360 300 290 Z"
      fill={glass}
      stroke={stroke}
      strokeWidth="0.8"
      opacity="0.75"
    />
    <rect x="280" y="150" width="60" height="22" rx="4" fill="#2a2d35" stroke={stroke} strokeWidth="0.5" />
    <rect x="660" y="150" width="60" height="22" rx="4" fill="#2a2d35" stroke={stroke} strokeWidth="0.5" />
  </g>
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
    : `No hay registro de ${subsystem.label.toLowerCase()}.`;
  const subtitle = isOptimal
    ? 'Sin acciones pendientes.'
    : 'Registra el último realizado.';
  const actionLabel = isOptimal ? 'Ver historial →' : 'Registrar →';

  return (
    <div
      className="absolute bottom-6 left-6 z-10 w-[320px] rounded-2xl p-4"
      style={{
        background: 'rgba(15,18,26,0.85)',
        border: `1px solid ${isOptimal ? 'rgba(255,255,255,0.12)' : color + '66'}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px ${isOptimal ? 'transparent' : color + '33'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block rounded-full"
          style={{
            width: 7, height: 7, background: color,
            boxShadow: `0 0 0 3px ${color}26`,
          }}
        />
        <span
          className="text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}
        >
          Info · {subsystem.label}
        </span>
      </div>
      <div className="text-[15px] font-semibold leading-snug" style={{ color: '#fff' }}>
        {title}
      </div>
      <div
        className="text-[12.5px] mt-1"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        {subtitle}
      </div>
      <button
        onClick={() => onAction(subsystem)}
        className="mt-3 text-[12px] font-medium"
        style={{ color: isOptimal ? '#7fb6ff' : '#ffb685' }}
      >
        {actionLabel}
      </button>
    </div>
  );
};

// ─── ViewSwitcher ────────────────────────────────────────────────────────────
const ViewSwitcher = ({
  value, onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) => {
  const items: { id: ViewMode; label: string }[] = [
    { id: 'rear',  label: 'Trasera' },
    { id: 'side', label: 'Lateral' },
    { id: 'top',  label: 'Cenital' },
    { id: '3d',   label: '3D' },
  ];
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1 rounded-full"
      style={{
        background: 'rgba(15,18,26,0.85)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(18px)',
      }}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className="px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
            style={{
              background: active ? '#fff' : 'transparent',
              color: active ? '#0d1018' : 'rgba(255,255,255,0.7)',
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
};

// ─── ViewControls ────────────────────────────────────────────────────────────
const ViewControls = ({
  zoom, onZoom, onTone, autoRotate, onRotate,
}: {
  zoom: number;
  onZoom: (delta: number) => void;
  onTone: () => void;
  autoRotate: boolean;
  onRotate: () => void;
}) => {
  const Btn = ({
    children, onClick, active = false, title,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors"
      style={{
        background: active ? '#fff' : 'rgba(255,255,255,0.06)',
        color: active ? '#0d1018' : 'rgba(255,255,255,0.85)',
        border: active ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {children}
    </button>
  );
  return (
    <div
      className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 p-1.5 rounded-full"
      style={{
        background: 'rgba(15,18,26,0.85)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <Btn onClick={() => onZoom(-0.1)} title="Reducir"><Minus size={13} strokeWidth={2} /></Btn>
      <Btn onClick={onTone} title="Contraste"><Contrast size={13} strokeWidth={1.8} /></Btn>
      <Btn onClick={() => onZoom(0.1)} title="Ampliar"><Plus size={13} strokeWidth={2} /></Btn>
      <Btn onClick={onRotate} active={autoRotate} title="Rotar">
        <RotateCcw size={13} strokeWidth={1.8} className={autoRotate ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} />
      </Btn>
      <span className="px-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
        {Math.round(zoom * 100)}%
      </span>
    </div>
  );
};
