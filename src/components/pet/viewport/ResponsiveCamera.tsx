import React, { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

export interface ResponsiveCameraProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  targetPosRef?: React.RefObject<THREE.Vector3>;
}

/**
 * Automatically sets scenic miniature diorama valley framing for desktop widescreen & mobile portrait
 * and smoothly follows Juro as he wanders the valley.
 */
export const ResponsiveCamera: React.FC<ResponsiveCameraProps> = ({ controlsRef, targetPosRef }) => {
  const { camera, size } = useThree();
  const initialFramedRef = useRef(false);

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fovRad = THREE.MathUtils.degToRad(
      camera instanceof THREE.PerspectiveCamera ? camera.fov : 38
    );

    // Frame the wide miniature valley cleanly on both widescreen & mobile portrait
    const neededZForWidth = 5.4 / (2 * Math.tan(fovRad / 2) * Math.max(0.45, aspect));
    const targetZ = THREE.MathUtils.clamp(Math.max(6.2, neededZForWidth), 6.2, 10.6);
    const targetY = aspect < 0.85 ? 2.45 : 1.95;

    const initPos = targetPosRef?.current;
    const focusX = initPos ? initPos.x : 0;
    const focusY = initPos ? initPos.y + 0.22 : -0.45;
    const focusZ = initPos ? initPos.z : -0.35;

    camera.position.set(focusX, focusY + targetY, focusZ + targetZ);
    camera.lookAt(focusX, focusY, focusZ);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(focusX, focusY, focusZ);
      controlsRef.current.update();
      controlsRef.current.saveState();
    }
    initialFramedRef.current = true;
  }, [camera, size.width, size.height, controlsRef, targetPosRef]);

  // Smoothly track Juro across the terrain (camera & orbit target follow Juro)
  useFrame((state, delta) => {
    const controls = controlsRef.current;
    const targetPos = targetPosRef?.current;
    if (!controls || !targetPos) return;

    // Desired focus: slightly elevated above Juro's feet
    const desiredX = targetPos.x;
    const desiredY = targetPos.y + 0.22;
    const desiredZ = targetPos.z;

    const curTarget = controls.target;
    const lerpFactor = Math.min(1, delta * 3.2);

    const nextX = THREE.MathUtils.lerp(curTarget.x, desiredX, lerpFactor);
    const nextY = THREE.MathUtils.lerp(curTarget.y, desiredY, lerpFactor);
    const nextZ = THREE.MathUtils.lerp(curTarget.z, desiredZ, lerpFactor);

    const dx = nextX - curTarget.x;
    const dy = nextY - curTarget.y;
    const dz = nextZ - curTarget.z;

    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001 || Math.abs(dz) > 0.0001) {
      curTarget.set(nextX, nextY, nextZ);
      state.camera.position.x += dx;
      state.camera.position.y += dy;
      state.camera.position.z += dz;
      controls.update();
    }
  });

  return null;
};
