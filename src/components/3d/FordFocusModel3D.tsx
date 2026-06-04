/**
 * FordFocusModel3D
 * ──────────────────────────────────────────────────────────────────────────
 * Visor 3D profesional para un modelo realista de Ford Focus Mk4.5 ST-Line
 * 2023 (hatchback europeo, 5 puertas, plata metalizado).
 *
 * FUENTE DE VERDAD VISUAL: las imágenes de referencia del vehículo. Este
 * componente NO genera geometría procedural ni "inventa" el coche: carga un
 * modelo .glb/.gltf profesional. Si el archivo no existe todavía, muestra un
 * fallback elegante — nunca una maqueta de primitivas presentada como final.
 *
 * ARCHIVO ESPERADO:  /public/models/ford-focus-st-line-2023.glb
 *
 * OPTIMIZACIÓN DEL MODELO (recomendado antes de subir el .glb definitivo):
 *   - Comprimir con Draco o Meshopt + texturas WebP:
 *       npx gltf-transform optimize entrada.glb ford-focus-st-line-2023.glb \
 *         --compress draco --texture-compress webp
 *   - drei `useGLTF` activa el decodificador Draco automáticamente, así que un
 *     .glb comprimido con Draco se carga sin configuración extra.
 *   - Mantener el archivo por debajo de ~5-8 MB para una carga web fluida.
 *
 * NOTA DE FIDELIDAD: este visor solo presenta el modelo. Cualquier detalle
 * visual (llantas, paragolpes, escapes, pilotos…) lo aporta el .glb. Verificar
 * manualmente que el modelo coincide con las imágenes de referencia ST-Line.
 */
