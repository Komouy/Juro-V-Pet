import React, { useMemo } from "react";
import * as THREE from "three";

interface ToyProp3DProps {
  toyId?: string;
  bounceHeight?: number;
}

export const MusicalNote3D: React.FC<{ progress: number; offset: number }> = React.memo(
  ({ progress, offset }) => {
    // Elegant 3D musical note (stem + filled head + flag)
    const noteGeo = useMemo(() => {
      const shape = new THREE.Shape();
      // Note head (tilted oval)
      shape.absellipse(0, 0, 0.05, 0.038, 0, Math.PI * 2, false, Math.PI / 4);

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.02,
        bevelEnabled: false,
      });
      geo.center();
      return geo;
    }, []);

    const cycle = (progress + offset) % 1;
    const x = Math.sin(cycle * Math.PI * 2) * 0.18 + (offset - 0.5) * 0.22;
    const y = cycle * 0.75;
    const s = Math.sin(cycle * Math.PI) * 1.1;
    const opacity = cycle < 0.2 ? cycle / 0.2 : cycle > 0.75 ? (1 - cycle) / 0.25 : 1;

    return (
      <group position={[x, y, 0]} scale={[s, s, s]}>
        {/* Note Head */}
        <mesh geometry={noteGeo}>
          <meshBasicMaterial color="#38BDF8" transparent opacity={opacity * 0.9} />
        </mesh>
        {/* Note Stem */}
        <mesh position={[0.04, 0.065, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.12, 8]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={opacity * 0.9} />
        </mesh>
        {/* Note Flag */}
        <mesh position={[0.065, 0.11, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.045, 0.012, 0.015]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={opacity * 0.9} />
        </mesh>
      </group>
    );
  }
);

export const PlayBubble3D: React.FC<{ progress: number; index: number }> = React.memo(
  ({ progress, index }) => {
    const cycle = (progress + index * 0.125) % 1;
    const angle = index * 0.95 + progress * 2.2;
    const radius = 0.22 + (index % 4) * 0.14;
    const x = Math.cos(angle) * radius + (index % 2 === 0 ? 0.18 : -0.18) * cycle;
    const z = Math.sin(angle) * radius + (index % 3 === 0 ? 0.12 : -0.12) * cycle;
    const y = cycle * 1.55;
    const scale = (0.075 + (index % 3) * 0.035) * Math.sin(cycle * Math.PI);
    const opacity = cycle < 0.12 ? cycle / 0.12 : cycle > 0.85 ? (1 - cycle) / 0.15 : 0.82;

    return (
      <group position={[x, y, z]} scale={[scale, scale, scale]}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshPhysicalMaterial
            color="#E0F2FE"
            roughness={0.04}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.05}
            transparent
            opacity={opacity}
            emissive={index % 2 === 0 ? "#F472B6" : "#38BDF8"}
            emissiveIntensity={0.25}
          />
        </mesh>
        {/* Highlight Specular Dot */}
        <mesh position={[-0.32, 0.38, 0.65]} scale={0.22}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={opacity * 0.9} />
        </mesh>
      </group>
    );
  }
);

