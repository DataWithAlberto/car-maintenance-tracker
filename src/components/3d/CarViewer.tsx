import { Component, Suspense, useRef, useState, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { CAR_PARTS } from '../../utils/constants';

// Preload the model so it's in cache before the component mounts.
// Wrapped in try/catch so a parse/network failure here doesn't crash the
// module's top-level execution (which would take down the whole app chunk).
try {
  useGLTF.preload('/models/ford_focus.glb');
} catch (err) {
  console.warn('[CarViewer] GLTF preload failed:', err);
}

// ─── Error boundary ──────────────────────────────────────────────────────────
// useGLTF throws on network/parse failure. <Suspense> only catches the
// suspension promise, not the eventual reject. Without this, a failed GLB
// load tears down the entire Canvas and the user sees nothing.
interface GLTFBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (err: unknown) => void;
}
interface GLTFBoundaryState { failed: boolean; }

class GLTFErrorBoundary extends Component<GLTFBoundaryProps, GLTFBoundaryState> {
  state: GLTFBoundaryState = { failed: false };
  static getDerivedStateFromError(): GLTFBoundaryState { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CarViewer] GLTF render error:', error, info);
    this.props.onError?.(error);
    // Drop the cached failure so a future retry (if URL changes) can succeed.
    try { useGLTF.clear('/models/ford_focus.glb'); } catch { /* ignore */ }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface PartClickInfo {
  partKey: string;
  position: [number, number, number];
}

// ─── Procedural fallback (cajas) ─────────────────────────────────────────────
const CAR_PART_MESHES: Record<string, { position: [number, number, number]; size: [number, number, number]; color: string }> = {
  engine: { position: [0, 0.3, 1.2], size: [1.0, 0.5, 0.8], color: '#4a4a6a' },
  tires_front_left: { position: [-0.95, -0.3, 1.0], size: [0.25, 0.5, 0.5], color: '#1a1a1a' },
  tires_front_right: { position: [0.95, -0.3, 1.0], size: [0.25, 0.5, 0.5], color: '#1a1a1a' },
  tires_rear_left: { position: [-0.95, -0.3, -1.0], size: [0.25, 0.5, 0.5], color: '#1a1a1a' },
  tires_rear_right: { position: [0.95, -0.3, -1.0], size: [0.25, 0.5, 0.5], color: '#1a1a1a' },
  brakes_front: { position: [0, -0.15, 1.0], size: [1.6, 0.15, 0.2], color: '#c0392b' },
  brakes_rear: { position: [0, -0.15, -1.0], size: [1.6, 0.15, 0.2], color: '#c0392b' },
  battery: { position: [0.4, 0.1, 1.0], size: [0.3, 0.25, 0.4], color: '#2563eb' },
  suspension: { position: [0, -0.1, 0], size: [1.8, 0.1, 2.4], color: '#6b7280' },
};

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

// GLTFCarSafe: wraps GLTFCar + catches load errors, falls back to procedural
const GLTFCarSafe = ({ url, onPartClick, onError }: GLTFCarProps) => {
  const [failed, setFailed] = useState(false);

  if (failed) return <ProceduralCar onPartClick={onPartClick} />;

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
  const cloned = useRef<THREE.Group>(scene.clone(true));

  useEffect(() => {
    if (!scene) {
      const err = new Error(`Scene is null after loading "${url}"`);
      console.error('[CarViewer]', err);
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
        object={cloned.current}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      {hovered && CAR_PARTS[hovered] && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-cloud-white border border-sky-blueprint/40 shadow-card font-manrope text-caption text-ink-black px-3 py-1.5 rounded-card whitespace-nowrap pointer-events-none">
            {CAR_PARTS[hovered].label}
          </div>
        </Html>
      )}
    </Center>
  );
};

// ─── Procedural fallback ─────────────────────────────────────────────────────
const ProceduralCar = ({ onPartClick }: { onPartClick: (info: PartClickInfo) => void }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.9, 0.5, 4.2]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.65, -0.1]} castShadow>
        <boxGeometry args={[1.7, 0.6, 2.4]} />
        <meshStandardMaterial color="#1a3050" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 0.7, 0.9]} rotation={[0.35, 0, 0]}>
        <planeGeometry args={[1.5, 0.7]} />
        <meshStandardMaterial color="#88bbdd" transparent opacity={0.4} />
      </mesh>
      {/* Rear window */}
      <mesh position={[0, 0.7, -1.1]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[1.5, 0.55]} />
        <meshStandardMaterial color="#88bbdd" transparent opacity={0.4} />
      </mesh>
      {/* Headlights */}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.2, 2.1]}>
          <boxGeometry args={[0.45, 0.2, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Taillights */}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.2, -2.1]}>
          <boxGeometry args={[0.45, 0.2, 0.05]} />
          <meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Clickable parts */}
      {Object.entries(CAR_PART_MESHES).map(([key, { position, size, color }]) => (
        <mesh
          key={key}
          position={position}
          onPointerOver={() => setHovered(key)}
          onPointerOut={() => setHovered(null)}
          onClick={(e) => { e.stopPropagation(); onPartClick({ partKey: key, position }); }}
          castShadow
        >
          <boxGeometry args={size} />
          <meshStandardMaterial
            color={hovered === key ? '#0071e3' : color}
            transparent opacity={hovered === key ? 0.85 : 0.7}
            metalness={0.3} roughness={0.6}
          />
          {hovered === key && (
            <Html distanceFactor={8} position={[0, (size[1] / 2) + 0.3, 0]}>
              <div className="bg-cloud-white font-manrope text-caption text-ink-black px-2 py-1 rounded-card border border-sky-blueprint/40 shadow-subtle whitespace-nowrap pointer-events-none">
                {CAR_PARTS[key]?.label}
              </div>
            </Html>
          )}
        </mesh>
      ))}
    </group>
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