import {
  Component, Suspense, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ComponentRef, CSSProperties, ErrorInfo, ReactNode, RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { Box, RotateCcw } from 'lucide-react';

// ─── Configuración ──────────────────────────────────────────────────────────

/**
 * Ruta del modelo 3D profesional. Coloca aquí tu .glb/.gltf realista.
 * Para probar el visor de inmediato con el modelo genérico ya incluido en el
 * proyecto puedes apuntar temporalmente a '/models/ford_focus.glb' — pero
 * verifica antes que coincide con las imágenes de referencia ST-Line; el
 * modelo genérico NO es el resultado final.
 */
const MODEL_URL = '/models/ford-focus-st-line-2023.glb';

/** Foto de referencia (no es el modelo 3D) usada como póster del fallback. */
const POSTER_SRC = '/ford-focus.png';

/**
 * El visor asume que el largo del coche corre sobre el eje Z y que el frontal
 * mira hacia +Z. Si tu .glb viene orientado de otra forma (de lado o de
 * espaldas), ajusta esta rotación en radianes — p. ej. Math.PI / 2.
 * REVISAR MANUALMENTE al integrar el modelo definitivo.
 */
const MODEL_Y_ROTATION = 0;

/**
 * Dimensión (lado más largo) a la que se normaliza el modelo, en unidades de
 * escena. Las cámaras preset están calibradas para este valor — no cambiar
 * sin recalibrar VIEWS.
 */
const TARGET_SIZE = 4;

type ViewKey = 'threeQuarter' | 'front' | 'side' | 'rear';

interface ViewPreset {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

/** Posiciones de cámara preestablecidas (modelo centrado, ~4 u, sobre y=0). */
const VIEWS: Record<ViewKey, ViewPreset> = {
  threeQuarter: { label: '3/4',     position: [4.7, 2.1, 5.4],  target: [0, 0.7, 0] },
  front:        { label: 'Frontal', position: [0.2, 1.35, 7.6], target: [0, 0.65, 0] },
  side:         { label: 'Lateral', position: [8.2, 1.35, 0.1], target: [0, 0.65, 0] },
  rear:         { label: 'Trasera', position: [0, 1.6, -7.7],   target: [0, 0.75, 0] },
};

const DEFAULT_VIEW: ViewKey = 'threeQuarter';

/** Vista actual + contador: el contador permite re-disparar la misma vista. */
interface ViewState { key: ViewKey; nonce: number }

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;

const prefersReducedMotion = () =>
  typeof window !== 'undefined'
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const StudioShadow = ({
  position = [0, 0, 0],
  scale = 7,
  opacity = 0.28,
}: {
  position?: [number, number, number];
  scale?: number;
  opacity?: number;
}) => (
  <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <circleGeometry args={[scale, 64]} />
    <shadowMaterial transparent opacity={opacity} />
  </mesh>
);

// ─── Error boundary: captura fallos de carga/parseo del .glb ────────────────

interface BoundaryProps { children: ReactNode; onError?: () => void }

/**
 * `useGLTF` lanza (throw) ante un 404 o un archivo corrupto. Suspense solo
 * captura promesas, no errores — por eso necesitamos este boundary dentro del
 * Canvas. Al fallar, renderiza `null` y avisa al padre para mostrar el
 * fallback elegante en DOM.
 */
class R3FErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[FordFocusModel3D] Fallo al cargar el recurso 3D:', error, info.componentStack);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// ─── Modelo: carga, centrado y escalado automáticos ─────────────────────────

function CarModel() {
  // useGLTF: el decodificador Draco se configura solo, así que un .glb
  // comprimido con Draco se carga sin trabajo extra.
  const { scene } = useGLTF(MODEL_URL);

  const { object, scale, liftY } = useMemo(() => {
    // Clonar para no mutar la escena cacheada por useGLTF.
    const clone = scene.clone(true);

    // Centrar el modelo en el origen — independiente del pivote original.
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);

    // Escalado uniforme: el lado más largo pasa a medir TARGET_SIZE unidades.
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = TARGET_SIZE / maxDim;

    tuneMaterials(clone);

    // liftY: elevar para que las ruedas apoyen sobre el suelo (y = 0).
    return { object: clone, scale: s, liftY: (size.y / 2) * s };
  }, [scene]);

  return (
    <group scale={scale} position={[0, liftY, 0]} rotation={[0, MODEL_Y_ROTATION, 0]}>
      <primitive object={object} />
    </group>
  );
}

/**
 * Ajuste de materiales — DELIBERADAMENTE CONSERVADOR.
 * Solo activa sombras y realza ligeramente el reflejo del entorno. NO recolorea
 * ni reinterpreta piezas: el .glb profesional debe traer ya sus materiales
 * correctos (carrocería plata metalizado, cristales oscuros, parrilla/difusor
 * negro mate, neumáticos negro mate, llantas gris oscuro, pilotos rojos,
 * faros técnicos…).
 *
 * Si en el futuro hiciera falta forzar colores por nombre de malla, hacerlo
 * AQUÍ y SOLO tras inspeccionar los nombres reales del modelo — recolorear a
 * ciegas puede inventar acabados que no aparecen en las imágenes de
 * referencia. REVISAR MANUALMENTE antes de activar cualquier recoloreo.
 */
function tuneMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of materials) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std && 'envMapIntensity' in std) std.envMapIntensity = 1.15;
    }
  });
}

// ─── Cámara: transición suave entre vistas preset ───────────────────────────

function CameraRig({ view, controls }: {
  view: ViewState;
  controls: RefObject<OrbitControlsRef | null>;
}) {
  const camera = useThree((s) => s.camera);
  const goalPos = useRef(new THREE.Vector3());
  const goalTarget = useRef(new THREE.Vector3());
  const animating = useRef(false);

  useEffect(() => {
    const preset = VIEWS[view.key];
    goalPos.current.set(...preset.position);
    goalTarget.current.set(...preset.target);
    animating.current = true;
  }, [view.key, view.nonce]);

  // Animación por mutación de refs: no provoca re-renders de React.
  useFrame(() => {
    if (!animating.current) return;
    const ctrl = controls.current;
    camera.position.lerp(goalPos.current, 0.12);
    if (ctrl) {
      ctrl.target.lerp(goalTarget.current, 0.12);
      ctrl.update();
    }
    if (camera.position.distanceTo(goalPos.current) < 0.02) {
      camera.position.copy(goalPos.current);
      if (ctrl) {
        ctrl.target.copy(goalTarget.current);
        ctrl.update();
      }
      animating.current = false;
    }
  });

  return null;
}