export const ToyProp3D: React.FC<ToyProp3DProps> = React.memo(
  ({ toyId = "bounce-ball" }) => {
    // 1. Bola Pantul Karet (Cute Small Round Retro Bouncy Rubber Ball)
    if (toyId === "bounce-ball") {
      const ballRadius = 0.082; // Cute pocket-sized radius (proportional to Juro)

      return (
        <group scale={[1, 1, 1]}>
          {/* Main Core Sphere - Perfectly Round */}
          <mesh>
            <sphereGeometry args={[ballRadius, 24, 24]} />
            <meshPhysicalMaterial
              color="#EF4444"
              roughness={0.18}
              metalness={0.05}
              clearcoat={1}
              clearcoatRoughness={0.08}
            />
          </mesh>
          {/* Cyan Center Waist Band */}
          <mesh scale={[1.01, 0.36, 1.01]}>
            <sphereGeometry args={[ballRadius, 24, 16]} />
            <meshPhysicalMaterial
              color="#06B6D4"
              roughness={0.18}
              metalness={0.05}
              clearcoat={1}
            />
          </mesh>
          {/* Yellow Center Stripe Band */}
          <mesh scale={[1.02, 0.16, 1.02]}>
            <sphereGeometry args={[ballRadius, 24, 16]} />
            <meshPhysicalMaterial
              color="#F59E0B"
              roughness={0.18}
              metalness={0.05}
              clearcoat={1}
            />
          </mesh>
          {/* Glossy White Catchlight */}
          <mesh position={[-0.026, 0.032, 0.06]} scale={[0.016, 0.016, 0.008]}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      );
    }

    // 2. Peniup Gelembung Sabun (Rainbow Bubble Wand)
    if (toyId === "bubble-blower") {
      return (
        <group rotation={[0.2, 0.35, -0.4]} scale={1.2}>
          {/* Wand Handle */}
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.016, 0.02, 0.32, 12]} />
            <meshStandardMaterial color="#EC4899" roughness={0.3} metalness={0.1} />
          </mesh>
          {/* Wand Handle Grip Ribs */}
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.023, 0.023, 0.04, 12]} />
            <meshStandardMaterial color="#F43F5E" roughness={0.4} />
          </mesh>
          {/* Wooden Meadow Stand Fixture (keeps wand standing freestanding on grass) */}
          <mesh position={[0, -0.31, 0]}>
            <cylinderGeometry args={[0.065, 0.08, 0.035, 14]} />
            <meshStandardMaterial color="#78350F" roughness={0.7} />
          </mesh>
          {/* Bubble Wand Ring */}
          <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.072, 0.014, 12, 24]} />
            <meshPhysicalMaterial
              color="#38BDF8"
              roughness={0.15}
              clearcoat={1}
              metalness={0.2}
            />
          </mesh>
          {/* Soap Film Membrane inside Ring */}
          <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.068, 20]} />
            <meshPhysicalMaterial
              color="#E0F2FE"
              roughness={0.05}
              metalness={0.1}
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
              clearcoat={1}
            />
          </mesh>
        </group>
      );
    }

    // 3. Radio Nostalgia (Retro Chiptune Radio Player)
    return (
      <group rotation={[0, -0.3, 0]} scale={1.15}>
        {/* Radio Emerald Body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.38, 0.28, 0.22]} />
          <meshStandardMaterial color="#10B981" roughness={0.35} metalness={0.15} />
        </mesh>
        {/* Radio Dark Bottom Base Rim */}
        <mesh position={[0, -0.13, 0]}>
          <boxGeometry args={[0.4, 0.03, 0.24]} />
          <meshStandardMaterial color="#065F46" roughness={0.5} />
        </mesh>
        {/* Left Speaker Mesh Plate */}
        <mesh position={[-0.085, 0.005, 0.112]}>
          <boxGeometry args={[0.15, 0.18, 0.01]} />
          <meshStandardMaterial color="#064E3B" roughness={0.6} />
        </mesh>
        {/* Speaker Acoustic Grille Dots */}
        {[-0.03, 0.03].map((xOffset) =>
          [-0.04, 0, 0.04].map((yOffset) => (
            <mesh
              key={`${xOffset}-${yOffset}`}
              position={[-0.085 + xOffset, 0.005 + yOffset, 0.12]}
            >
              <cylinderGeometry args={[0.01, 0.01, 0.004, 8]} />
              <meshBasicMaterial color="#A7F3D0" />
            </mesh>
          ))
        )}
        {/* Right Tuner / Cassette Window */}
        <mesh position={[0.1, 0.04, 0.112]}>
          <boxGeometry args={[0.12, 0.1, 0.01]} />
          <meshStandardMaterial color="#171717" roughness={0.2} />
        </mesh>
        <mesh position={[0.1, 0.04, 0.118]}>
          <boxGeometry args={[0.09, 0.065, 0.005]} />
          <meshBasicMaterial color="#F59E0B" />
        </mesh>
        {/* Two Knobs below Window */}
        <mesh position={[0.06, -0.055, 0.118]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.018, 12]} />
          <meshStandardMaterial color="#FBBF24" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0.13, -0.055, 0.118]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.018, 12]} />
          <meshStandardMaterial color="#FBBF24" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Top Antenna */}
        <mesh position={[-0.14, 0.22, -0.04]} rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.007, 0.009, 0.24, 8]} />
          <meshStandardMaterial color="#D1D5DB" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Antenna Red Tip Ball */}
        <mesh position={[-0.165, 0.33, -0.04]}>
          <sphereGeometry args={[0.02, 10, 10]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
        {/* Carrying Handle */}
        <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.09, 0.012, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#065F46" roughness={0.4} />
        </mesh>
      </group>
    );
  }
);
