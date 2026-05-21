import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { CAR_PARTS } from '../../utils/constants';

// Preload of the model is now delegated to CarPage (resolveModelUrl) so that
// the right .glb — profesional o genérico — entra en caché solo cuando se
// haya verificado que existe. Mantener un preload fijo aquí descargaba un
// archivo que podía no existir.

interface PartClickInfo {
  partKey: string;
  position: [number, number, number];
}

// Map mesh name prefixes → part keys for ford_focus.glb (Sketchfab)
// Mesh names from GLB (lowercased): TIRE_LF_rubber_0, WHEEL_RF_chrome_0, etc.
// Strategy: exact prefix match first, then substring fallback.
const MESH_PART_MAP: Record<string, string> = {
  // ── Tyres (rubber meshes) ──────────────────────────────────────────────────
  'tire_lf': 'tires_front_left',
  'tire_rf': 'tires_front_right',
  'tire_lr': 'tires_rear_left',
  'tire_rr': 'tires_rear_right',

  // ── Lug nuts (chrome accent on wheels) ───────────────────────────────────
  'lugs_lf': 'tires_front_left',
  'lugs_rf': 'tires_front_right',
  'lugs_lr': 'tires_rear_left',
  'lugs_rr': 'tires_rear_right',

  // ── Wheels / rims ─────────────────────────────────────────────────────────
  'wheel_lf': 'tires_front_left',
  'wheel_rf': 'tires_front_right',
  'wheel_lr': 'tires_rear_left',
  'wheel_rr': 'tires_rear_right',

  // ── Body panels → engine area ─────────────────────────────────────────────
  'body':   'engine',
  'bod2':   'engine',
  'cowl':   'engine',    // firewall / front cowl
  'fin':    'engine',    // front panel

  // ── Lights → brake system ─────────────────────────────────────────────────
  'braklght': 'brakes_rear',
  'hedlght':  'brakes_front',
  'hlght_tr': 'brakes_rear',
  'revlght':  'brakes_rear',
  'foglight': 'brakes_front',

  // ── Misc panels / trim → suspension (floor/underbody) ────────────────────
  'under':    'suspension',
  'whlwells': 'suspension',
  'rbbrtrim': 'suspension',
  'rbbrtrm2': 'suspension',

  // ── Chrome / badge → battery (bonnet area) ───────────────────────────────
  'chrome':   'battery',
  'badge':    'battery',
  'badge2':   'battery',
  'badge_fa': 'battery',

  // ── Generic fallbacks (any model) ────────────────────────────────────────
  tire:       'tires_front_left',
  wheel:      'tires_front_left',
  rim:        'tires_front_left',
  engine:     'engine',
  hood:       'engine',
  bonnet:     'engine',
  brake:      'brakes_front',
  disk:       'brakes_front',
  caliper:    'brakes_front',
  battery:    'battery',
  suspension: 'suspension',
};

const guessPartFromMesh = (name: string): string | null => {
  const lower = name.toLowerCase();
  // Exact match first, then substring
  for (const [key, partKey] of Object.entries(MESH_PART_MAP)) {
    if (lower === key) return partKey;
  }
  for (const [key, partKey] of Object.entries(MESH_PART_MAP)) {
    if (lower.includes(key)) return partKey;
  }
  return null;
};

// ─── GLTF Model ──────────────────────────────────────────────────────────────
interface GLTFCarProps {
  url: string;
  onPartClick: (info: PartClickInfo) => void;
  onError?: (url: string, err: unknown) => void;
}

// GLTFCarSafe: envuelve GLTFCar y, ante un fallo de carga, no devuelve nada
// dentro del Canvas — el componente padre (CarViewer) muestra el fallback
// elegante en DOM. No se usa ya ningún coche de primitivas como sustituto.
const GLTFCarSafe = ({ url, onPartClick, onError }: GLTFCarProps) => {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <GLTFCar
      url={url}
      onPartClick={onPartClick}
      onError={(u, err) => { setFailed(true); onError?.(u, err); }}
    />
  );
};

const GLTFCar = ({ url, onPartClick, onError }: GLTFCarProps) => {
  // useGLTF will throw/suspend on network error — caught by Suspense or ErrorBoundary.
  // We also add a runtime guard via useEffect.
  const { scene } = useGLTF(url);
  const [hovered, setHovered] = useState<string | null>(null);
  // Clone once per loaded scene — never during every render.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    if (!scene) {
      const err = new Error(`Scene is null after loading "${url}"`);
      if (import.meta.env.DEV) console.error('[CarViewer]', err);
      onError?.(url, err);
    }
  }, [scene, url, onError]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const part = guessPartFromMesh((e.object as THREE.Mesh).name);
    if (part) setHovered(part);
  };

  const handlePointerOut = () => setHovered(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const part = guessPartFromMesh((e.object as THREE.Mesh).name);
    if (part) {
      const p = e.point;
      onPartClick({ partKey: part, position: [p.x, p.y, p.z] });
    }
  };

  return (
    <Center>
      <primitive
        object={cloned}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      {hovered && CAR_PARTS[hovered] && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-snow border border-silver-mist font-text font-medium text-ink px-3 py-1.5 rounded-full whitespace-nowrap pointer-events-none" style={{ fontSize: 13 }}>
            {CAR_PARTS[hovered].label}
          </div>
        </Html>
      )}
    </Center>
  );
};

