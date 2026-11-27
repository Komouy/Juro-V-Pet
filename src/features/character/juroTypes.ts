import type React from "react";
import type * as THREE from "three";
import type { PetBehaviorState } from "../../types/pet";

// Well-proportioned chibi storybook scale matching valley landmarks, bridge and furniture
export const JURO_BASE_SCALE = 1.05;
export const BODY_BOTTOM_LOCAL = 0.815;
export const BODY_BOTTOM_OFFSET = BODY_BOTTOM_LOCAL * JURO_BASE_SCALE;
export const JURO_COLLISION_RADIUS = 0.70;

export const Z_OFFSETS = [0, 0.33, 0.66] as const;

export const SOAP_BUBBLES_DATA = [
  { pos: [0.05, 0.88, 0.32] as [number, number, number], size: 0.22, threshold: 0.05, phase: 0.2 },
  { pos: [-0.36, 0.78, 0.45] as [number, number, number], size: 0.19, threshold: 0.1, phase: 1.1 },
  { pos: [0.42, 0.72, 0.42] as [number, number, number], size: 0.2, threshold: 0.16, phase: 2.3 },
  { pos: [-0.72, 0.48, 0.56] as [number, number, number], size: 0.21, threshold: 0.22, phase: 3.0 },
  { pos: [0.76, 0.44, 0.52] as [number, number, number], size: 0.18, threshold: 0.28, phase: 0.8 },
  { pos: [-0.15, 0.92, -0.05] as [number, number, number], size: 0.24, threshold: 0.34, phase: 1.9 },
  { pos: [0.28, 0.86, -0.12] as [number, number, number], size: 0.18, threshold: 0.4, phase: 2.7 },
  { pos: [-0.95, 0.08, 0.52] as [number, number, number], size: 0.19, threshold: 0.46, phase: 4.1 },
  { pos: [0.96, 0.06, 0.48] as [number, number, number], size: 0.2, threshold: 0.52, phase: 0.5 },
  { pos: [-0.58, -0.42, 0.76] as [number, number, number], size: 0.17, threshold: 0.58, phase: 1.5 },
  { pos: [0.62, -0.4, 0.74] as [number, number, number], size: 0.18, threshold: 0.64, phase: 2.9 },
  { pos: [0.0, 0.66, 0.72] as [number, number, number], size: 0.16, threshold: 0.7, phase: 3.8 },
  { pos: [-0.82, -0.25, 0.62] as [number, number, number], size: 0.16, threshold: 0.75, phase: 4.9 },
  { pos: [0.85, -0.22, 0.58] as [number, number, number], size: 0.17, threshold: 0.8, phase: 5.4 },
  { pos: [-0.32, -0.56, 0.72] as [number, number, number], size: 0.15, threshold: 0.85, phase: 1.3 },
  { pos: [0.34, -0.54, 0.72] as [number, number, number], size: 0.15, threshold: 0.9, phase: 2.2 },
  { pos: [-0.55, 0.74, -0.22] as [number, number, number], size: 0.18, threshold: 0.48, phase: 3.4 },
  { pos: [0.58, 0.68, -0.24] as [number, number, number], size: 0.19, threshold: 0.62, phase: 4.5 },
];

export const WATER_DROPS_DATA = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const spread = 0.22 + (i % 4) * 0.22;
  return {
    startX: Math.cos(angle) * (spread * 0.55),
    endX: Math.cos(angle) * (spread * 1.45),
    startZ: Math.sin(angle) * (spread * 0.45) + 0.15,
    endZ: Math.sin(angle) * (spread * 1.15) + 0.2,
    offset: (i * 0.17) % 1,
    speed: 1.7 + (i % 3) * 0.28,
  };
});

/**
 * Framerate-independent exponential damping for scalar values.
 */
export function dampExp(current: number, target: number, lambda: number, delta: number): number {
  const alpha = 1 - Math.exp(-lambda * Math.max(0, delta));
  return current + (target - current) * alpha;
}

/**
 * Framerate-independent exponential damping for angles (radians).
 */
export function dampAngleExp(current: number, target: number, lambda: number, delta: number): number {
  let diff = (target - current) % (Math.PI * 2);
  diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const alpha = 1 - Math.exp(-lambda * Math.max(0, delta));
  return current + diff * alpha;
}

export interface JuroScreenTarget {
  x: number;
  y: number;
  radiusPx: number;
  headY?: number;
}

export interface BathLiveState {
  soapLevel: number;
  isScrubbing: boolean;
  isRinsing: boolean;
}

export interface WalkCommand {
  x: number;
  z: number;
  nonce: number;
}

