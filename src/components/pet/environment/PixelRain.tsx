import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  generatePixelRainData,
  generateRiverRipplesData,
} from "./landscapeData";

interface PixelRainProps {
  isRaining: boolean;
}

// Module-scope scratch objects for 60fps zero-allocation per frame
const _dummy = new THREE.Object3D();

const TOP_Y = 4.8;
const BOTTOM_Y = -0.92;
const TOTAL_DROP = TOP_Y - BOTTOM_Y;

export const PixelRain: React.FC<PixelRainProps> = React.memo(({ isRaining }) => {
  const rainInstRef = useRef<THREE.InstancedMesh>(null);
  const rippleInstRef = useRef<THREE.InstancedMesh>(null);

  const rainData = useMemo(() => generatePixelRainData(), []);
  const rippleData = useMemo(() => generateRiverRipplesData(), []);

  useFrame((state) => {
    if (!isRaining) return;
    const t = state.clock.getElapsedTime();

    // 1. Vertical Pixel Rain Streaks
    if (rainInstRef.current) {
      for (let i = 0; i < rainData.length; i++) {
        const r = rainData[i];
        const fallY = TOP_Y - ((t * r.speed + r.offset) % TOTAL_DROP);

        _dummy.position.set(r.x, fallY, r.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1, r.height, 1);
        _dummy.updateMatrix();

        rainInstRef.current.setMatrixAt(i, _dummy.matrix);
      }
      rainInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // 2. Expanding Water Ripples on River & Pond Surface
    if (rippleInstRef.current) {
      for (let i = 0; i < rippleData.length; i++) {
        const rp = rippleData[i];
        const progress = (t * rp.speed + rp.phase) % 1;
        const scale = 0.2 + progress * rp.maxRadius * 2.8;

        _dummy.position.set(rp.x, -0.902, rp.z);
        _dummy.rotation.set(-Math.PI / 2, 0, 0);
        _dummy.scale.set(scale, scale, 1);
        _dummy.updateMatrix();

        rippleInstRef.current.setMatrixAt(i, _dummy.matrix);
      }
      rippleInstRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  if (!isRaining) return null;

  return (
    <group>
      {/* Crisp 3D Vertical Pixel Rain Streaks (1 Draw Call) */}
      <instancedMesh
        ref={rainInstRef}
        args={[undefined, undefined, rainData.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.018, 1, 0.018]} />
        <meshBasicMaterial
          color="#93C5FD"
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Expanding Concentric Water Ripples along River & Pond (1 Draw Call) */}
      <instancedMesh
        ref={rippleInstRef}
        args={[undefined, undefined, rippleData.length]}
        frustumCulled={false}
      >
        <ringGeometry args={[0.06, 0.095, 20]} />
        <meshBasicMaterial
          color="#BAE6FD"
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
});