// ─── Loader dentro del Canvas (Suspense) ────────────────────────────────────

function ModelLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 select-none">
        <div
          className="h-9 w-9 rounded-full animate-spin"
          style={{ border: '2px solid var(--color-silver-mist)', borderTopColor: 'var(--color-ink)' }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
            color: 'var(--color-graphite)', whiteSpace: 'nowrap',
          }}
        >
          CARGANDO MODELO · {Math.round(progress)}%
        </span>
      </div>
    </Html>
  );
}

// ─── Visor 3D (Canvas + escena de estudio) ──────────────────────────────────

function Viewer({ view, autoRotate, onUserInteract, onModelError }: {
  view: ViewState;
  autoRotate: boolean;
  onUserInteract: () => void;
  onModelError: () => void;
}) {
  const controls = useRef<OrbitControlsRef | null>(null);

  return (
    <Canvas
      shadows
      // DPR razonable: nítido en pantallas retina sin coste excesivo.
      dpr={[1, 2]}
      camera={{ position: VIEWS[DEFAULT_VIEW].position, fov: 38, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      style={{ background: 'transparent' }}
      // Para escenas muy estáticas se puede pasar a frameloop="demand" como
      // optimización adicional; aquí se mantiene el loop por las transiciones
      // de cámara y el auto-rotate.
    >
      {/* Iluminación tipo estudio — contenida (3 luces, sin sobrecargar). */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[6, 9, 6]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <directionalLight position={[-7, 4, -5]} intensity={0.7} />

      <Suspense fallback={<ModelLoader />}>
        {/* El modelo es lo más propenso a fallar (404 / archivo inválido). */}
        <R3FErrorBoundary onError={onModelError}>
          <CarModel />
        </R3FErrorBoundary>
      </Suspense>

      <StudioShadow position={[0, 0, 0]} scale={7} opacity={0.32} />

      <CameraRig view={view} controls={controls} />

      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={0.9}
        // Zoom moderado: la distancia queda acotada en un rango cómodo.
        minDistance={4}
        maxDistance={11}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.05}
        onStart={onUserInteract}
      />
    </Canvas>
  );
}

// ─── Barra de control de vistas ─────────────────────────────────────────────

function ViewToolbar({ activeKey, onSelect, onReset }: {
  activeKey: ViewKey;
  onSelect: (key: ViewKey) => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 4, padding: 5,
        borderRadius: 999, border: '1px solid var(--color-silver-mist)',
        background: 'var(--surface-frosted-control)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        maxWidth: 'calc(100% - 24px)', flexWrap: 'wrap', justifyContent: 'center',
      }}
    >
      {(Object.keys(VIEWS) as ViewKey[]).map((key) => {
        const active = key === activeKey;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={active}
            className="focus-ring"
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 999,
              padding: '7px 14px', fontFamily: 'var(--font-sf-pro-text)',
              fontSize: 12.5, fontWeight: 500, letterSpacing: '-0.1px',
              background: active ? 'var(--color-ink)' : 'transparent',
              color: active ? 'var(--color-fog)' : 'var(--color-ink)',
              transition: 'background 160ms ease, color 160ms ease',
            }}
          >
            {VIEWS[key].label}
          </button>
        );
      })}
      <span style={{ width: 1, alignSelf: 'stretch', margin: '3px 2px', background: 'var(--color-silver-mist)' }} />
      <button
        type="button"
        onClick={onReset}
        aria-label="Resetear cámara"
        title="Resetear cámara"
        className="focus-ring"
        style={{
          border: 'none', cursor: 'pointer', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          height: 32, width: 32, background: 'transparent', color: 'var(--color-ink)',
        }}
      >
        <RotateCcw size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

