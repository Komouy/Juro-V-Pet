import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

export interface ResponsiveCameraProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

/**
 * Automatically sets scenic miniature diorama valley framing for desktop widescreen & mobile portrait
 */
export const ResponsiveCamera: React.FC<ResponsiveCameraProps> = ({ controlsRef }) => {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fovRad = THREE.MathUtils.degToRad(
      camera instanceof THREE.PerspectiveCamera ? camera.fov : 38
    );

    // Frame the wide miniature valley cleanly on both widescreen & mobile portrait
    const neededZForWidth = 5.4 / (2 * Math.tan(fovRad / 2) * Math.max(0.45, aspect));
    const targetZ = THREE.MathUtils.clamp(Math.max(6.2, neededZForWidth), 6.2, 10.6);
    const targetY = aspect < 0.85 ? 2.45 : 1.95;

    camera.position.set(0, targetY, targetZ);
    camera.lookAt(0, -0.45, -0.35);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(0, -0.45, -0.35);
      controlsRef.current.update();
      controlsRef.current.saveState();
    }
  }, [camera, size.width, size.height, controlsRef]);

  return null;
};
