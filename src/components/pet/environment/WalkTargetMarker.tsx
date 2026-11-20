import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTerrainHeightAt } from "../../../engine/world/mapTerrain";

interface WalkTargetMarkerProps {
  x: number;
  z: number;
}

export const WalkTargetMarker: React.FC<WalkTargetMarkerProps> = ({ x, z }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const dotMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const [active, setActive] = useState(true);
  const ageRef = useRef(0);

  const surfaceY = getTerrainHeightAt(x, z);

  useFrame((_, delta) => {
    if (!active || !groupRef.current) return;
    ageRef.current += delta;
    const progress = Math.min(1, ageRef.current / 0.85);

    // Expand outer ring from 0.45 to 1.3
    const scale = 0.45 + progress * 0.85;
    groupRef.current.scale.set(scale, scale, 1);

    // Fade out smoothly
    const alpha = Math.max(0, 1 - progress);
    if (ringMatRef.current) {
      ringMatRef.current.opacity = alpha * 0.85;
    }
    if (dotMatRef.current) {
      dotMatRef.current.opacity = alpha;
    }

    if (progress >= 1) {
      setActive(false);
    }
  });

  if (!active) return null;

  return (
    <group
      ref={groupRef}
      position={[x, surfaceY + 0.025, z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      {/* Outer Retro Target Ring */}
      <mesh>
        <ringGeometry args={[0.22, 0.28, 24]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color="#F97316"
          transparent
          opacity={0.85}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Crisp Target Dot */}
      <mesh>
        <circleGeometry args={[0.07, 16]} />
        <meshBasicMaterial
          ref={dotMatRef}
          color="#FDBA74"
          transparent
          opacity={0.9}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
