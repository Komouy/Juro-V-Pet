import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  JuroModel,
  type JuroScreenTarget,
  type BathLiveState,
  type WalkCommand,
} from "../../../features/character/JuroModel";
import { OutdoorEnvironment } from "../OutdoorEnvironment";
import { ResponsiveCamera, type CameraMode } from "./ResponsiveCamera";
import { StorybookSky } from "../environment/StorybookSky";
import { detectSoftwareWebGL, type GraphicsProfile } from "../../../engine/world/graphicsProfile";
import { JURO_BED_SLOT_2 } from "../../../engine/world/mapTerrain";
import { type NormalizedWeather } from "../../../types/ui";
import type { TimeThemeConfig } from "../../../utils/timeOfDay";
import type { PetBehaviorState } from "../../../types/pet";
import type { PartnerPetState } from "../../../types/caregiver";
import { soundEffects } from "../../../engine/audio/soundEffects";
import { useCaregiverStore } from "../../../stores/caregiverStore";
import type { DragVisualState, WeatherPalette } from "./viewportConstants";

interface SceneCanvasProps {
  graphicsProfile: GraphicsProfile;
  isPaused?: boolean;
  onAdaptiveDowngrade?: () => void;
  setIsSoftwareGl: (software: boolean) => void;
  activePalette: WeatherPalette;
  normalizedWeather: NormalizedWeather;
  activeTheme: TimeThemeConfig;
  isRaining: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  juroWorldPosRef: React.RefObject<THREE.Vector3>;
  juroScreenPosRef: React.RefObject<JuroScreenTarget>;
  juroYawRef: React.RefObject<number>;
  bathStateRef: React.RefObject<BathLiveState>;
  isHeadingToBedRef: React.RefObject<boolean>;
  isHeadingToBenchRef: React.RefObject<boolean>;
  isHeadingToTrampolineRef: React.RefObject<boolean>;
  isDizzyRef: React.RefObject<boolean>;
  cameraMode: CameraMode;
  orbitEnabled: boolean;
  onOrbitStart: () => void;
  onOrbitChange: () => void;
  onOrbitEnd: () => void;
  walkCommand: WalkCommand | null;
  level: number;
  dragVisual: DragVisualState | null;
  partnerPet: PartnerPetState | null;
  showToast: (text: string, tone?: "success" | "warn" | "info") => void;
  onOpenShop: () => void;
  onOpenMine: () => void;
  onBedClick: () => void;
  onBedArrival: () => void;
  isBenchMenuOpen: boolean;
  onBenchClick: () => void;
  onSitOnBench: () => void;
  onStandFromBench: () => void;
  onCloseBenchMenu: () => void;
  onBenchArrival: () => void;
  isSittingOnBench: boolean;
  isTrampolineMenuOpen: boolean;
  onTrampolineClick: () => void;
  onStartBounce: () => void;
  onStopBounce: () => void;
  onCloseTrampolineMenu: () => void;
  onTrampolineArrival: () => void;
  isBouncingOnTrampoline: boolean;
  onGroundClick?: (point: { x: number; z: number }) => void;
  onDraggingPetChange: (dragging: boolean) => void;
  onPetClick: (screenPos?: { x: number; y: number }) => void;
  onPetPointerDown: () => void;
}

/**
 * Monitors active WebGL frame pacing and automatically downshifts graphics tier
 * if sustained frame times fall below ~23 FPS on constrained mobile devices.
 */
const PerformanceWatchdog: React.FC<{
  enabled: boolean;
  onDowngrade?: () => void;
}> = ({ enabled, onDowngrade }) => {
  const accumTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const triggeredRef = useRef(false);

  useFrame((_, delta) => {
    if (!enabled || triggeredRef.current || !onDowngrade) return;
    const clampedDelta = Math.min(delta, 0.25);
    accumTimeRef.current += clampedDelta;
    frameCountRef.current += 1;

    if (accumTimeRef.current >= 2.6) {
      const avgDelta = accumTimeRef.current / Math.max(1, frameCountRef.current);
      if (avgDelta > 0.044) {
        triggeredRef.current = true;
        onDowngrade();
      }
      accumTimeRef.current = 0;
      frameCountRef.current = 0;
    }
  });

  return null;
};