// ─── Loader placeholder ───────────────────────────────────────────────────────
const CarLoader = () => (
  <Html center>
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 border-r-blue-400 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-lime-300/70 animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
      </div>
      <div className="text-center">
        <p className="text-ink-black text-sm font-medium">Cargando modelo 3D</p>
        <p className="text-ink-charcoal text-xs mt-1">Preparando tu Ford Focus...</p>
      </div>
    </div>
  </Html>
);

// ─── Error boundary wrapper for GLTF ─────────────────────────────────────────
// useGLTF throws on 404/parse error, caught by Suspense error boundary.
// We implement a simple error fallback via state hoisted to CarViewer.

// ─── Fallback elegante explicativo ──────────────────────────────────────────
// Sustituye la maqueta procedural anterior. NO inventa el coche con
// primitivas: muestra una foto de referencia + instrucciones claras para
// añadir el modelo .glb profesional.
const ModelMissingFallback = ({ url, variant }: { url: string; variant: 'missing' | 'error' }) => (
  <div className="absolute inset-0 flex flex-col">
    <div className="relative flex-1 min-h-0">
      <img
        src="/ford-focus.png"
        alt="Ford Focus ST-Line — foto de referencia"
        draggable={false}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: 'contain',
          padding: 'clamp(14px, 3.5vw, 40px)',
          filter: 'drop-shadow(0 18px 38px rgba(0,0,0,0.22))',
        }}
      />
      <div
        className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-silver-mist"
        style={{
          background: 'var(--surface-frosted-control, rgba(255,255,255,0.7))',
          backdropFilter: 'blur(20px)',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
          letterSpacing: '0.1em', color: 'var(--color-graphite)',
        }}
      >
        VISTA PREVIA · REFERENCIA
      </div>
    </div>
    <div
      className="shrink-0 border-t border-silver-mist bg-snow"
      style={{ padding: 'clamp(14px, 2.4vw, 22px)' }}
    >
      <div className="inline-flex items-center gap-2 mb-1.5">
        <span
          className="inline-block rounded-full"
          style={{
            width: 7, height: 7,
            background: variant === 'error' ? 'var(--color-caution, #b64400)' : 'var(--color-azure, #0071e3)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em',
            color: 'var(--color-graphite)', textTransform: 'uppercase',
          }}
        >
          {variant === 'error' ? 'Error al cargar el modelo' : 'Modelo 3D no disponible'}
        </span>
      </div>
      <p
        className="font-text text-slate m-0"
        style={{ fontSize: 13.5, lineHeight: 1.5, maxWidth: 620 }}
      >
        Coloca un modelo profesional en{' '}
        <code
          style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.86em',
            background: 'var(--color-silver-mist)', color: 'var(--color-ink)',
            padding: '1px 6px', borderRadius: 6,
          }}
        >
          {url}
        </code>{' '}
        para activar el visor interactivo. La click-detection sobre piezas
        funcionará automáticamente al cargar el .glb.
      </p>
    </div>
  </div>
);

// ─── Main export ──────────────────────────────────────────────────────────────
interface CarViewerProps {
  onPartClick?: (partKey: string) => void;
  autoRotate?: boolean;
  modelUrl?: string; // e.g. '/models/ford-focus-st-line-2023.glb'
}

export const CarViewer = ({ onPartClick, autoRotate = false, modelUrl }: CarViewerProps) => {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [loadError, setLoadError]       = useState(false);
  const controlsRef = useRef<{ autoRotate: boolean }>(null);

  const handlePartClick = (info: PartClickInfo) => {
    setSelectedPart(info.partKey);
    onPartClick?.(info.partKey);
  };

  const handleGLTFError = (url: string, err: unknown) => {
    if (import.meta.env.DEV) console.error(`[CarViewer] Failed to load model "${url}":`, err);
    setLoadError(true);
  };

  // Sin modelo o con error: fallback explicativo en DOM (no maqueta procedural).
  if (!modelUrl || loadError) {
    return (
      <div className="w-full h-full relative">
        <ModelMissingFallback
          url={modelUrl ?? '/models/ford-focus-st-line-2023.glb'}
          variant={loadError ? 'error' : 'missing'}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [4, 2.5, 6], fov: 42 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow
          shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} />
        <pointLight position={[0, 6, 0]} intensity={0.4} />

        <Suspense fallback={<CarLoader />}>
          <GLTFCarSafe
            url={modelUrl}
            onPartClick={handlePartClick}
            onError={handleGLTFError}
          />
          <ContactShadows position={[0, -0.8, 0]} opacity={0.5} scale={12} blur={2} />
          <Environment preset="city" />
        </Suspense>

        <OrbitControls
          ref={controlsRef as React.RefObject<React.ComponentRef<typeof OrbitControls>>}
          autoRotate={autoRotate && !selectedPart}
          autoRotateSpeed={1.5}
          enablePan={false}
          minDistance={3}
          maxDistance={12}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>

      {selectedPart && (
        <div className="absolute top-4 left-4 bg-snow border border-silver-mist text-ink font-text font-medium px-3 py-1.5 rounded-full" style={{ fontSize: 13 }}>
          {CAR_PARTS[selectedPart]?.label ?? selectedPart}
        </div>
      )}
    </div>
  );
};
