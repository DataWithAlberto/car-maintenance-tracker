import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CAR_PARTS } from '../../utils/constants';

interface PartClickInfo {
  partKey: string;
  position: [number, number, number];
}

interface CarModelProps {
  onPartClick: (info: PartClickInfo) => void;
}

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

const CarBody = ({ onPartClick }: CarModelProps) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <group>
      {/* Main body */}
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
        <meshStandardMaterial color="#88bbdd" transparent opacity={0.4} metalness={0.1} roughness={0} />
      </mesh>

      {/* Rear window */}
      <mesh position={[0, 0.7, -1.1]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[1.5, 0.55]} />
        <meshStandardMaterial color="#88bbdd" transparent opacity={0.4} metalness={0.1} roughness={0} />
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
          onClick={(e) => {
            e.stopPropagation();
            onPartClick({ partKey: key, position });
          }}
          castShadow
        >
          <boxGeometry args={size} />
          <meshStandardMaterial
            color={hovered === key ? '#60a5fa' : color}
            transparent
            opacity={hovered === key ? 0.85 : 0.7}
            metalness={0.3}
            roughness={0.6}
          />
          {hovered === key && (
            <Html distanceFactor={8} position={[0, size[1] / 2 + 0.3, 0]}>
              <div className="bg-gray-900/90 text-white text-xs px-2 py-1 rounded-lg border border-blue-500/50 whitespace-nowrap pointer-events-none">
                {CAR_PARTS[key]?.label ?? key}
              </div>
            </Html>
          )}
        </mesh>
      ))}
    </group>
  );
};

const AutoRotate = ({ active }: { active: boolean }) => {
  const { scene } = useThree();
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (active && ref.current) ref.current.rotation.y += delta * 0.3;
  });
  return null;
};

interface CarViewerProps {
  onPartClick?: (partKey: string) => void;
  autoRotate?: boolean;
}

export const CarViewer = ({ onPartClick, autoRotate = false }: CarViewerProps) => {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const handlePartClick = (info: PartClickInfo) => {
    setSelectedPart(info.partKey);
    onPartClick?.(info.partKey);
  };

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [3, 2, 5], fov: 45 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.4} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />

        <Suspense fallback={null}>
          <group>
            <CarBody onPartClick={handlePartClick} />
            <AutoRotate active={autoRotate && !selectedPart} />
          </group>
          <ContactShadows position={[0, -0.65, 0]} opacity={0.5} scale={10} blur={2} />
          <Environment preset="city" />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      {selectedPart && (
        <div className="absolute top-4 left-4 bg-gray-900/80 text-blue-400 text-sm px-3 py-1.5 rounded-lg border border-blue-500/30">
          Seleccionado: {CAR_PARTS[selectedPart]?.label}
        </div>
      )}
    </div>
  );
};