// ─── Estado: comprobando disponibilidad del archivo ─────────────────────────

function CheckingState() {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
      }}
    >
      <div
        className="h-9 w-9 rounded-full animate-spin"
        style={{ border: '2px solid var(--color-silver-mist)', borderTopColor: 'var(--color-ink)' }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--color-graphite)',
        }}
      >
        Preparando visor 3D
      </span>
    </div>
  );
}

// ─── Fallback elegante: el modelo .glb aún no está disponible ───────────────

function ModelUnavailable({ variant }: { variant: 'missing' | 'error' }) {
  const isError = variant === 'error';
  const codeStyle: CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: '0.86em',
    background: 'var(--color-silver-mist)', color: 'var(--color-ink)',
    padding: '1px 6px', borderRadius: 6,
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Zona superior: foto de referencia REAL del coche — no es el modelo 3D. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <img
          src={POSTER_SRC}
          alt="Ford Focus ST-Line — foto de referencia"
          draggable={false}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'contain', objectPosition: 'center',
            padding: 'clamp(14px, 3.5vw, 40px)',
            filter: 'drop-shadow(0 18px 38px rgba(0,0,0,0.22))',
          }}
        />
        {/* Etiqueta superior izquierda. */}
        <div
          style={{
            position: 'absolute', top: 14, left: 14,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 11px', borderRadius: 999,
            background: 'var(--surface-frosted-control)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--color-silver-mist)',
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            letterSpacing: '0.1em', color: 'var(--color-graphite)',
          }}
        >
          <Box size={12} strokeWidth={2} />
          VISTA PREVIA · REFERENCIA
        </div>
      </div>

      {/* Zona inferior: panel sólido de texto — siempre legible, sin solaparse. */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--color-silver-mist)',
          background: 'var(--color-snow)',
          padding: 'clamp(15px, 2.6vw, 24px)',
          display: 'flex', flexDirection: 'column', gap: 7,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 7, height: 7, borderRadius: 999, flexShrink: 0,
              background: isError ? 'var(--color-caution)' : 'var(--color-azure)',
            }}
          />
          <span
            className="mono"
            style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--color-graphite)' }}
          >
            {isError ? 'ERROR AL CARGAR EL MODELO' : 'MODELO 3D NO DISPONIBLE'}
          </span>
        </div>
        <h3
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 600,
            fontSize: 'clamp(18px, 2.4vw, 24px)', lineHeight: 1.18,
            letterSpacing: '-0.4px', color: 'var(--color-ink)', margin: 0,
          }}
        >
          {isError
            ? 'El archivo 3D no se pudo procesar'
            : 'El modelo 3D todavía no está disponible'}
        </h3>
        <p
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-text)', fontWeight: 400,
            fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-slate)',
            margin: 0, maxWidth: 620,
          }}
        >
          {isError ? (
            <>
              El archivo <code style={codeStyle}>ford-focus-st-line-2023.glb</code> existe
              pero no es un .glb/.gltf válido. Vuelve a exportarlo y súbelo de nuevo.
            </>
          ) : (
            <>
              Coloca un modelo profesional en{' '}
              <code style={codeStyle}>/public/models/ford-focus-st-line-2023.glb</code>{' '}
              para activar la vista 3D interactiva. El visor ya está listo: al
              añadir el archivo se cargará automáticamente.
            </>
          )}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.4,
            color: 'var(--color-mist)', margin: '1px 0 0',
          }}
        >
          La imagen mostrada es una foto de referencia — no el modelo 3D.
        </p>
      </div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

type Status = 'idle' | 'available' | 'missing' | 'error';