// ─── Main export ──────────────────────────────────────────────────────────────
interface CarViewerProps {
  onPartClick?: (partKey: string) => void;
  autoRotate?: boolean;
  modelUrl?: string; // e.g. '/models/ford_focus.glb'
}

export const CarViewer = ({ onPartClick, autoRotate = false, modelUrl }: CarViewerProps) => {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [loadError, setLoadError]       = useState(false);
  // urlAvailable: null = checking, true = HEAD succeeded, false = unreachable
  const [urlAvailable, setUrlAvailable] = useState<boolean | null>(modelUrl ? null : false);
  const controlsRef = useRef<{ autoRotate: boolean }>(null);

  // HEAD-check the model URL so we never even attempt useGLTF on a 404 etc.
  useEffect(() => {
    if (!modelUrl) { setUrlAvailable(false); return; }
    let cancelled = false;
    // 10s timeout — anything slower we treat as unavailable to avoid a
    // half-loaded canvas hanging forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    fetch(modelUrl, { method: 'HEAD', signal: controller.signal })
      .then((r) => {
        if (cancelled) return;
        if (!r.ok) {
          console.warn(`[CarViewer] HEAD ${modelUrl} returned ${r.status}`);
          setUrlAvailable(false);
        } else {
          setUrlAvailable(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(`[CarViewer] HEAD ${modelUrl} failed:`, err);
        setUrlAvailable(false);
      })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
  }, [modelUrl]);

  const handlePartClick = (info: PartClickInfo) => {
    setSelectedPart(info.partKey);
    onPartClick?.(info.partKey);
  };

  const handleGLTFError = (url: string, err: unknown) => {
    console.error(`[CarViewer] Failed to load model "${url}":`, err);
    setLoadError(true);
  };

  const useGLTF3D = modelUrl && urlAvailable === true && !loadError;
  const proceduralFallback = <ProceduralCar onPartClick={handlePartClick} />;

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [4, 2.5, 6], fov: 42 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow
          shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} />
        <pointLight position={[0, 6, 0]} intensity={0.4} />

        <Suspense fallback={proceduralFallback}>
          {useGLTF3D ? (
            <GLTFErrorBoundary
              fallback={proceduralFallback}
              onError={(e) => handleGLTFError(modelUrl!, e)}
            >
              <GLTFCarSafe
                url={modelUrl!}
                onPartClick={handlePartClick}
                onError={handleGLTFError}
              />
            </GLTFErrorBoundary>
          ) : (
            proceduralFallback
          )}
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
        <div className="absolute top-4 left-4 bg-cloud-white border border-sky-blueprint/25 text-sky-dark font-manrope text-caption px-3 py-1.5 rounded-card shadow-subtle">
          {CAR_PARTS[selectedPart]?.label ?? selectedPart}
        </div>
      )}

      {/* Soft progress chip while the high-res model streams in */}
      {urlAvailable === true && !loadError && (
        <SuspenseBadge />
      )}
    </div>
  );
};

// ─── SuspenseBadge ────────────────────────────────────────────────────────
// Small "Cargando modelo" chip shown for the first ~1.5s while useGLTF
// streams the GLB. Auto-hides itself after a short delay so it doesn't
// linger once the swap-in happens. Sits OUTSIDE the Canvas so it can use
// plain DOM.
const SuspenseBadge = () => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div
      className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] pointer-events-none"
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid #e8e8ed',
        color: '#707070',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6, height: 6, background: '#0071e3',
          animation: 'pulse-ring 1.4s ease-in-out infinite',
        }}
      />
      Cargando modelo…
    </div>
  );
};
