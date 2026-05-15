import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { CAR_PARTS } from '../../utils/constants';

// Preload the model so it's in cache before the component mounts
useGLTF.preload('/models/ford_focus.glb');

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
  // Clone once per loaded scene — never during every render.
  const cloned = useMemo(() => scene.clone(true), [scene]);

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
              <div className="bg-snow font-text font-medium text-ink px-2 py-1 rounded-full border border-silver-mist whitespace-nowrap pointer-events-none" style={{ fontSize: 13 }}>
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
  const controlsRef = useRef<{ autoRotate: boolean }>(null);

  const handlePartClick = (info: PartClickInfo) => {
    setSelectedPart(info.partKey);
    onPartClick?.(info.partKey);
  };

  const handleGLTFError = (url: string, err: unknown) => {
    console.error(`[CarViewer] Failed to load model "${url}":`, err);
    setLoadError(true);
  };

  const useGLTF3D = modelUrl && !loadError;

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

        <Suspense fallback={<CarLoader />}>
          {useGLTF3D ? (
            <GLTFCarSafe
              url={modelUrl}
              onPartClick={handlePartClick}
              onError={handleGLTFError}
            />
          ) : (
            <ProceduralCar onPartClick={handlePartClick} />
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
        <div className="absolute top-4 left-4 bg-snow border border-silver-mist text-ink font-text font-medium px-3 py-1.5 rounded-full" style={{ fontSize: 13 }}>
          {CAR_PARTS[selectedPart]?.label ?? selectedPart}
        </div>
      )}

      {loadError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-snow border border-silver-mist font-text px-4 py-2 rounded-full" style={{ fontSize: 13, color: '#b64400' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#b64400' }} />
          Usando modelo procedural — GLTF no disponible
        </div>
      )}
    </div>
  );
};
