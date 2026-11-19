import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { generateFirefliesData } from "./landscapeData";

interface NightFirefliesProps {
  isNight: boolean;
}

// Module-scope scratch objects for 60fps zero-allocation per frame
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export const NightFireflies: React.FC<NightFirefliesProps> = React.memo(({ isNight }) => {
  const coreInstRef = useRef<THREE.InstancedMesh>(null);
  const haloInstRef = useRef<THREE.InstancedMesh>(null);

  const fireflies = useMemo(() => generateFirefliesData(), []);

  // Initialize per-instance colors on mount
  useEffect(() => {
    if (!coreInstRef.current || !haloInstRef.current) return;
    for (let i = 0; i < fireflies.length; i++) {
      _color.set(fireflies[i].color);
      coreInstRef.current.setColorAt(i, _color);
      haloInstRef.current.setColorAt(i, _color);
    }
    if (coreInstRef.current.instanceColor) coreInstRef.current.instanceColor.needsUpdate = true;
    if (haloInstRef.current.instanceColor) haloInstRef.current.instanceColor.needsUpdate = true;
  }, [fireflies]);

  useFrame((state) => {
    if (!isNight) return;
    const t = state.clock.getElapsedTime();

    if (coreInstRef.current && haloInstRef.current) {
      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];
        const angle = t * f.speed + f.phase;
        const x = f.base[0] + Math.cos(angle) * f.radius;
        const y =
          f.base[1] +
          Math.sin(angle * 1.7) * 0.14 +
          Math.cos(t * 0.85 + f.phase) * 0.06;
        const z = f.base[2] + Math.sin(angle * 0.85) * (f.radius * 0.85);

        // Organic firefly heartbeat glow pulsation
        const pulse = Math.pow(Math.max(0, Math.sin(t * f.pulseSpeed + f.pulsePhase)), 2.2);
        const coreScale = 0.5 + pulse * 0.9;
        const haloScale = 0.35 + pulse * 1.25;

        // Core
        _dummy.position.set(x, y, z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(coreScale, coreScale, coreScale);
        _dummy.updateMatrix();
        coreInstRef.current.setMatrixAt(i, _dummy.matrix);

        // Halo
        _dummy.scale.set(haloScale, haloScale, haloScale);
        _dummy.updateMatrix();
        haloInstRef.current.setMatrixAt(i, _dummy.matrix);
      }
      coreInstRef.current.instanceMatrix.needsUpdate = true;
      haloInstRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  if (!isNight) return null;

  return (
    <group>
      {/* Glowing Bright Firefly Cores (1 Draw Call) */}
      <instancedMesh
        ref={coreInstRef}
        args={[undefined, undefined, fireflies.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.038, 8, 8]} />
        <meshBasicMaterial color="#FEF08A" />
      </instancedMesh>

      {/* Soft Luminous Outer Firefly Halos (1 Draw Call) */}
      <instancedMesh
        ref={haloInstRef}
        args={[undefined, undefined, fireflies.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.095, 8, 8]} />
        <meshBasicMaterial
          color="#A3E635"
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
});
