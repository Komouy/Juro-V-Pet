import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RiverFishesProps {
  isNight?: boolean;
}

interface FishConfig {
  id: number;
  type: "stream" | "pond";
  color: string;
  accentColor: string;
  size: number;
  speed: number;
  phase: number;
  waggleFreq: number;
  // For stream fishes: bounds along spline path [tMin, tMax]
  pathMin?: number;
  pathMax?: number;
  // For pond fishes: center and radii
  pondCenter?: [number, number];
  pondRadius?: [number, number];
  clockwise?: boolean;
}

// Stream centerline interpolation (matching createStreamShape & mapTerrain brook curve)
function getStreamPositionAt(progress: number): { x: number; z: number; tangentX: number; tangentZ: number } {
  // progress in [0, 1] maps from (-5.2, -4.4) down to (2.2, -1.25)
  const clamped = Math.max(0, Math.min(1, progress));
  const t = clamped;

  // Stream path coordinates
  const x = -5.2 + t * 7.4;
  const baseZ = -4.4 + t * 3.15;
  const bend = Math.sin(t * Math.PI * 1.15) * 0.48;
  const z = baseZ + bend;

  // Compute tangent for smooth fish heading rotation
  const dt = 0.02;
  const tNext = Math.min(1, t + dt);
  const xNext = -5.2 + tNext * 7.4;
  const zNext = -4.4 + tNext * 3.15 + Math.sin(tNext * Math.PI * 1.15) * 0.48;

  return {
    x,
    z,
    tangentX: xNext - x,
    tangentZ: zNext - z,
  };
}

const FISH_PRESETS: FishConfig[] = [
  // 1. Lively Golden-Orange Koi swimming through the northwest rapids
  {
    id: 1,
    type: "stream",
    color: "#FB923C",
    accentColor: "#FFFFFF",
    size: 0.12,
    speed: 0.14,
    phase: 0.0,
    waggleFreq: 14,
    pathMin: 0.05,
    pathMax: 0.58,
  },
  // 2. Ruby Crimson Koi swimming right through the cleared central riverbend
  {
    id: 2,
    type: "stream",
    color: "#F43F5E",
    accentColor: "#FFE4E6",
    size: 0.11,
    speed: 0.16,
    phase: 2.4,
    waggleFreq: 16,
    pathMin: 0.28,
    pathMax: 0.82,
  },
  // 3. Calico Pearl & Tangerine Koi swimming near the river mouth into the pond
  {
    id: 3,
    type: "stream",
    color: "#F8FAFC",
    accentColor: "#EA580C",
    size: 0.10,
    speed: 0.13,
    phase: 4.2,
    waggleFreq: 13,
    pathMin: 0.48,
    pathMax: 0.98,
  },
  // 4. Golden Yellow Koi swimming in calm circles around the pond lily pad
  {
    id: 4,
    type: "pond",
    color: "#FACC15",
    accentColor: "#FFFFFF",
    size: 0.125,
    speed: 0.42,
    phase: 0.8,
    waggleFreq: 11,
    pondCenter: [2.45, -1.05],
    pondRadius: [0.55, 0.38],
    clockwise: true,
  },
  // 5. Sunset Rose Koi cruising inner pond waters
  {
    id: 5,
    type: "pond",
    color: "#FB7185",
    accentColor: "#FDE047",
    size: 0.095,
    speed: 0.52,
    phase: 3.5,
    waggleFreq: 15,
    pondCenter: [2.45, -1.05],
    pondRadius: [0.35, 0.24],
    clockwise: false,
  },
];

interface SingleFishProps {
  cfg: FishConfig;
  isNight?: boolean;
}

