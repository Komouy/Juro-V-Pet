import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface StorybookSkyProps {
  weather: "cerah" | "hujan" | "senja" | "malam";
  isNight: boolean;
}

// Fixed pseudo-random deterministic star field generator (zero runtime Math.random overhead)
function generateStarPositions(count = 180): Float32Array {
  const positions = new Float32Array(count * 3);
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const phi = rnd() * Math.PI * 0.42; // Upper celestial dome
    const theta = rnd() * Math.PI * 2;
    const r = 42 + rnd() * 12;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.max(12, r * Math.cos(phi) + 4);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  return positions;
}

// Single Cloud Cluster composed of soft volumetric spheres
interface CloudClusterData {
  baseX: number;
  y: number;
  z: number;
  scale: number;
  speed: number;
}

const CLOUD_CONFIGS: CloudClusterData[] = [
  { baseX: -34, y: 24, z: -22, scale: 2.2, speed: 0.38 },
  { baseX: -16, y: 27, z: -28, scale: 2.8, speed: 0.45 },
  { baseX: 4, y: 23, z: -18, scale: 2.1, speed: 0.35 },
  { baseX: 22, y: 26, z: -25, scale: 2.6, speed: 0.42 },
  { baseX: -24, y: 21, z: -12, scale: 1.8, speed: 0.32 },
  { baseX: 14, y: 25, z: -10, scale: 2.0, speed: 0.36 },
];

export const StorybookSky: React.FC<StorybookSkyProps> = React.memo(({ weather, isNight }) => {
  const cloudsRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  const sunGroupRef = useRef<THREE.Group>(null);
  const moonGroupRef = useRef<THREE.Group>(null);

  const starPositions = useMemo(() => generateStarPositions(180), []);

  // Shared Geometries & Materials (Singletons)
  const spherePuffGeo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const starGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    return geo;
  }, [starPositions]);

  // Cloud styling based on weather & time phase
  const cloudColor = useMemo(() => {
    if (weather === "senja") return "#fed7aa"; // Golden peach sunset
    if (weather === "malam") return "#243857"; // Deep midnight indigo
    if (weather === "hujan") return "#64748b"; // Rain overcast slate
    return "#ffffff"; // Cheerful crisp day cloud
  }, [weather]);

  const cloudOpacity = useMemo(() => {
    if (weather === "malam") return 0.36;
    if (weather === "hujan") return 0.84;
    if (weather === "senja") return 0.88;
    return 0.92;
  }, [weather]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // 1. Smooth slow drift of storybook clouds across the sky
    if (cloudsRef.current) {
      cloudsRef.current.children.forEach((child, idx) => {
        const cfg = CLOUD_CONFIGS[idx];
        if (!cfg) return;
        child.position.x += delta * cfg.speed;
        if (child.position.x > 45) {
          child.position.x = -45;
        }
      });
    }

    // 2. Gentle twinkling of night stars
    if (starsRef.current && isNight) {
      const mat = starsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.65 + Math.sin(t * 2.2) * 0.22;
    }

    // 3. Gentle coronal pulse of celestial body
    if (sunGroupRef.current && !isNight) {
      const sunHalo = sunGroupRef.current.children[1];
      if (sunHalo) {
        sunHalo.scale.setScalar(1 + Math.sin(t * 1.8) * 0.04);
      }
    }
    if (moonGroupRef.current && isNight) {
      const moonHalo = moonGroupRef.current.children[1];
      if (moonHalo) {
        moonHalo.scale.setScalar(1 + Math.sin(t * 1.4) * 0.03);
      }
    }
  });

  return (
    <group name="StorybookSky">
      {/* --- 1. CELESTIAL SUN (Siang & Sore) --- */}
      {!isNight && weather !== "hujan" && (
        <group
          ref={sunGroupRef}
          position={
            weather === "senja"
              ? [-26, 12, -28] // Sore: Sun sinks warm and low on the horizon
              : [16, 28, -26]  // Siang: Sun shines high and cheerful
          }
        >
          {/* Main Sun Disc */}
          <mesh>
            <sphereGeometry args={[weather === "senja" ? 3.2 : 2.4, 16, 16]} />
            <meshBasicMaterial
              color={weather === "senja" ? "#ff7a38" : "#fffbe0"}
              fog={false}
            />
          </mesh>
          {/* Coronal Outer Halo */}
          <mesh>
            <ringGeometry args={[weather === "senja" ? 3.4 : 2.6, weather === "senja" ? 6.5 : 4.6, 24]} />
            <meshBasicMaterial
              color={weather === "senja" ? "#f97316" : "#fef08a"}
              transparent
              opacity={weather === "senja" ? 0.45 : 0.32}
              side={THREE.DoubleSide}
              depthWrite={false}
              fog={false}
            />
          </mesh>
        </group>
      )}

      {/* --- 2. CELESTIAL MOON (Malam) --- */}
      {isNight && (
        <group ref={moonGroupRef} position={[-18, 27, -26]}>
          {/* Glowing Luminous Moon */}
          <mesh>
            <sphereGeometry args={[2.2, 16, 16]} />
            <meshBasicMaterial color="#fffde8" fog={false} />
          </mesh>
          {/* Ethereal Moonbeam Halo */}
          <mesh>
            <ringGeometry args={[2.4, 4.4, 24]} />
            <meshBasicMaterial
              color="#93c5fd"
              transparent
              opacity={0.24}
              side={THREE.DoubleSide}
              depthWrite={false}
              fog={false}
            />
          </mesh>
        </group>
      )}

      {/* --- 3. TWINKLING STARFIELD (Malam) --- */}
      {isNight && (
        <points ref={starsRef} geometry={starGeo}>
          <pointsMaterial
            size={0.75}
            color="#fef9c3"
            transparent
            opacity={0.78}
            sizeAttenuation={true}
            fog={false}
            depthWrite={false}
          />
        </points>
      )}

      {/* --- 4. DRIFTING FLUFFY STORYBOOK CUMULUS CLOUDS --- */}
      <group ref={cloudsRef}>
        {CLOUD_CONFIGS.map((cfg, idx) => (
          <group
            key={idx}
            position={[cfg.baseX, cfg.y, cfg.z]}
            scale={cfg.scale}
          >
            {/* Main Center Puff */}
            <mesh geometry={spherePuffGeo} position={[0, 0, 0]}>
              <meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} depthWrite={false} />
            </mesh>
            {/* Left Puff */}
            <mesh geometry={spherePuffGeo} position={[-0.8, -0.15, 0.1]} scale={0.74}>
              <meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} depthWrite={false} />
            </mesh>
            {/* Right Puff */}
            <mesh geometry={spherePuffGeo} position={[0.85, -0.12, -0.1]} scale={0.78}>
              <meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} depthWrite={false} />
            </mesh>
            {/* Top Crown Puff */}
            <mesh geometry={spherePuffGeo} position={[0.15, 0.45, 0]} scale={0.68}>
              <meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity * 0.95} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
});