interface FordFocusModel3DProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function FordFocusModel3D({
  title = 'Ford Focus ST-Line 3D Preview',
  subtitle = 'Modelo 3D interactivo del vehículo',
  className,
}: FordFocusModel3DProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [view, setView] = useState<ViewState>({ key: DEFAULT_VIEW, nonce: 0 });
  const [autoRotate, setAutoRotate] = useState(() => !prefersReducedMotion());

  // Lazy: no inicializar WebGL ni descargar el .glb hasta acercarse al viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '250px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Comprobar si el .glb existe (HEAD) antes de montar el visor. Evita
  // intentar cargar un archivo ausente y permite el fallback elegante.
  // Mientras la petición está en curso `status` sigue en 'idle' y se muestra
  // el estado "Preparando visor 3D".
  useEffect(() => {
    if (!visible || status !== 'idle') return;
    let cancelled = false;
    fetch(MODEL_URL, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        const isHtml = (res.headers.get('content-type') ?? '').includes('text/html');
        setStatus(res.ok && !isHtml ? 'available' : 'missing');
      })
      .catch(() => { if (!cancelled) setStatus('missing'); });
    return () => { cancelled = true; };
  }, [visible, status]);

  // Precargar el modelo en caché una vez confirmado que existe.
  useEffect(() => {
    if (status === 'available') useGLTF.preload(MODEL_URL);
  }, [status]);

  const selectView = (key: ViewKey) => {
    setView((s) => ({ key, nonce: s.nonce + 1 }));
    setAutoRotate(false);
  };

  // Reset: vuelve a la vista 3/4 inicial. El auto-rotate, una vez detenido por
  // la interacción del usuario, no se reactiva (comportamiento predecible).
  const resetCamera = () => {
    setView((s) => ({ key: DEFAULT_VIEW, nonce: s.nonce + 1 }));
  };

  return (
    <section ref={sectionRef} className={className} style={{ margin: 0 }}>
      {/* Cabecera de la sección. */}
      <div style={{ marginBottom: 20 }}>
        <span className="eyebrow">Visualización 3D</span>
        <h2
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)', fontWeight: 700,
            fontSize: 'clamp(30px, 4.4vw, 44px)', lineHeight: 1.08,
            letterSpacing: '-1px', color: 'var(--color-ink)', margin: '12px 0 0',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-text)', fontWeight: 300,
            fontSize: 'clamp(15px, 1.6vw, 18px)', lineHeight: 1.45,
            letterSpacing: '-0.2px', color: 'var(--color-slate)', margin: '8px 0 0',
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Tarjeta del visor — alto responsive (móvil ~340px, escritorio ~600px).
          Fondo radial neutro: hace de ciclorama de estudio en ambos temas. */}
      <div
        role="img"
        aria-label="Visor 3D interactivo del Ford Focus ST-Line"
        style={{
          position: 'relative',
          height: 'clamp(340px, 48vw, 600px)',
          borderRadius: 28,
          overflow: 'hidden',
          border: '1px solid var(--color-silver-mist)',
          background:
            'radial-gradient(ellipse 92% 74% at 50% 34%, var(--color-snow) 0%, var(--color-fog) 78%)',
        }}
      >
        {status === 'available' ? (
          <>
            <Viewer
              view={view}
              autoRotate={autoRotate}
              onUserInteract={() => setAutoRotate(false)}
              onModelError={() => setStatus('error')}
            />
            <ViewToolbar activeKey={view.key} onSelect={selectView} onReset={resetCamera} />
            {autoRotate && (
              <span
                style={{
                  position: 'absolute', top: 14, left: 14, pointerEvents: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.1em', color: 'var(--color-mist)',
                }}
              >
                ARRASTRA PARA ROTAR · SCROLL PARA ZOOM
              </span>
            )}
          </>
        ) : status === 'missing' || status === 'error' ? (
          <ModelUnavailable variant={status} />
        ) : (
          <CheckingState />
        )}
      </div>
    </section>
  );
}