const SingleFish: React.FC<SingleFishProps> = ({ cfg, isNight = false }) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const rippleRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!rootGroupRef.current) return;
    const t = state.clock.getElapsedTime();

    let targetX = 0;
    let targetZ = 0;
    let heading = 0;
    let swimCycle = 0;

    if (cfg.type === "stream") {
      const pMin = cfg.pathMin ?? 0.1;
      const pMax = cfg.pathMax ?? 0.9;
      const pathRange = pMax - pMin;

      // Ping-pong along stream with smooth turnaround
      const loopTime = (t * cfg.speed + cfg.phase) % 2;
      const goingForward = loopTime < 1;
      const localT = goingForward ? loopTime : 2 - loopTime;
      // Smooth sinusoidal ease in and out near turnarounds
      const smoothProgress = pMin + (0.5 - 0.5 * Math.cos(localT * Math.PI)) * pathRange;

      const pt = getStreamPositionAt(smoothProgress);
      targetX = pt.x;
      targetZ = pt.z;

      // Compute heading angle
      const dirMult = goingForward ? 1 : -1;
      heading = Math.atan2(pt.tangentX * dirMult, pt.tangentZ * dirMult);
      swimCycle = t * cfg.waggleFreq;
    } else {
      // Pond orbit
      const [cx, cz] = cfg.pondCenter ?? [2.45, -1.05];
      const [rx, rz] = cfg.pondRadius ?? [0.5, 0.35];
      const angle = (t * cfg.speed * (cfg.clockwise ? 1 : -1)) + cfg.phase;

      targetX = cx + Math.cos(angle) * rx;
      targetZ = cz + Math.sin(angle) * rz;

      // Tangent to ellipse
      const dx = -Math.sin(angle) * rx * (cfg.clockwise ? 1 : -1);
      const dz = Math.cos(angle) * rz * (cfg.clockwise ? 1 : -1);
      heading = Math.atan2(dx, dz);
      swimCycle = t * cfg.waggleFreq;
    }

    // Subtle gentle depth breathing: stays just beneath water surface (y ~ -0.903)
    const yBob = Math.sin(t * 2.2 + cfg.phase) * 0.003;
    const posY = -0.903 + yBob;

    // Body waggle
    const bodyWaggle = Math.sin(swimCycle) * 0.08;
    rootGroupRef.current.position.set(targetX, posY, targetZ);
    rootGroupRef.current.rotation.set(0, heading + bodyWaggle, 0);

    // Tail fin waggle
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(swimCycle) * 0.42;
    }

    // Soft water surface wake ripple
    if (rippleRef.current) {
      const ripplePhase = (t * 1.8 + cfg.phase * 2) % 1;
      const rScale = 0.6 + ripplePhase * 1.4;
      rippleRef.current.scale.set(rScale, rScale, 1);
      const mat = rippleRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, (1 - ripplePhase) * 0.28);
      }
    }
  });

  const bodyScale = cfg.size;

  return (
    <group ref={rootGroupRef}>
      {/* Soft circular water wake ripple under fish */}
      <mesh ref={rippleRef} position={[0, -0.001, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.07, 12]} />
        <meshBasicMaterial color="#BAE6FD" transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {/* Main Fish Body Group */}
      <group scale={[bodyScale, bodyScale * 0.85, bodyScale * 1.45]}>
        {/* Streamlined Oval Fish Torso */}
        <mesh position={[0, 0, 0]} scale={[0.55, 0.72, 1.0]}>
          <sphereGeometry args={[0.42, 8, 7]} />
          <meshStandardMaterial
            color={cfg.color}
            roughness={0.25}
            metalness={0.12}
            emissive={cfg.color}
            emissiveIntensity={isNight ? 0.35 : 0.08}
          />
        </mesh>

        {/* Belly / Accent Color Highlight */}
        <mesh position={[0, -0.12, 0.04]} scale={[0.44, 0.42, 0.85]}>
          <sphereGeometry args={[0.32, 7, 6]} />
          <meshStandardMaterial
            color={cfg.accentColor}
            roughness={0.3}
            emissive={cfg.accentColor}
            emissiveIntensity={isNight ? 0.25 : 0.04}
          />
        </mesh>

        {/* Cute Little Dorsal Top Fin */}
        <mesh position={[0, 0.28, -0.05]} rotation={[0.4, 0, 0]} scale={[0.06, 0.24, 0.35]}>
          <coneGeometry args={[0.5, 0.6, 3]} />
          <meshLambertMaterial color={cfg.color} transparent opacity={0.88} />
        </mesh>

        {/* Left Pectoral Fin */}
        <mesh position={[0.22, -0.06, 0.12]} rotation={[0.2, 0.5, -0.4]} scale={[0.18, 0.05, 0.24]}>
          <coneGeometry args={[0.4, 0.5, 3]} />
          <meshLambertMaterial color={cfg.color} transparent opacity={0.85} />
        </mesh>

        {/* Right Pectoral Fin */}
        <mesh position={[-0.22, -0.06, 0.12]} rotation={[0.2, -0.5, 0.4]} scale={[0.18, 0.05, 0.24]}>
          <coneGeometry args={[0.4, 0.5, 3]} />
          <meshLambertMaterial color={cfg.color} transparent opacity={0.85} />
        </mesh>

        {/* Two Tiny Black Bead Eyes */}
        <mesh position={[0.16, 0.08, 0.28]}>
          <sphereGeometry args={[0.055, 5, 5]} />
          <meshBasicMaterial color="#0F172A" />
        </mesh>
        <mesh position={[-0.16, 0.08, 0.28]}>
          <sphereGeometry args={[0.055, 5, 5]} />
          <meshBasicMaterial color="#0F172A" />
        </mesh>

        {/* Wiggling Tail Fin Joint */}
        <group ref={tailRef} position={[0, 0, -0.38]}>
          {/* Fan Tail Fin */}
          <mesh position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]} scale={[0.06, 0.45, 0.36]}>
            <coneGeometry args={[0.65, 0.75, 3]} />
            <meshStandardMaterial
              color={cfg.color}
              roughness={0.25}
              transparent
              opacity={0.92}
              emissive={cfg.color}
              emissiveIntensity={isNight ? 0.32 : 0.08}
            />
          </mesh>
          {/* Secondary tail fin flutter accent */}
          <mesh position={[0, 0.06, -0.24]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.28, 0.24]}>
            <coneGeometry args={[0.45, 0.55, 3]} />
            <meshLambertMaterial color={cfg.accentColor} transparent opacity={0.85} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/**
 * Animated River & Pond Fishes (Koi & Little Minnows)
 * Swims smoothly through the clear river channel and lily pond.
 */
export const RiverFishes: React.FC<RiverFishesProps> = React.memo(({ isNight = false }) => {
  const fishes = useMemo(() => FISH_PRESETS, []);

  return (
    <group name="river-fishes">
      {fishes.map((cfg) => (
        <SingleFish key={cfg.id} cfg={cfg} isNight={isNight} />
      ))}
    </group>
  );
});
