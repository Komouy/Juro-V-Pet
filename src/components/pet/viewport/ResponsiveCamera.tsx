import React, { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useUIStore } from "../../../stores/uiStore";

export type CameraMode = "follow" | "isometric" | "free";

export interface ResponsiveCameraProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  targetPosRef?: React.RefObject<THREE.Vector3>;
  cameraMode?: CameraMode;
}

/**
 * Storybook Isometric Camera with full user exploration freedom:
 * - "follow" (default): Smoothly follows Juro across the entire valley while giving the user
 *   full freedom to orbit 360° horizontally, tilt, and zoom without breaking tracking.
 * - "isometric": Locks to classic storybook diagonal angle tracking Juro.
 * - "free": Unlocks camera pan so the user can freely explore any part of the valley.
 */
export const ResponsiveCamera: React.FC<ResponsiveCameraProps> = ({
  controlsRef,
  targetPosRef,
  cameraMode = "follow",
}) => {
  const { camera, size } = useThree();
  const cameraResetNonce = useUIStore((s) => s.cameraResetNonce);
  const lastTargetPos = useRef<THREE.Vector3>(new THREE.Vector3());

  // Configure OrbitControls based on active camera mode
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (cameraMode === "free") {
      controls.enablePan = true;
      controls.enableRotate = true;
      controls.enableZoom = true;
    } else {
      // In follow & isometric mode, pan is disabled so dragging smoothly rotates 360° around Juro
      controls.enablePan = false;
      controls.enableRotate = cameraMode === "follow";
      controls.enableZoom = true;
    }
  }, [controlsRef, cameraMode]);

  // Initial Framing or Global Camera Reset from Navbar / Focus Button
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const isPortrait = aspect < 0.85;

    const camOffsetX = isPortrait ? 10.5 : 9.5;
    const camOffsetY = isPortrait ? 12.8 : 11.2;
    const camOffsetZ = isPortrait ? 10.5 : 9.5;

    const initPos = targetPosRef?.current;
    const focusX = initPos ? initPos.x : 0;
    const focusY = initPos ? initPos.y + 0.45 : 0.0;
    const focusZ = initPos ? initPos.z : 0;

    camera.position.set(focusX + camOffsetX, focusY + camOffsetY, focusZ + camOffsetZ);
    camera.lookAt(focusX, focusY, focusZ);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(focusX, focusY, focusZ);
      controlsRef.current.minDistance = 4.0;
      controlsRef.current.maxDistance = 45.0;
      controlsRef.current.minPolarAngle = Math.PI * 0.12;
      controlsRef.current.maxPolarAngle = Math.PI * 0.44;
      controlsRef.current.enablePan = cameraMode === "free";
      controlsRef.current.enableZoom = true;
      controlsRef.current.enableRotate = cameraMode !== "isometric";
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.08;
      controlsRef.current.update();
      controlsRef.current.saveState();
    }

    if (initPos) lastTargetPos.current.copy(initPos);
  }, [camera, size.width, size.height, controlsRef, targetPosRef, cameraResetNonce, cameraMode]);

  // Frame loop: continuously track Juro when in "follow" or "isometric" mode
  useFrame((state, delta) => {
    const controls = controlsRef.current;
    const targetPos = targetPosRef?.current;
    if (!controls || !controls.target || !targetPos) return;
    if (
      typeof targetPos.x !== "number" ||
      typeof targetPos.y !== "number" ||
      typeof targetPos.z !== "number" ||
      typeof controls.target.x !== "number"
    ) {
      return;
    }

    if (cameraMode === "free") {
      controls.update();
      return;
    }

    const aspect = size.width / Math.max(1, size.height);
    const isPortrait = aspect < 0.85;

    if (cameraMode === "isometric") {
      const desiredTargetX = targetPos.x;
      const desiredTargetY = targetPos.y + 0.45;
      const desiredTargetZ = targetPos.z;

      const camOffsetX = isPortrait ? 10.5 : 9.5;
      const camOffsetY = isPortrait ? 12.8 : 11.2;
      const camOffsetZ = isPortrait ? 10.5 : 9.5;

      const lerpFactor = Math.min(1, delta * 6.0);
      controls.target.x = THREE.MathUtils.lerp(controls.target.x, desiredTargetX, lerpFactor);
      controls.target.y = THREE.MathUtils.lerp(controls.target.y, desiredTargetY, lerpFactor);
      controls.target.z = THREE.MathUtils.lerp(controls.target.z, desiredTargetZ, lerpFactor);

      state.camera.position.x = THREE.MathUtils.lerp(
        state.camera.position.x,
        desiredTargetX + camOffsetX,
        lerpFactor
      );
      state.camera.position.y = THREE.MathUtils.lerp(
        state.camera.position.y,
        desiredTargetY + camOffsetY,
        lerpFactor
      );
      state.camera.position.z = THREE.MathUtils.lerp(
        state.camera.position.z,
        desiredTargetZ + camOffsetZ,
        lerpFactor
      );

      controls.update();
      return;
    }

    // Default "follow" mode:
    // Controls orbit freely 360° around Juro at whatever custom angle/distance the user chooses.
    // When Juro moves, the camera translates along with Juro smoothly without altering the user's angle or zoom!
    const curTarget = controls.target;
    const desiredX = targetPos.x;
    const desiredY = targetPos.y + 0.45;
    const desiredZ = targetPos.z;

    const lerpFactor = Math.min(1, delta * 6.0);
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
    }

    controls.update();
  });

  return null;
};