/**
 * 3D WebGL viewport canvas containing sky, lighting, outdoor valley landmarks,
 * primary and partner Juro characters, and camera orbit controls.
 */
export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  graphicsProfile,
  isPaused = false,
  onAdaptiveDowngrade,
  setIsSoftwareGl,
  activePalette,
  normalizedWeather,
  activeTheme,
  isRaining,
  controlsRef,
  juroWorldPosRef,
  juroScreenPosRef,
  juroYawRef,
  bathStateRef,
  isHeadingToBedRef,
  isHeadingToBenchRef,
  isHeadingToTrampolineRef,
  isDizzyRef,
  cameraMode,
  orbitEnabled,
  onOrbitStart,
  onOrbitChange,
  onOrbitEnd,
  walkCommand,
  level,
  dragVisual,
  partnerPet,
  showToast,
  onOpenShop,
  onOpenMine,
  onBedClick,
  onBedArrival,
  isBenchMenuOpen,
  onBenchClick,
  onSitOnBench,
  onStandFromBench,
  onCloseBenchMenu,
  onBenchArrival,
  isSittingOnBench,
  isTrampolineMenuOpen,
  onTrampolineClick,
  onStartBounce,
  onStopBounce,
  onCloseTrampolineMenu,
  onTrampolineArrival,
  isBouncingOnTrampoline,
  onGroundClick,
  onDraggingPetChange,
  onPetClick,
  onPetPointerDown,
}) => {
  return (
    <Canvas
      frameloop={isPaused ? "demand" : "always"}
      shadows={graphicsProfile.shadowsEnabled ? { type: THREE.PCFShadowMap } : false}
      camera={{ position: [11.5, 13.5, 13.5], fov: 42, near: 0.5, far: 180 }}
      dpr={graphicsProfile.dpr}
      onCreated={({ gl }) => {
        if (detectSoftwareWebGL(gl)) {
          setIsSoftwareGl(true);
        }
      }}
      gl={{
        antialias: graphicsProfile.antialias,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.88,
        stencil: false,
        depth: true,
      }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={[activePalette.sky]} />
        <fogExp2 attach="fog" args={[activePalette.sky, activePalette.fogDensity]} />

        <PerformanceWatchdog
          enabled={!isPaused && graphicsProfile.tier !== "low"}
          onDowngrade={onAdaptiveDowngrade}
        />

        <StorybookSky
          weather={normalizedWeather}
          isNight={activePalette.isNight}
          isRaining={isRaining}
          cloudSegments={graphicsProfile.cloudSegments}
        />

        <ResponsiveCamera
          controlsRef={controlsRef}
          targetPosRef={juroWorldPosRef}
          cameraMode={cameraMode}
        />

        <hemisphereLight
          args={[activePalette.hemiSky, activePalette.hemiGround, activePalette.hemiIntensity]}
        />
        <directionalLight
          position={[22, 30, 14]}
          color={activePalette.sunColor}
          intensity={activePalette.sunIntensity}
          castShadow={graphicsProfile.shadowsEnabled}
          shadow-mapSize={[graphicsProfile.shadowMapSize || 512, graphicsProfile.shadowMapSize || 512]}
          shadow-camera-near={4}
          shadow-camera-far={80}
          shadow-camera-left={-28}
          shadow-camera-right={28}
          shadow-camera-top={28}
          shadow-camera-bottom={-28}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
        />
        <directionalLight
          position={[-20, 14, -18]}
          color="#9ec8ff"
          intensity={activePalette.fillIntensity}
        />
        <directionalLight
          position={[-2.5, 2.0, 3.5]}
          intensity={activePalette.isNight ? 0.35 : 0.45}
          color="#FFF5EA"
        />

        <OutdoorEnvironment
          theme={activeTheme}
          weather={normalizedWeather}
          isRaining={isRaining}
          graphicsProfile={graphicsProfile}
          onOpenShop={onOpenShop}
          onOpenMine={onOpenMine}
          onBedClick={onBedClick}
          isBenchMenuOpen={isBenchMenuOpen}
          onBenchClick={onBenchClick}
          onSitOnBench={onSitOnBench}
          onStandFromBench={onStandFromBench}
          onCloseBenchMenu={onCloseBenchMenu}
          isSittingOnBench={isSittingOnBench}
          isTrampolineMenuOpen={isTrampolineMenuOpen}
          onTrampolineClick={onTrampolineClick}
          onStartBounce={onStartBounce}
          onStopBounce={onStopBounce}
          onCloseTrampolineMenu={onCloseTrampolineMenu}
          isBouncingOnTrampoline={isBouncingOnTrampoline}
          onGroundClick={onGroundClick}
        />

        <JuroModel
          onDraggingChange={onDraggingPetChange}
          bathStateRef={bathStateRef}
          juroScreenPosRef={juroScreenPosRef}
          juroWorldPosRef={juroWorldPosRef}
          juroYawRef={juroYawRef}
          walkCommand={walkCommand}
          onPetClick={onPetClick}
          onPetPointerDown={onPetPointerDown}
          isHeadingToBedRef={isHeadingToBedRef}
          onBedArrival={onBedArrival}
          isHeadingToBenchRef={isHeadingToBenchRef}
          onBenchArrival={onBenchArrival}
          isSittingOnBench={isSittingOnBench}
          isHeadingToTrampolineRef={isHeadingToTrampolineRef}
          onTrampolineArrival={onTrampolineArrival}
          isBouncingOnTrampoline={isBouncingOnTrampoline}
          isRaining={isRaining}
          isDizzyRef={isDizzyRef}
          level={level}
          sphereSegments={graphicsProfile.juroSphereSegs}
          usePhysicalMaterial={graphicsProfile.usePhysicalJuroBody}
          shadowsEnabled={graphicsProfile.shadowsEnabled}
          isBlowingBubbles={
            dragVisual !== null &&
            dragVisual.moved &&
            dragVisual.payload.kind === "toy" &&
            dragVisual.payload.toy.id === "bubble-blower"
          }
          isDraggingFood={
            dragVisual !== null &&
            dragVisual.moved &&
            dragVisual.payload.kind === "food"
          }
        />

        {partnerPet && (
          <JuroModel
            isPartner={true}
            customSkin={partnerPet.activeSkin}
            customHat={partnerPet.activeHat}
            level={partnerPet.level}
            partnerState={partnerPet.currentState as PetBehaviorState}
            isPartnerOnline={partnerPet.isOnline}
            initialPosition={JURO_BED_SLOT_2}
            partnerName={partnerPet.name}
            isRaining={isRaining}
            sphereSegments={graphicsProfile.juroSphereSegs}
            usePhysicalMaterial={graphicsProfile.usePhysicalJuroBody}
            shadowsEnabled={graphicsProfile.shadowsEnabled}
            onPetClick={() => {
              soundEffects.playPop();
              showToast(`Menyapa ${partnerPet.name} milik ${partnerPet.ownerName}!`, "info");
              useCaregiverStore.getState().recordAction(
                "interaction",
                `Menyapa ${partnerPet.name} milik ${partnerPet.ownerName} yang sedang berkunjung di lembah.`,
                { affection: 5, happiness: 5 }
              );
            }}
          />
        )}

        <OrbitControls
          ref={controlsRef}
          enabled={orbitEnabled}
          enablePan={cameraMode === "free"}
          enableZoom={true}
          enableRotate={cameraMode !== "isometric"}
          onStart={onOrbitStart}
          onChange={onOrbitChange}
          onEnd={onOrbitEnd}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: cameraMode === "free" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          }}
          minDistance={4.0}
          maxDistance={54.0}
          minPolarAngle={Math.PI * 0.12}
          maxPolarAngle={Math.PI * 0.465}
        />
      </Suspense>
    </Canvas>
  );
};