export interface JuroModelProps {
  onDraggingChange?: (dragging: boolean) => void;
  bathStateRef?: React.RefObject<BathLiveState>;
  juroScreenPosRef?: React.RefObject<JuroScreenTarget>;
  walkCommand?: WalkCommand | null;
  onPetClick?: (screenPos: { x: number; y: number }) => void;
  onPetPointerDown?: () => void;
  juroWorldPosRef?: React.RefObject<THREE.Vector3>;
  juroYawRef?: React.RefObject<number>;
  isHeadingToBedRef?: React.RefObject<boolean>;
  onBedArrival?: () => void;
  isHeadingToBenchRef?: React.RefObject<boolean>;
  onBenchArrival?: () => void;
  isSittingOnBench?: boolean;
  isHeadingToTrampolineRef?: React.RefObject<boolean>;
  onTrampolineArrival?: () => void;
  isBouncingOnTrampoline?: boolean;
  isBlowingBubbles?: boolean;
  isDraggingFood?: boolean;
  isRaining?: boolean;
  isDizzyRef?: React.RefObject<boolean>;
  level?: number;
  sphereSegments?: [number, number];
  usePhysicalMaterial?: boolean;
  shadowsEnabled?: boolean;
  // Dual-Pet 2-Player Properties
  customSkin?: string;
  customHat?: string;
  isPartner?: boolean;
  initialPosition?: { x: number; y?: number; z: number };
  partnerName?: string;
  partnerState?: PetBehaviorState;
  isPartnerOnline?: boolean;
}

export interface JumpState {
  active: boolean;
  elapsed: number;
  duration: number;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  peakY: number;
}

export interface FetchBallState {
  active: boolean;
  stage: "throwing" | "bouncing" | "ground" | "caught" | "returning";
  timer: number;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  ballX: number;
  ballY: number;
  ballZ: number;
  rotX: number;
  rotZ: number;
  bouncesPlayed: number;
  scale: number;
}

export interface StandState {
  active: boolean;
  x: number;
  y: number;
  z: number;
}

export interface JuroVisualRefs {
  groupRef: React.RefObject<THREE.Group | null>;
  leftEyeRef: React.RefObject<THREE.Group | null>;
  rightEyeRef: React.RefObject<THREE.Group | null>;
  sleepEyesRef: React.RefObject<THREE.Group | null>;
  petEyesRef: React.RefObject<THREE.Group | null>;
  leftCatchlightRef: React.RefObject<THREE.Mesh | null>;
  rightCatchlightRef: React.RefObject<THREE.Mesh | null>;
  leftSubCatchlightRef: React.RefObject<THREE.Mesh | null>;
  rightSubCatchlightRef: React.RefObject<THREE.Mesh | null>;
  mouthGroupRef: React.RefObject<THREE.Group | null>;
  hungryMouthGroupRef: React.RefObject<THREE.Group | null>;
  poutMouthGroupRef: React.RefObject<THREE.Group | null>;
  flatMouthGroupRef: React.RefObject<THREE.Group | null>;
  sleepyMouthGroupRef: React.RefObject<THREE.Group | null>;
  sleepMouthGroupRef: React.RefObject<THREE.Group | null>;
  sleepBubbleRef: React.RefObject<THREE.Mesh | null>;
  shadowRef: React.RefObject<THREE.Mesh | null>;
  leafUmbrellaRef: React.RefObject<THREE.Group | null>;
  crownRef: React.RefObject<THREE.Group | null>;
  propellerRef: React.RefObject<THREE.Group | null>;
  zzzGroupRef: React.RefObject<THREE.Group | null>;
  zSpriteRefs: React.RefObject<(THREE.Sprite | null)[]>;
  dizzyEyesGroupRef: React.RefObject<THREE.Group | null>;
  dizzyLeftEyeRef: React.RefObject<THREE.Mesh | null>;
  dizzyRightEyeRef: React.RefObject<THREE.Mesh | null>;
  dizzyMouthRef: React.RefObject<THREE.Mesh | null>;
  dizzyHaloRef: React.RefObject<THREE.Group | null>;
  dizzyStarRefs: React.RefObject<(THREE.Sprite | null)[]>;
  foodPropRef: React.RefObject<THREE.Group | null>;
  crumbsGroupRef: React.RefObject<THREE.Group | null>;
  heartBubbleRef: React.RefObject<THREE.Group | null>;
  worldToyRef: React.RefObject<THREE.Group | null>;
  worldToyMeshRef: React.RefObject<THREE.Group | null>;
  worldToyShadowRef: React.RefObject<THREE.Mesh | null>;
  bodyMeshRef: React.RefObject<THREE.Mesh | null>;
  salivaDripRef: React.RefObject<THREE.Group | null>;
  sweatDropRef: React.RefObject<THREE.Group | null>;
  angerSteamGroupRef: React.RefObject<THREE.Group | null>;
  sighCloudRef: React.RefObject<THREE.Group | null>;
  mudGroupRef: React.RefObject<THREE.Group | null>;
  dustGroupRef: React.RefObject<THREE.Group | null>;
  dustSpeckRefs: React.RefObject<(THREE.Mesh | null)[]>;
  leftCheekGroupRef: React.RefObject<THREE.Group | null>;
  rightCheekGroupRef: React.RefObject<THREE.Group | null>;
  leftCheekMatRef: React.RefObject<THREE.MeshBasicMaterial | null>;
  rightCheekMatRef: React.RefObject<THREE.MeshBasicMaterial | null>;
  soapFoamInstRef: React.RefObject<THREE.InstancedMesh | null>;
  waterDropsInstRef: React.RefObject<THREE.InstancedMesh | null>;
}
