import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SpringOscillator3D } from "../../engine/physics/SpringOscillator";
import { BehaviorStateMachine } from "../../engine/behavior/BehaviorStateMachine";
import { soundEffects } from "../../engine/audio/soundEffects";
import { usePetStore } from "../../stores/petStore";
import { useGameStore } from "../../stores/gameStore";
import { getSkinById } from "../../data/economyCatalog";
import { FoodProp3D, HeartPop3D } from "./FoodProp3D";
import { ToyProp3D, MusicalNote3D, PlayBubble3D } from "./ToyProp3D";
import {
  createSleepZTexture,
  createSoftShadowTexture,
  createDizzyEyeTexture,
  createDizzyMouthTexture,
  createDizzyStarTexture,
} from "./juroTextures";
import {
  BASE_GROUND_Y,
  MAP_BOUNDS,
  JURO_BED_POS,
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  getTerrainHeightAt,
  resolveHorizontalCollisions,
  isWaterAt,
  isInsideObstacle,
} from "../../engine/world/mapTerrain";
import { isBedtimeHour } from "../../utils/timeOfDay";

// Ultra-cute terrarium/aquarium miniature scale so Juro explores a lush big world
const JURO_BASE_SCALE = 0.36;
const BODY_BOTTOM_LOCAL = 0.815;
const BODY_BOTTOM_OFFSET = BODY_BOTTOM_LOCAL * JURO_BASE_SCALE;
const JURO_COLLISION_RADIUS = 1.14 * JURO_BASE_SCALE;

// Reusable module-level scratch objects (zero per-frame GC allocations)
const _projCenter = new THREE.Vector3();
const _projEdge = new THREE.Vector3();
const _bathDummy = new THREE.Object3D();
const _targetVec = new THREE.Vector3();
const _bedTargetVec = new THREE.Vector3();
const _benchTargetVec = new THREE.Vector3();
const _trampolineTargetVec = new THREE.Vector3();

function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
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
  isPettingActive?: boolean;
  juroWorldPosRef?: React.RefObject<THREE.Vector3>;
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
}

export const JuroModel: React.FC<JuroModelProps> = React.memo(({
  onDraggingChange: _onDraggingChange,
  bathStateRef,
  juroScreenPosRef,
  walkCommand,
  onPetClick,
  isPettingActive = false,
  juroWorldPosRef,
  isHeadingToBedRef,
  onBedArrival,
  isHeadingToBenchRef,
  onBenchArrival,
  isSittingOnBench = false,
  isHeadingToTrampolineRef,
  onTrampolineArrival,
  isBouncingOnTrampoline = false,
  isBlowingBubbles = false,
  isDraggingFood = false,
  isRaining = false,
  isDizzyRef,
  level = 1,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const sleepEyesRef = useRef<THREE.Group>(null);
  const leftCatchlightRef = useRef<THREE.Mesh>(null);
  const rightCatchlightRef = useRef<THREE.Mesh>(null);
  const leftSubCatchlightRef = useRef<THREE.Mesh>(null);
  const rightSubCatchlightRef = useRef<THREE.Mesh>(null);
  const mouthGroupRef = useRef<THREE.Group>(null);
  const hungryMouthGroupRef = useRef<THREE.Group>(null);
  const poutMouthGroupRef = useRef<THREE.Group>(null);
  const flatMouthGroupRef = useRef<THREE.Group>(null);
  const sleepyMouthGroupRef = useRef<THREE.Group>(null);
  const sleepMouthGroupRef = useRef<THREE.Group>(null);
  const sleepBubbleRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const leafUmbrellaRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Group>(null);
  const currentPetScaleRef = useRef(JURO_BASE_SCALE);
  const zzzGroupRef = useRef<THREE.Group>(null);
  const zSpriteRefs = useRef<(THREE.Sprite | null)[]>([]);

  // Dizzy ("Pusing") animation refs
  const dizzyEyesGroupRef = useRef<THREE.Group>(null);
  const dizzyLeftEyeRef = useRef<THREE.Mesh>(null);
  const dizzyRightEyeRef = useRef<THREE.Mesh>(null);
  const dizzyMouthRef = useRef<THREE.Mesh>(null);
  const dizzyHaloRef = useRef<THREE.Group>(null);
  const dizzyStarRefs = useRef<(THREE.Sprite | null)[]>([]);
  const dizzyRef = useRef({ buildup: 0, timer: 0, lastSoundAt: -10, dragAge: 0 });
  const petVelocityRef = useRef({ lastX: 0, lastY: 0, lastTime: 0, hasSample: false });
  const rapidTapHistoryRef = useRef<number[]>([]);

  // Eating animation refs
  const foodPropRef = useRef<THREE.Group>(null);
  const crumbsGroupRef = useRef<THREE.Group>(null);
  const heartBubbleRef = useRef<THREE.Group>(null);
  const eatingTimer = useRef(0);
  const lastBiteSoundRef = useRef(-1);

  // 3D Fetch Ball & Interactive World Toy Refs
  const worldToyRef = useRef<THREE.Group>(null);
  const worldToyMeshRef = useRef<THREE.Group>(null);
  const worldToyShadowRef = useRef<THREE.Mesh>(null);
  const playTimer = useRef(0);

  const fetchBallRef = useRef({
    active: false,
    stage: "throwing" as "throwing" | "bouncing" | "ground" | "caught" | "returning",
    timer: 0,
    startX: 0,
    startY: 0,
    startZ: 0,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    ballX: 0,
    ballY: 0,
    ballZ: 0,
    rotX: 0,
    rotZ: 0,
    bouncesPlayed: 0,
    scale: 1,
  });

  const bubbleStandRef = useRef({
    active: false,
    x: 0,
    y: 0,
    z: 0,
  });

  const radioStandRef = useRef({
    active: false,
    x: 0,
    y: 0,
    z: 0,
  });

  // Dynamic Expressions & Need-State Refs
  const bodyMeshRef = useRef<THREE.Mesh>(null);
  const salivaDripRef = useRef<THREE.Group>(null);
  const sweatDropRef = useRef<THREE.Group>(null);
  const angerSteamGroupRef = useRef<THREE.Group>(null);
  const sighCloudRef = useRef<THREE.Group>(null);
  const mudGroupRef = useRef<THREE.Group>(null);
  const dustGroupRef = useRef<THREE.Group>(null);
  const dustSpeckRefs = useRef<(THREE.Mesh | null)[]>([]);
  const leftCheekGroupRef = useRef<THREE.Group>(null);
  const rightCheekGroupRef = useRef<THREE.Group>(null);
  const leftCheekMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const rightCheekMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const dirtyShakeTimer = useRef({ nextShake: 5 + Math.random() * 4, timer: 0 });
  const tummyRumbleTimer = useRef({ nextRumble: 10 + Math.random() * 5, timer: 0 });
  const sleepyYawnTimer = useRef({ nextYawn: 12 + Math.random() * 6, timer: 0 });

  // Interactive Bath 3D effects (GPU-instanced for smooth mobile performance)
  const soapFoamInstRef = useRef<THREE.InstancedMesh>(null);
  const waterDropsInstRef = useRef<THREE.InstancedMesh>(null);

  const {
    currentState: storeState,
    currentFoodBeingEaten,
    currentToyBeingPlayed,
    clearToyBeingPlayed,
    setBehaviorState,
  } = usePetStore();
  const { activeSkin } = useGameStore();
  const skinPalette = getSkinById(activeSkin);

  // Behavior Finite State Machine
  const fsm = useMemo(() => new BehaviorStateMachine("idle"), []);

  // Crisp Zzz sprite, soft shadow & dizzy sprite textures (disposed cleanly on unmount)
  const sleepZTexture = useMemo(() => createSleepZTexture(), []);
  const softShadowTexture = useMemo(() => createSoftShadowTexture(), []);
  const dizzyEyeTexture = useMemo(() => createDizzyEyeTexture(), []);
  const dizzyMouthTexture = useMemo(() => createDizzyMouthTexture(), []);
  const dizzyStarTexture = useMemo(() => createDizzyStarTexture(), []);
  useEffect(() => {
    return () => {
      sleepZTexture?.dispose();
      softShadowTexture?.dispose();
      dizzyEyeTexture?.dispose();
      dizzyMouthTexture?.dispose();
      dizzyStarTexture?.dispose();
    };
  }, [sleepZTexture, softShadowTexture, dizzyEyeTexture, dizzyMouthTexture, dizzyStarTexture]);

  // 3D Spring oscillator for realistic gelatin physics (persists across all behavior states)
  const spring = useMemo(() => {
    const isNight = isBedtimeHour(new Date());
    const initialSleep = isNight || usePetStore.getState().currentState === "sleep";
    const initialLevel = usePetStore.getState().level;
    const initialGrowth = 0.68 + (Math.min(10, Math.max(1, initialLevel)) - 1) * (0.52 / 9);
    const initBottom = BODY_BOTTOM_LOCAL * JURO_BASE_SCALE * initialGrowth;

    if (initialSleep) {
      const bedGroundY = getTerrainHeightAt(JURO_BED_POS.x, JURO_BED_POS.z);
      return new SpringOscillator3D(
        new THREE.Vector3(JURO_BED_POS.x, bedGroundY + 0.120 + initBottom * 0.88, JURO_BED_POS.z),
        {
          stiffness: 145,
          damping: 10,
          mass: 1,
        }
      );
    }
    const savedPos = usePetStore.getState().lastPosition;
    if (savedPos && Number.isFinite(savedPos.x) && Number.isFinite(savedPos.z)) {
      const groundY = getTerrainHeightAt(savedPos.x, savedPos.z);
      return new SpringOscillator3D(
        new THREE.Vector3(savedPos.x, groundY + initBottom, savedPos.z),
        {
          stiffness: 145,
          damping: 10,
          mass: 1,
        }
      );
    }
    return new SpringOscillator3D(new THREE.Vector3(0, BASE_GROUND_Y + initBottom, 0.2), {
      stiffness: 145,
      damping: 10,
      mass: 1,
    });
  }, []);

  // Persist Juro's position across route transitions (e.g. navigating to Shop, Mine, Evolution, etc.)
  useEffect(() => {
    return () => {
      const pos = spring.position;
      if (Number.isFinite(pos.x) && Number.isFinite(pos.z)) {
        usePetStore.getState().setLastPosition({ x: pos.x, y: pos.y, z: pos.z });
      }
    };
  }, [spring]);

  // Parabolic jump-up / hop-down state when climbing hills, bridges & stumps
  const jumpRef = useRef({
    active: false,
    elapsed: 0,
    duration: 0.58,
    startX: 0,
    startY: BASE_GROUND_Y + BODY_BOTTOM_OFFSET,
    startZ: 0.2,
    endX: 0,
    endY: BASE_GROUND_Y + BODY_BOTTOM_OFFSET,
    endZ: 0.2,
    peakY: 0,
  });

  // Timer to repath immediately if blocked by an obstacle while wandering
  const blockedTimerRef = useRef(0);
  const snoreTimerRef = useRef(0);
  const scrubSoundTimerRef = useRef(0);

  // Sync external store triggers (feed, play, sleep) with FSM
  useEffect(() => {
    if (storeState && storeState !== fsm.currentState && fsm.currentState !== "dragging") {
      fsm.transitionTo(storeState, true);
    }
  }, [storeState, fsm]);

  // Respond when user clicks/taps a spot on the 3D valley map (do NOT wake Juro while sleeping!)
  useEffect(() => {
    if (!walkCommand) return;
    if (usePetStore.getState().currentState === "sleep") return;
    const rawX = THREE.MathUtils.clamp(walkCommand.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
    const rawZ = THREE.MathUtils.clamp(walkCommand.z, MAP_BOUNDS.minZ, MAP_BOUNDS.maxZ);
    const isBedTarget =
      Boolean(isHeadingToBedRef?.current) ||
      Math.hypot(rawX - JURO_BED_POS.x, rawZ - JURO_BED_POS.z) < 0.25;
    const isBenchTarget =
      Boolean(isHeadingToBenchRef?.current) ||
      Math.hypot(rawX - JURO_BENCH_POS.x, rawZ - JURO_BENCH_POS.z) < 0.25;

    let targetX = rawX;
    let targetZ = rawZ;

    if (isBedTarget) {
      targetX = JURO_BED_POS.x;
      targetZ = JURO_BED_POS.z;
    } else if (isBenchTarget) {
      targetX = JURO_BENCH_POS.x;
      targetZ = JURO_BENCH_POS.z;
    } else {
      const rawSurface = getTerrainHeightAt(rawX, rawZ);
      const safeTarget = resolveHorizontalCollisions(
        rawX,
        rawZ,
        rawSurface,
        JURO_COLLISION_RADIUS,
        true,
        false,
        false
      );
      targetX = safeTarget.x;
      targetZ = safeTarget.z;
    }

    const ty = isBenchTarget ? JURO_BENCH_POS.seatY : getTerrainHeightAt(targetX, targetZ);
    fsm.wanderTarget.set(targetX, ty, targetZ);
    fsm.transitionTo("wander", true);
    fsm.stateDuration = isBedTarget || isBenchTarget ? 24.0 : 9.0;
    fsm.timeInState = 0;
    setBehaviorState("wander");
  }, [walkCommand, fsm, setBehaviorState, isHeadingToBedRef, isHeadingToBenchRef]);

  // Eye blinking state
  const blinkState = useRef({ timer: 0, nextBlink: 2.5, isBlinking: false });

  // 3 staggered floating Z particle offsets
  const zOffsets = useMemo(() => [0, 0.33, 0.66], []);

  // 18 cozy 3D soap foam bubbles distributed smoothly around Juro's chubby crown, cheeks & sides
  const soapBubblesData = useMemo(
    () => [
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
    ],
    []
  );

  // 18 cascading blue water shower droplets for bucket rinsing animation
  const waterDropsData = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
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
      }),
    []
  );

  const { camera, size } = useThree();

  // 1. Sculpted Chubby Jelly Body Geometry with Smooth Vertex Colors
  const outerBodyGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.0, 64, 48);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();

    const faceCenter = new THREE.Vector3(0, 0.02, 1.02);
    const cCenter = new THREE.Color(skinPalette.centerColor);
    const cMid = new THREE.Color(skinPalette.midColor);
    const cEdge = new THREE.Color(skinPalette.edgeColor);
    const tempColor = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Chubby wide cushion proportions
      v.x *= 1.15;
      v.y *= 0.94;
      v.z *= 1.02;

      // Smoothly flatten bottom base so Juro rests snugly like pudding
      if (v.y < -0.44) {
        const flat = (-v.y - 0.44) / 0.5;
        v.y += flat * 0.13;
        v.x *= 1 + flat * 0.05;
        v.z *= 1 + flat * 0.05;
      }

      // Gentle soft dumpling wave on top-right crown
      if (v.y > 0.48) {
        const topH = (v.y - 0.48) / 0.46;
        const smoothTop = topH * topH;
        const crestWave =
          Math.exp(-Math.pow((v.x - 0.28) * 2.1 + (v.z - 0.05) * 1.8, 2)) * 0.1 * smoothTop;
        const indent =
          Math.exp(-Math.pow((v.x + 0.15) * 2.4 + (v.z - 0.15) * 2.0, 2)) * -0.045 * smoothTop;
        v.y += crestWave + indent;
      }

      pos.setXYZ(i, v.x, v.y, v.z);

      // Luminous vertex color gradient (milky center -> glossy honey orange rim)
      const distFromFace = v.distanceTo(faceCenter);
      const radialT = THREE.MathUtils.clamp((distFromFace - 0.12) / 1.15, 0, 1);
      const smoothRadial = radialT * radialT * (3 - 2 * radialT);

      const bottomOrange = THREE.MathUtils.clamp((-v.y - 0.42) / 0.42, 0, 1);
      const topOrange = THREE.MathUtils.clamp((v.y - 0.56) / 0.36, 0, 1);

      const t = THREE.MathUtils.clamp(
        smoothRadial * 0.88 + bottomOrange * 0.45 + topOrange * 0.55,
        0,
        1
      );

      if (t < 0.5) {
        tempColor.lerpColors(cCenter, cMid, t * 2);
      } else {
        tempColor.lerpColors(cMid, cEdge, (t - 0.5) * 2);
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [skinPalette.centerColor, skinPalette.midColor, skinPalette.edgeColor]);

  // Dispose custom sculpted body geometry on unmount or skin change (prevents WebGL GPU memory leak)
  useEffect(() => {
    return () => {
      outerBodyGeometry.dispose();
    };
  }, [outerBodyGeometry]);

  // 2. Smiling Open Mouth Geometry
  const mouthShape = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 0.145;
    const h = 0.115;
    shape.moveTo(-w, 0.01);
    shape.quadraticCurveTo(0, -0.01, w, 0.01);
    shape.quadraticCurveTo(w * 0.9, -h * 1.45, 0, -h * 1.45);
    shape.quadraticCurveTo(-w * 0.9, -h * 1.45, -w, 0.01);
    return shape;
  }, []);

  const tongueShape = useMemo(() => {
    const shape = new THREE.Shape();
    const tw = 0.095;
    const th = 0.075;
    shape.moveTo(-tw, -0.075);
    shape.quadraticCurveTo(0, -0.01, tw, -0.075);
    shape.quadraticCurveTo(tw * 0.65, -th * 2.0, 0, -th * 2.0);
    shape.quadraticCurveTo(-tw * 0.65, -th * 2.0, -tw, -0.075);
    return shape;
  }, []);

  // 3. Dedicated Expressive Mouth Geometries (Hungry "o", Grumpy Pout, Bored Flat)
  const hungryMouthShape = useMemo(() => {
    const shape = new THREE.Shape();
    // A cute small trembling sad longing "o" mouth: rounded oval
    const rw = 0.056;
    const rh = 0.072;
    shape.absellipse(0, -0.04, rw, rh, 0, Math.PI * 2, false, 0);
    return shape;
  }, []);

  const poutMouthShape = useMemo(() => {
    const shape = new THREE.Shape();
    // Turned down frown arc / pout: ( ︵ )
    const pw = 0.105;
    shape.moveTo(-pw, -0.065);
    shape.quadraticCurveTo(0, -0.025, pw, -0.065);
    shape.quadraticCurveTo(pw * 0.9, -0.08, 0, -0.05);
    shape.quadraticCurveTo(-pw * 0.9, -0.08, -pw, -0.065);
    return shape;
  }, []);

  const flatMouthShape = useMemo(() => {
    const shape = new THREE.Shape();
    // Flat horizontal neutral slit: ( — )
    const fw = 0.085;
    shape.moveTo(-fw, -0.05);
    shape.lineTo(fw, -0.05);
    shape.lineTo(fw, -0.065);
    shape.lineTo(-fw, -0.065);
    return shape;
  }, []);

  const sleepyMouthShape = useMemo(() => {
    const shape = new THREE.Shape();
    // Cute, tiny, relaxed sleepy mouth (not smiling, no tongue, tiny gentle line)
    const sw = 0.052;
    const sh = 0.012;
    shape.moveTo(-sw, -0.055);
    shape.quadraticCurveTo(0, -0.058, sw, -0.055);
    shape.quadraticCurveTo(sw * 0.9, -0.055 - sh, 0, -0.055 - sh * 0.85);
    shape.quadraticCurveTo(-sw * 0.9, -0.055 - sh, -sw, -0.055);
    return shape;
  }, []);

  // Handle Petting Mode (Elus) activation / focus
  useEffect(() => {
    if (isPettingActive) {
      jumpRef.current.active = false;
      if (fsm.currentState !== "sleep") {
        fsm.transitionTo("happy", true);
        setBehaviorState("happy");
      }
    }
  }, [isPettingActive, fsm, setBehaviorState]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Update Autonomous Behavior Engine with live pet attributes & mood (no closure staleness!)
    const livePetStore = usePetStore.getState();
    const liveAttributes = livePetStore.getAttributes();
    const liveMood = livePetStore.getMood();

    if (isHeadingToBedRef?.current) {
      // Keep Juro locked into wander mode moving towards bed without autonomous distraction
      if (fsm.currentState !== "wander") {
        fsm.transitionTo("wander", true);
        setBehaviorState("wander");
      }
      fsm.stateDuration = 24.0;
      fsm.timeInState = 0;
    } else if (isHeadingToBenchRef?.current) {
      // Keep Juro locked into wander mode moving towards park bench without autonomous distraction
      if (fsm.currentState !== "wander") {
        fsm.transitionTo("wander", true);
        setBehaviorState("wander");
      }
      fsm.stateDuration = 24.0;
      fsm.timeInState = 0;
    } else if (isSittingOnBench) {
      // Keep Juro sitting contentedly on the park bench
      if (fsm.currentState !== "idle") {
        fsm.transitionTo("idle", true);
        setBehaviorState("idle");
      }
      fsm.stateDuration = 999.0;
      fsm.timeInState = 0;
    } else if (isHeadingToTrampolineRef?.current) {
      if (fsm.currentState !== "wander") {
        fsm.transitionTo("wander", true);
        setBehaviorState("wander");
      }
      fsm.stateDuration = 24.0;
      fsm.timeInState = 0;
    } else if (isBouncingOnTrampoline) {
      if (fsm.currentState !== "happy") {
        fsm.transitionTo("happy", true);
        setBehaviorState("happy");
      }
      fsm.stateDuration = 999.0;
      fsm.timeInState = 0;
    } else {
      const activeState = fsm.update(delta, liveAttributes, liveMood);
      if (activeState !== storeState) {
        setBehaviorState(activeState);
      }
    }

    const currentState = fsm.currentState;
    const isSleepingNow = currentState === "sleep";
    const isEatingNow = currentState === "eating";
    const isPlayingToyNow = currentToyBeingPlayed !== null;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const motionScale = prefersReduced ? 0.3 : 1;
    const isNightSleepy = isBedtimeHour();
    const isSleepy = isNightSleepy || liveAttributes.energy < 45;

    // Update dizzy timers & recovery buildup
    if (dizzyRef.current.timer > 0) {
      dizzyRef.current.timer = Math.max(0, dizzyRef.current.timer - delta);
    }
    if (dizzyRef.current.buildup > 0) {
      dizzyRef.current.buildup = Math.max(0, dizzyRef.current.buildup - delta * 1.5);
    }

    // Dynamic trigger: vigorous petting speed calculation
    if (isPettingActive && currentState !== "sleep") {
      const nowMs = performance.now();
      if (petVelocityRef.current.hasSample) {
        const dtSec = Math.max((nowMs - petVelocityRef.current.lastTime) / 1000, 0.016);
        const dx = state.pointer.x - petVelocityRef.current.lastX;
        const dy = state.pointer.y - petVelocityRef.current.lastY;
        const pSpeed = Math.hypot(dx, dy) / dtSec;
        if (pSpeed > 5.0) {
          dizzyRef.current.buildup = Math.min(2.5, dizzyRef.current.buildup + delta * (pSpeed * 0.45));
          if (dizzyRef.current.buildup >= 1.25 && dizzyRef.current.timer <= 0.2) {
            dizzyRef.current.timer = 3.2;
            dizzyRef.current.buildup = 0;
            soundEffects.playDizzy();
          }
        }
      }
      petVelocityRef.current = {
        lastX: state.pointer.x,
        lastY: state.pointer.y,
        lastTime: nowMs,
        hasSample: true,
      };
    } else {
      petVelocityRef.current.hasSample = false;
    }

    // Dynamic trigger: rapid soap scrubbing during bath
    const liveBathForDizzy = bathStateRef?.current;
    if (liveBathForDizzy?.isScrubbing && currentState !== "sleep") {
      dizzyRef.current.buildup = Math.min(2.5, dizzyRef.current.buildup + delta * 0.45);
      if (dizzyRef.current.buildup >= 1.4 && dizzyRef.current.timer <= 0.2) {
        dizzyRef.current.timer = 3.0;
        dizzyRef.current.buildup = 0;
        soundEffects.playDizzy();
      }
    }

    // Dynamic physical pet growth based on level (0.68x baby -> 1.20x adult noble)
    const growthFactor = 0.68 + (Math.min(10, Math.max(1, level)) - 1) * (0.52 / 9);
    const currentPetScale = JURO_BASE_SCALE * growthFactor;
    currentPetScaleRef.current = currentPetScale;
    const currentBottomOffset = BODY_BOTTOM_LOCAL * currentPetScale;

    // 2. Behavior Position, Slime Drag-Crawl & Jump-Up Calculations across the 3D Valley Map
    let crawlScaleX = 1;
    let crawlScaleY = 1;
    let crawlScaleZ = 1;

    if (isHeadingToBedRef?.current) {
      const distToBed = Math.hypot(
        spring.position.x - JURO_BED_POS.x,
        spring.position.z - JURO_BED_POS.z
      );
      if (distToBed < 0.35) {
        spring.position.x = JURO_BED_POS.x;
        spring.position.z = JURO_BED_POS.z;
        spring.target.x = JURO_BED_POS.x;
        spring.target.z = JURO_BED_POS.z;
        spring.velocity.set(0, 0, 0);
        onBedArrival?.();
      }
    }

    if (isHeadingToBenchRef?.current) {
      const distToBench = Math.hypot(
        spring.position.x - JURO_BENCH_POS.x,
        spring.position.z - JURO_BENCH_POS.z
      );
      if (distToBench < 0.38) {
        spring.position.x = JURO_BENCH_POS.x;
        spring.position.z = JURO_BENCH_POS.z;
        spring.target.x = JURO_BENCH_POS.x;
        spring.target.z = JURO_BENCH_POS.z;
        spring.velocity.set(0, 0, 0);
        onBenchArrival?.();
      }
    }

    if (isHeadingToTrampolineRef?.current) {
      const distToTrampoline = Math.hypot(
        spring.position.x - JURO_TRAMPOLINE_POS.x,
        spring.position.z - JURO_TRAMPOLINE_POS.z
      );
      if (distToTrampoline < 0.38) {
        spring.position.x = JURO_TRAMPOLINE_POS.x;
        spring.position.z = JURO_TRAMPOLINE_POS.z;
        spring.target.x = JURO_TRAMPOLINE_POS.x;
        spring.target.z = JURO_TRAMPOLINE_POS.z;
        spring.velocity.set(0, 0, 0);
        onTrampolineArrival?.();
      }
    }

    const currGroundY = getTerrainHeightAt(spring.position.x, spring.position.z);
    const restY = currGroundY + currentBottomOffset;

      if (currentState === "wander") {
        const j = jumpRef.current;

        if (j.active) {
          // Parabolic jump arc onto higher terrace/stump/bridge (or hop down!)
          j.elapsed += delta;
          const p = Math.min(1, j.elapsed / j.duration);
          const jx = THREE.MathUtils.lerp(j.startX, j.endX, p);
          const jz = THREE.MathUtils.lerp(j.startZ, j.endZ, p);
          const baseArcY = THREE.MathUtils.lerp(j.startY, j.endY, p);
          const arcLift = 4 * p * (1 - p) * Math.max(0.25, j.peakY - Math.max(j.startY, j.endY));
          _targetVec.set(jx, baseArcY + arcLift, jz);
          spring.setTarget(_targetVec);

          // Anticipation -> airborne vertical stretch -> squishy landing
          if (p < 0.16) {
            crawlScaleY = 0.8;
            crawlScaleX = 1.13;
            crawlScaleZ = 1.13;
          } else if (p < 0.82) {
            crawlScaleY = 1.2;
            crawlScaleX = 0.9;
            crawlScaleZ = 0.92;
          } else {
            crawlScaleY = 0.82;
            crawlScaleX = 1.14;
            crawlScaleZ = 1.14;
          }

          if (isSleepy) {
            // Heavily dampen bouncy squishing & stretching during sleepy hops
            crawlScaleY = THREE.MathUtils.lerp(1.0, crawlScaleY, 0.35);
            crawlScaleX = THREE.MathUtils.lerp(1.0, crawlScaleX, 0.35);
            crawlScaleZ = THREE.MathUtils.lerp(1.0, crawlScaleZ, 0.35);
          }

          if (p >= 1) {
            j.active = false;
            soundEffects.playPlop();
          }
        } else {
          const currentTarget = isHeadingToBedRef?.current
            ? _bedTargetVec.set(
                JURO_BED_POS.x,
                getTerrainHeightAt(JURO_BED_POS.x, JURO_BED_POS.z),
                JURO_BED_POS.z
              )
            : isHeadingToBenchRef?.current
            ? _benchTargetVec.set(
                JURO_BENCH_POS.x,
                JURO_BENCH_POS.seatY,
                JURO_BENCH_POS.z
              )
            : isHeadingToTrampolineRef?.current
            ? _trampolineTargetVec.set(
                JURO_TRAMPOLINE_POS.x,
                JURO_TRAMPOLINE_POS.surfaceY,
                JURO_TRAMPOLINE_POS.z
              )
            : fsm.wanderTarget;
          const dx = currentTarget.x - spring.position.x;
          const dz = currentTarget.z - spring.position.z;
          const dist = Math.hypot(dx, dz);

          if (dist > 0.16) {
            const dirX = dx / dist;
            const dirZ = dz / dist;

            // Smoothly face 3D direction of travel
            if (groupRef.current) {
              const targetYaw = Math.atan2(dirX, dirZ);
              groupRef.current.rotation.y = lerpAngle(
                groupRef.current.rotation.y,
                targetYaw,
                isSleepy ? 0.08 : 0.16
              );
            }

            // Authentic Slime Drag-Stretch Crawl (slower, lazier, dampened boing-boing when sleepy)
            const crawlCycleSpeed = isSleepy ? 3.4 : 6.8;
            const cycle = t * crawlCycleSpeed;
            const wave = Math.sin(cycle);
            const boingScale = isSleepy ? 0.32 : 1.0;
            const speedMult = isSleepy ? 0.52 : 1.0;
            let crawlSpeed: number;
            if (wave >= 0) {
              // Reach forward: elongate along local Z, slim & lower slightly
              crawlScaleZ = 1 + wave * 0.24 * motionScale * boingScale;
              crawlScaleX = 1 - wave * 0.11 * motionScale * boingScale;
              crawlScaleY = 1 - wave * 0.12 * motionScale * boingScale;
              crawlSpeed = 0.65 * speedMult;
            } else {
              // Drag trailing jelly body forward in a plump surge!
              const pull = -wave;
              crawlScaleZ = 1 - pull * 0.16 * motionScale * boingScale;
              crawlScaleX = 1 + pull * 0.13 * motionScale * boingScale;
              crawlScaleY = 1 + pull * 0.14 * motionScale * boingScale;
              crawlSpeed = 2.25 * speedMult;
            }

            // Check ahead for higher elevation (hill, stump, rock ledge, bridge) -> trigger jump!
            const probeDist = Math.min(dist, 0.62);
            const probeX = THREE.MathUtils.clamp(
              spring.position.x + dirX * probeDist,
              MAP_BOUNDS.minX,
              MAP_BOUNDS.maxX
            );
            const probeZ = THREE.MathUtils.clamp(
              spring.position.z + dirZ * probeDist,
              MAP_BOUNDS.minZ,
              MAP_BOUNDS.maxZ
            );
            const aheadGroundY = getTerrainHeightAt(probeX, probeZ);

            if (aheadGroundY > currGroundY + 0.05 || aheadGroundY < currGroundY - 0.14) {
              const isHeadingSpecial =
                (isHeadingToBedRef?.current ?? false) ||
                (isHeadingToBenchRef?.current ?? false) ||
                (isHeadingToTrampolineRef?.current ?? false);
              const safeLanding = isHeadingSpecial
                ? { x: probeX, z: probeZ }
                : resolveHorizontalCollisions(
                    probeX,
                    probeZ,
                    aheadGroundY,
                    JURO_COLLISION_RADIUS,
                    true,
                    isHeadingToBedRef?.current ?? false,
                    isHeadingToBenchRef?.current ?? false,
                    isHeadingToTrampolineRef?.current ?? false
                  );
              const landSurfaceY = getTerrainHeightAt(safeLanding.x, safeLanding.z);
              j.active = true;
              j.elapsed = 0;
              soundEffects.playHop();
              j.duration = isSleepy ? 0.62 : 0.42;
              j.startX = spring.position.x;
              j.startY = spring.position.y;
              j.startZ = spring.position.z;
              j.endX = safeLanding.x;
              j.endZ = safeLanding.z;
              j.endY = landSurfaceY + currentBottomOffset;
              j.peakY =
                Math.max(currGroundY, landSurfaceY) +
                currentBottomOffset +
                (isSleepy ? 0.2 : 0.42);
            } else {
              const step = Math.min(dist, crawlSpeed * delta * motionScale);
              const rawNextX = spring.position.x + dirX * step;
              const rawNextZ = spring.position.z + dirZ * step;
              const isHeadingSpecial =
                (isHeadingToBedRef?.current ?? false) ||
                (isHeadingToBenchRef?.current ?? false) ||
                (isHeadingToTrampolineRef?.current ?? false);
              const resolvedStep = isHeadingSpecial
                ? { x: rawNextX, z: rawNextZ, hitObstacle: false }
                : resolveHorizontalCollisions(
                    rawNextX,
                    rawNextZ,
                    currGroundY,
                    JURO_COLLISION_RADIUS,
                    false,
                    isHeadingToBedRef?.current ?? false,
                    isHeadingToBenchRef?.current ?? false,
                    isHeadingToTrampolineRef?.current ?? false
                  );

              // If grazing an obstacle, add subtle tangential slide so Juro curves around rocks/trees!
              let finalX = resolvedStep.x;
              let finalZ = resolvedStep.z;
              if (resolvedStep.hitObstacle) {
                const tangentX = -dirZ * step * 0.7;
                const tangentZ = dirX * step * 0.7;
                const slid = resolveHorizontalCollisions(
                  finalX + tangentX,
                  finalZ + tangentZ,
                  currGroundY,
                  JURO_COLLISION_RADIUS,
                  false,
                  isHeadingToBedRef?.current ?? false,
                  isHeadingToBenchRef?.current ?? false,
                  isHeadingToTrampolineRef?.current ?? false
                );
                finalX = slid.x;
                finalZ = slid.z;
              }

              const nextGroundY = getTerrainHeightAt(finalX, finalZ);
              const inWaterStep = isWaterAt(finalX, finalZ);
              const waterFloat = inWaterStep ? Math.sin(t * 3.5) * 0.016 : 0;
              _targetVec.set(finalX, nextGroundY + currentBottomOffset + waterFloat, finalZ);
              spring.setTarget(_targetVec);

              if (groupRef.current) {
                groupRef.current.rotation.x = THREE.MathUtils.lerp(
                  groupRef.current.rotation.x,
                  wave > 0 ? 0.08 * motionScale : -0.04 * motionScale,
                  0.14
                );
                groupRef.current.rotation.z = THREE.MathUtils.lerp(
                  groupRef.current.rotation.z,
                  Math.sin(cycle * 0.5) * 0.05 * motionScale,
                  0.12
                );
              }
            }
          } else {
            // Reached destination! Settle happily on current spot (with buoyant float if in water)
            const inWaterRest = isWaterAt(spring.position.x, spring.position.z);
            const waterFloatRest = inWaterRest ? Math.sin(t * 2.6) * 0.018 : 0;
            _targetVec.set(spring.position.x, restY + waterFloatRest, spring.position.z);
            spring.setTarget(_targetVec);
            usePetStore.getState().setLastPosition({
              x: spring.position.x,
              y: restY + waterFloatRest,
              z: spring.position.z,
            });
            if (groupRef.current) {
              groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
              groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.1);
            }
          }
        }
      } else {
        jumpRef.current.active = false;

        if (currentState === "curious") {
          _targetVec.set(
            spring.position.x,
            restY + Math.sin(t * 1.5) * 0.025 * motionScale,
            spring.position.z
          );
          spring.setTarget(_targetVec);

          if (groupRef.current) {
            groupRef.current.rotation.z = THREE.MathUtils.lerp(
              groupRef.current.rotation.z,
              0.12 * motionScale,
              0.1
            );
            groupRef.current.rotation.y = lerpAngle(
              groupRef.current.rotation.y,
              fsm.lookTarget.x * 0.45,
              0.08
            );
          }
        } else if (currentState === "happy") {
          const bounceY = restY + Math.abs(Math.sin(t * 7)) * 0.24 * motionScale;
          _targetVec.set(spring.position.x, bounceY, spring.position.z);
          spring.setTarget(_targetVec);

          if (groupRef.current) {
            groupRef.current.rotation.z = Math.sin(t * 7) * 0.07 * motionScale;
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0, 0.08);
          }
        } else if (currentState === "play") {
          const isBounceBall = currentToyBeingPlayed?.id === "bounce-ball";
          if (isBounceBall) {
            const fb = fetchBallRef.current;
            if (fb.stage === "throwing") {
              // Watch the ball flying across the meadow in excitement!
              const lookAngle = Math.atan2(fb.ballX - spring.position.x, fb.ballZ - spring.position.z);
              if (groupRef.current) {
                groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, lookAngle, 0.2);
              }
              const anticipHop = restY + Math.abs(Math.sin(t * 8)) * 0.08 * motionScale;
              _targetVec.set(spring.position.x, anticipHop, spring.position.z);
              spring.setTarget(_targetVec);
            } else if (fb.stage === "bouncing" || fb.stage === "ground") {
              // Chase & fetch the ball!
              const dx = fb.targetX - spring.position.x;
              const dz = fb.targetZ - spring.position.z;
              const dist = Math.hypot(dx, dz);
              if (dist > 0.42) {
                const dirX = dx / dist;
                const dirZ = dz / dist;
                const targetYaw = Math.atan2(dirX, dirZ);
                if (groupRef.current) {
                  groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, targetYaw, 0.22);
                }

                const cycle = t * 7.5;
                const wave = Math.sin(cycle);
                const stepSpeed = wave >= 0 ? 2.4 : 3.4;
                const step = Math.min(dist, stepSpeed * delta * motionScale);
                const rawNextX = spring.position.x + dirX * step;
                const rawNextZ = spring.position.z + dirZ * step;
                const resolved = resolveHorizontalCollisions(
                  rawNextX,
                  rawNextZ,
                  currGroundY,
                  JURO_COLLISION_RADIUS,
                  true,
                  false
                );

                crawlScaleZ = 1 + wave * 0.22 * motionScale;
                crawlScaleX = 1 - wave * 0.12 * motionScale;
                crawlScaleY = 1 - wave * 0.10 * motionScale;

                const nextGroundY = getTerrainHeightAt(resolved.x, resolved.z);
                _targetVec.set(resolved.x, nextGroundY + currentBottomOffset, resolved.z);
                spring.setTarget(_targetVec);
              } else {
                // Reached the ball! Catch it!
                fb.stage = "caught";
                fb.timer = 0;
                soundEffects.playHappy();
                soundEffects.playHop();
                spring.applyImpulse(new THREE.Vector3(0, 2.8, 0));
                _targetVec.set(spring.position.x, restY, spring.position.z);
                spring.setTarget(_targetVec);
              }
            } else if (fb.stage === "caught") {
              // Hold ball happily and celebrate with hops & wiggles!
              const happyHop = restY + Math.abs(Math.sin(t * 8)) * 0.18 * motionScale;
              _targetVec.set(spring.position.x, happyHop, spring.position.z);
              spring.setTarget(_targetVec);
              if (groupRef.current) {
                groupRef.current.rotation.z = Math.sin(t * 10) * 0.08 * motionScale;
              }
            } else {
              // Returning ball to inventory
              _targetVec.set(spring.position.x, restY, spring.position.z);
              spring.setTarget(_targetVec);
            }
          } else {
            // Other toys: music-box / bubble-blower
            const bounceY = restY + Math.abs(Math.sin(t * 7)) * 0.24 * motionScale;
            _targetVec.set(spring.position.x, bounceY, spring.position.z);
            spring.setTarget(_targetVec);
            if (groupRef.current) {
              groupRef.current.rotation.z = Math.sin(t * 7) * 0.07 * motionScale;
              groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0, 0.08);
            }
          }
        } else if (isSittingOnBench) {
          // Anchor Juro comfortably atop the wooden park bench on East Knoll
          const distToBench = Math.hypot(
            spring.position.x - JURO_BENCH_POS.x,
            spring.position.z - JURO_BENCH_POS.z
          );
          if (distToBench > 0.04) {
            spring.position.x = THREE.MathUtils.lerp(spring.position.x, JURO_BENCH_POS.x, 0.2);
            spring.position.z = THREE.MathUtils.lerp(spring.position.z, JURO_BENCH_POS.z, 0.2);
          } else {
            spring.position.x = JURO_BENCH_POS.x;
            spring.position.z = JURO_BENCH_POS.z;
          }
          spring.target.x = JURO_BENCH_POS.x;
          spring.target.z = JURO_BENCH_POS.z;
          spring.velocity.x *= 0.1;
          spring.velocity.z *= 0.1;

          const sitY = JURO_BENCH_POS.seatY + currentBottomOffset * 0.92 + Math.sin(t * 2.2) * 0.008 * motionScale;
          _targetVec.set(JURO_BENCH_POS.x, sitY, JURO_BENCH_POS.z);
          spring.setTarget(_targetVec);

          crawlScaleY = 0.94 + Math.sin(t * 2.2) * 0.02 * motionScale;
          crawlScaleX = 1.04;
          crawlScaleZ = 1.04;

          if (groupRef.current) {
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, JURO_BENCH_POS.rotY, 0.08);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.03, 0.08);
            groupRef.current.rotation.z = THREE.MathUtils.lerp(
              groupRef.current.rotation.z,
              Math.sin(t * 1.6) * 0.015 * motionScale,
              0.08
            );
          }
        } else if (isBouncingOnTrampoline) {
          // Bouncy fun on the Mushroom Trampoline!
          const distToTrampoline = Math.hypot(
            spring.position.x - JURO_TRAMPOLINE_POS.x,
            spring.position.z - JURO_TRAMPOLINE_POS.z
          );
          if (distToTrampoline > 0.04) {
            spring.position.x = THREE.MathUtils.lerp(spring.position.x, JURO_TRAMPOLINE_POS.x, 0.2);
            spring.position.z = THREE.MathUtils.lerp(spring.position.z, JURO_TRAMPOLINE_POS.z, 0.2);
          } else {
            spring.position.x = JURO_TRAMPOLINE_POS.x;
            spring.position.z = JURO_TRAMPOLINE_POS.z;
          }
          spring.target.x = JURO_TRAMPOLINE_POS.x;
          spring.target.z = JURO_TRAMPOLINE_POS.z;
          spring.velocity.x *= 0.1;
          spring.velocity.z *= 0.1;

          // Spring bounce arc rhythm
          const bouncePhase = Math.sin(t * 7.5);
          const bounceUp = Math.max(0, bouncePhase);
          const bounceY = JURO_TRAMPOLINE_POS.surfaceY + currentBottomOffset + bounceUp * 0.42;
          _targetVec.set(JURO_TRAMPOLINE_POS.x, bounceY, JURO_TRAMPOLINE_POS.z);
          spring.setTarget(_targetVec);

          // Squash & stretch physics synced with mushroom
          if (bouncePhase < 0) {
            // Impact squash
            crawlScaleY = 0.78 + bouncePhase * 0.12;
            crawlScaleX = 1.18 - bouncePhase * 0.08;
            crawlScaleZ = 1.18 - bouncePhase * 0.08;
          } else {
            // Airborne stretch
            crawlScaleY = 1.0 + bouncePhase * 0.22;
            crawlScaleX = 1.0 - bouncePhase * 0.1;
            crawlScaleZ = 1.0 - bouncePhase * 0.1;
          }

          if (groupRef.current) {
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0, 0.08);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.08);
            groupRef.current.rotation.z = THREE.MathUtils.lerp(
              groupRef.current.rotation.z,
              Math.sin(t * 7.5) * 0.08 * motionScale,
              0.08
            );
          }
        } else if (currentState === "sleep") {
          // Whether Juro fell asleep from night time, low energy, or player command,
          // anchor Juro snugly in the center of the sofa mattress atop the West Knoll!
          const distToBed = Math.hypot(
            spring.position.x - JURO_BED_POS.x,
            spring.position.z - JURO_BED_POS.z
          );
          if (distToBed > 0.04) {
            spring.position.x = THREE.MathUtils.lerp(spring.position.x, JURO_BED_POS.x, 0.2);
            spring.position.z = THREE.MathUtils.lerp(spring.position.z, JURO_BED_POS.z, 0.2);
          } else {
            spring.position.x = JURO_BED_POS.x;
            spring.position.z = JURO_BED_POS.z;
          }
          spring.target.x = JURO_BED_POS.x;
          spring.target.z = JURO_BED_POS.z;
          spring.velocity.x *= 0.1;
          spring.velocity.z *= 0.1;

          const targetGroundY = getTerrainHeightAt(JURO_BED_POS.x, JURO_BED_POS.z);
          // Cushion top is ~0.132m above terrain. Loaf squish during sleep is ~0.88.
          // Sink ~0.012m into the plush mattress cushion so Juro rests snugly on the sofa bed!
          const sleepCenterY = targetGroundY + 0.120 + currentBottomOffset * 0.88;
          _targetVec.set(JURO_BED_POS.x, sleepCenterY, JURO_BED_POS.z);
          spring.setTarget(_targetVec);
          if (groupRef.current) {
            const gentleSway = -0.055 + Math.sin(t * 1.1) * 0.02 * motionScale;
            groupRef.current.rotation.z = THREE.MathUtils.lerp(
              groupRef.current.rotation.z,
              gentleSway,
              0.08
            );
            groupRef.current.rotation.x = THREE.MathUtils.lerp(
              groupRef.current.rotation.x,
              0.04,
              0.08
            );
            // Rotate Juro to align cozy with sofa backrest (angle 0.35 rad matches PetSofaBed)
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0.35, 0.08);
          }
        } else if (currentState === "eating") {
          const chewY = restY + Math.sin(t * 14) * 0.015 * motionScale;
          _targetVec.set(spring.position.x, chewY, spring.position.z);
          spring.setTarget(_targetVec);
          if (groupRef.current) {
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.08, 0.15);
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0, 0.14);
          }
        } else if (isBlowingBubbles) {
          const bubbleExcitedHop = restY + Math.abs(Math.sin(t * 7.5)) * 0.1 * motionScale;
          _targetVec.set(spring.position.x, bubbleExcitedHop, spring.position.z);
          spring.setTarget(_targetVec);
          if (groupRef.current) {
            groupRef.current.rotation.z = Math.sin(t * 8) * 0.05 * motionScale;
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0, 0.08);
          }
        } else {
          const idleBobRate = isSleepy ? 1.0 : 1.8;
          const idleBobAmp = isSleepy ? 0.007 : 0.02;
          const idleY = restY + Math.sin(t * idleBobRate) * idleBobAmp * motionScale;
          _targetVec.set(spring.position.x, idleY, spring.position.z);
          spring.setTarget(_targetVec);
          if (groupRef.current) {
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.1);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0, 0.05);
          }
        }
      }

    // 3. Physics simulation step + solid obstacle collision enforcement
    // Sleepy physics: high damping & lower stiffness heavily dampens rubbery boing-boing bounce
    spring.config.damping = isSleepy ? 24 : 10;
    spring.config.stiffness = isSleepy ? 95 : 145;
    spring.update(delta);

    const isSleepingOrHeading =
      currentState === "sleep" ||
      storeState === "sleep" ||
      (isHeadingToBedRef?.current ?? false);
    const isSittingOrHeadingToBench =
      isSittingOnBench || (isHeadingToBenchRef?.current ?? false);

    const postStepCollision = resolveHorizontalCollisions(
      spring.position.x,
      spring.position.z,
      spring.position.y - currentBottomOffset,
      JURO_COLLISION_RADIUS,
      jumpRef.current.active,
      isSleepingOrHeading,
      isSittingOrHeadingToBench
    );
    if (postStepCollision.hitObstacle) {
      spring.resolveHorizontal(postStepCollision.x, postStepCollision.z, 0.1);
      spring.target.x = postStepCollision.x;
      spring.target.z = postStepCollision.z;

      // If wandering and persistently blocked by an obstacle, pick a new path immediately (unless heading to bed!)
      if (currentState === "wander") {
        blockedTimerRef.current += delta;
        if (blockedTimerRef.current > 0.4 && !(isHeadingToBedRef?.current ?? false)) {
          blockedTimerRef.current = 0;
          fsm.pickNewWanderTarget(spring.position, liveAttributes);
        }
      }
    } else {
      blockedTimerRef.current = 0;
    }

    // 4. Compute squash/stretch scale, enforce strict terrain collision, & apply position
    const sleepBreath = Math.sin(t * 1.5);
    const liveSurfaceY = getTerrainHeightAt(spring.position.x, spring.position.z);

    if (groupRef.current) {
      const scale = spring.computeSquashAndStretch();
      if (isSleepy && currentState !== "sleep") {
        // Dampen organic spring squashing/stretching by 65% when drowsy
        scale.x = THREE.MathUtils.lerp(1.0, scale.x, 0.35);
        scale.y = THREE.MathUtils.lerp(1.0, scale.y, 0.35);
        scale.z = THREE.MathUtils.lerp(1.0, scale.z, 0.35);
      }

      if (currentState === "sleep") {
        scale.x = 0.94 + sleepBreath * 0.02 * motionScale;
        scale.z = 0.94 + sleepBreath * 0.02 * motionScale;
        scale.y = 0.88 - sleepBreath * 0.025 * motionScale;
      } else if (currentState === "eating") {
        const chewSquash = Math.sin(t * 16) * 0.04;
        scale.y += chewSquash;
        scale.x -= chewSquash * 0.45;
        scale.z -= chewSquash * 0.45;
      } else if (currentState === "wander") {
        const inWater = isWaterAt(spring.position.x, spring.position.z);
        if (inWater) {
          crawlScaleY *= 0.92;
          crawlScaleX *= 1.04;
          crawlScaleZ *= 1.04;
        }
        // Blend crawl / jump stretch cleanly
        scale.x *= crawlScaleX;
        scale.y *= crawlScaleY;
        scale.z *= crawlScaleZ;
      } else {
        const breathing = Math.sin(t * 2.8) * 0.018;
        scale.x += breathing;
        scale.z += breathing;
        scale.y -= breathing;
      }

      // Need-based physical behaviors:
      // 1. Tummy Rumble Pulse (Hunger < 45)
      if (!isSleepingNow && !isEatingNow && !isPlayingToyNow && liveAttributes.hunger < 45) {
        tummyRumbleTimer.current.timer += delta;
        if (tummyRumbleTimer.current.timer > tummyRumbleTimer.current.nextRumble) {
          const rumbleElapsed = tummyRumbleTimer.current.timer - tummyRumbleTimer.current.nextRumble;
          if (rumbleElapsed < 0.55) {
            const rumbleWave = Math.sin(rumbleElapsed * 36) * (1 - rumbleElapsed / 0.55);
            scale.x *= (1 + rumbleWave * 0.12);
            scale.y *= (1 - rumbleWave * 0.08);
            scale.z *= (1 + rumbleWave * 0.12);
            if (rumbleElapsed < delta * 1.5) {
              soundEffects.playSquish();
            }
          } else {
            tummyRumbleTimer.current.timer = 0;
            tummyRumbleTimer.current.nextRumble = 10 + Math.random() * 5;
          }
        }
      }

      // 2. Deep Yawn Stretch (Sleepy & Idle)
      if (isSleepy && !isSleepingNow && !isEatingNow && !isPlayingToyNow && currentState === "idle") {
        sleepyYawnTimer.current.timer += delta;
        if (sleepyYawnTimer.current.timer > sleepyYawnTimer.current.nextYawn) {
          const yawnElapsed = sleepyYawnTimer.current.timer - sleepyYawnTimer.current.nextYawn;
          if (yawnElapsed < 1.6) {
            const yawnPhase = Math.sin((yawnElapsed / 1.6) * Math.PI);
            scale.y *= (1 + yawnPhase * 0.22);
            scale.x *= (1 - yawnPhase * 0.10);
            scale.z *= (1 - yawnPhase * 0.10);
            if (yawnElapsed < delta * 1.5) {
              soundEffects.playTired();
            }
          } else {
            sleepyYawnTimer.current.timer = 0;
            sleepyYawnTimer.current.nextYawn = 13 + Math.random() * 7;
          }
        }
      }

      // 3. Tactile Direct Petting Reaction
      if (isPettingActive && !isSleepingNow) {
        const purrSquash = Math.sin(t * 14) * 0.035;
        scale.x *= (1.06 + purrSquash);
        scale.y *= (0.94 - purrSquash);
        groupRef.current.rotation.z += Math.sin(t * 8) * 0.03;
      }

      // 4. Sniffing Ground Posture while Wandering Hungry
      if (liveAttributes.hunger < 45 && (currentState === "wander" || currentState === "curious") && !isSleepingNow) {
        groupRef.current.rotation.x = Math.sin(t * 4) * 0.04 + 0.08;
      }

      // 5. Food Dragging Posture (Anticipation)
      if (isDraggingFood && !isSleepingNow) {
        groupRef.current.rotation.x = -0.09;
        scale.y *= 1.05;
        scale.x *= 0.96;
      }

      // Scale entire character cleanly to pocket-sized currentPetScale
      scale.multiplyScalar(currentPetScale);

      // Hard terrain collision boundary: keep Juro's bottom resting cleanly on grass/hill/bridge/stump/mattress/bench
      const isSleepingOnBed =
        currentState === "sleep" &&
        Math.hypot(spring.position.x - JURO_BED_POS.x, spring.position.z - JURO_BED_POS.z) < 0.85;
      const isSittingOnBenchNear =
        isSittingOnBench &&
        Math.hypot(spring.position.x - JURO_BENCH_POS.x, spring.position.z - JURO_BENCH_POS.z) < 0.65;
      const surfaceBaseY = isSittingOnBenchNear
        ? JURO_BENCH_POS.seatY
        : liveSurfaceY + (isSleepingOnBed ? 0.120 : 0);
      const minCenterY = surfaceBaseY + BODY_BOTTOM_LOCAL * scale.y;
      spring.clampFloor(minCenterY, 0.22);

      groupRef.current.position.copy(spring.position);
      groupRef.current.scale.copy(scale);

      // Read live bath state directly from ref (zero React re-renders during drag!)
      const liveBath = bathStateRef?.current;
      const isScrubbingNow = liveBath?.isScrubbing ?? false;
      const isRinsingNow = liveBath?.isRinsing ?? false;

      // Periodic gentle snoring audio when Juro is asleep
      if (currentState === "sleep") {
        snoreTimerRef.current += delta;
        if (snoreTimerRef.current >= 4.2) {
          snoreTimerRef.current = 0;
          soundEffects.playSnore();
        }
      } else {
        snoreTimerRef.current = 0;
      }

      // Foamy soap bubble scrub sound when user is lathering Juro
      if (isScrubbingNow) {
        scrubSoundTimerRef.current += delta;
        if (scrubSoundTimerRef.current >= 0.22) {
          scrubSoundTimerRef.current = 0;
          soundEffects.playScrub();
        }
      } else {
        scrubSoundTimerRef.current = 0;
      }

      // Playful bath reactions & woozy dizzy body sway
      const isDizzyActive = currentState !== "sleep" && dizzyRef.current.timer > 0;
      const dizzyFade = isDizzyActive ? Math.min(1, dizzyRef.current.timer / 0.65) : 0;

      if (isDizzyActive) {
        // Woozy circular sway + soft jelly wobble while dizzy from frantic petting/scrubbing
        groupRef.current.rotation.z = Math.sin(t * 5.4) * 0.24 * dizzyFade * motionScale;
        groupRef.current.rotation.x = Math.cos(t * 5.4) * 0.12 * dizzyFade * motionScale;
        groupRef.current.rotation.y = Math.sin(t * 2.7) * 0.26 * dizzyFade * motionScale;
        const wobble = Math.sin(t * 11) * 0.035 * dizzyFade * motionScale;
        groupRef.current.scale.x *= 1 + wobble;
        groupRef.current.scale.y *= 1 - wobble;
      } else if (isScrubbingNow) {
        groupRef.current.rotation.z = Math.sin(t * 16) * 0.08 * motionScale;
        groupRef.current.scale.x *= 1 + Math.sin(t * 18) * 0.03;
        groupRef.current.scale.y *= 1 - Math.sin(t * 18) * 0.03;
      } else if (isRinsingNow) {
        groupRef.current.rotation.z = Math.sin(t * 24) * 0.05 * motionScale;
        groupRef.current.scale.y *= 0.94 + Math.sin(t * 20) * 0.025;
        groupRef.current.scale.x *= 1.04;
      } else if (isPettingActive) {
        // Sweet affectionate purr vibration and squishy cozy loaf pose!
        groupRef.current.rotation.z = Math.sin(t * 14) * 0.035 * motionScale;
        groupRef.current.scale.y *= 0.93 + Math.sin(t * 12) * 0.02;
        groupRef.current.scale.x *= 1.05;
        groupRef.current.scale.z *= 1.05;
      }

      // Project Juro's live 3D position & scaled radius to viewport pixel coordinates
      if (juroScreenPosRef?.current) {
        _projCenter.copy(spring.position).project(camera);
        _projEdge
          .set(spring.position.x + 1.18 * currentPetScale, spring.position.y, spring.position.z)
          .project(camera);
        const cx = (_projCenter.x * 0.5 + 0.5) * size.width;
        const cy = (-_projCenter.y * 0.5 + 0.5) * size.height;
        const ex = (_projEdge.x * 0.5 + 0.5) * size.width;

        // Project Juro's crown/head top
        _projCenter
          .set(spring.position.x, spring.position.y + 1.15 * currentPetScale, spring.position.z)
          .project(camera);
        const hy = (-_projCenter.y * 0.5 + 0.5) * size.height;

        juroScreenPosRef.current.x = cx;
        juroScreenPosRef.current.y = cy;
        juroScreenPosRef.current.headY = hy;
        juroScreenPosRef.current.radiusPx = Math.max(52, Math.abs(ex - cx) * 1.55);
      }

      if (juroWorldPosRef?.current) {
        juroWorldPosRef.current.copy(spring.position);
      }
    }

    // 5. Soft Contact Shadow — sits directly on whatever ground/hill/stump/bridge/bench Juro is above!
    if (shadowRef.current && groupRef.current) {
      const isSleepingOnBed =
        currentState === "sleep" &&
        Math.hypot(spring.position.x - JURO_BED_POS.x, spring.position.z - JURO_BED_POS.z) < 0.85;
      const isSittingOnBenchNear =
        isSittingOnBench &&
        Math.hypot(spring.position.x - JURO_BENCH_POS.x, spring.position.z - JURO_BENCH_POS.z) < 0.65;
      const contactSurfaceY = isSittingOnBenchNear
        ? JURO_BENCH_POS.seatY + 0.003
        : liveSurfaceY + (isSleepingOnBed ? 0.132 : 0);
      shadowRef.current.position.set(
        spring.position.x,
        contactSurfaceY + 0.005,
        spring.position.z
      );

      const juroBottomY = spring.position.y - BODY_BOTTOM_LOCAL * groupRef.current.scale.y;
      const lift = Math.max(0, juroBottomY - contactSurfaceY);
      const heightShrink = 1 / (1 + lift * 0.55);
      const bodyScaleX = groupRef.current.scale.x;
      const bodyScaleZ = groupRef.current.scale.z;

      // Match Juro's scaled chubby oval footprint & crawl stretch!
      shadowRef.current.scale.set(
        2.55 * bodyScaleX * heightShrink,
        2.25 * bodyScaleZ * heightShrink,
        1
      );
      shadowRef.current.rotation.z = -groupRef.current.rotation.y;

      const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.clamp(0.82 / (1 + lift * 0.9), 0.16, 0.82);
    }

    // 6. Eating Animation Sequence with 3D Food Prop
    const isEating = currentState === "eating";
    if (isEating) {
      eatingTimer.current += delta;
      const eatT = eatingTimer.current;

      if (foodPropRef.current) {
        foodPropRef.current.rotation.y = Math.sin(eatT * 2.6) * 0.25;
        if (eatT < 0.7) {
          const lerpT = eatT / 0.7;
          foodPropRef.current.position.set(0, -0.14 + Math.sin(eatT * 6) * 0.025, 1.54 - lerpT * 0.22);
          foodPropRef.current.scale.setScalar(1.32);
          if (crumbsGroupRef.current) crumbsGroupRef.current.visible = false;
        } else if (eatT < 1.4) {
          if (lastBiteSoundRef.current < 1) {
            lastBiteSoundRef.current = 1;
            soundEffects.playMunch();
          }
          foodPropRef.current.position.set(0, -0.14, 1.28);
          foodPropRef.current.scale.setScalar(0.92);
          if (crumbsGroupRef.current) {
            crumbsGroupRef.current.visible = true;
            crumbsGroupRef.current.position.set(Math.sin(eatT * 22) * 0.04, Math.cos(eatT * 22) * 0.04, 0);
          }
        } else if (eatT < 2.1) {
          if (lastBiteSoundRef.current < 2) {
            lastBiteSoundRef.current = 2;
            soundEffects.playMunch();
          }
          foodPropRef.current.position.set(0, -0.14, 1.2);
          foodPropRef.current.scale.setScalar(0.48);
        } else {
          foodPropRef.current.scale.setScalar(0);
          if (crumbsGroupRef.current) crumbsGroupRef.current.visible = false;
        }
      }

      if (heartBubbleRef.current) {
        if (eatT >= 2.4 && eatT < 3.4) {
          heartBubbleRef.current.visible = true;
          heartBubbleRef.current.position.y = 0.95 + (eatT - 2.4) * 0.55;
          heartBubbleRef.current.scale.setScalar(Math.sin((eatT - 2.4) * Math.PI) * 1.1);
        } else {
          heartBubbleRef.current.visible = false;
        }
      }
    } else {
      eatingTimer.current = 0;
      lastBiteSoundRef.current = -1;
      if (heartBubbleRef.current) heartBubbleRef.current.visible = false;
    }

    // 6.5 Interactive 3D World Toy Playing Sequence (Fetch Ball & Props)
    const isPlayingToy = currentState === "play" && Boolean(currentToyBeingPlayed);
    if (isPlayingToy) {
      playTimer.current += delta;
      const toyId = currentToyBeingPlayed?.id ?? "bounce-ball";

      if (worldToyRef.current) {
        worldToyRef.current.visible = true;

        if (toyId === "bounce-ball") {
          const fb = fetchBallRef.current;
          if (!fb.active) {
            fb.active = true;
            fb.stage = "throwing";
            fb.timer = 0;
            fb.bouncesPlayed = 0;
            fb.scale = 1;
            fb.startX = spring.position.x - 0.2;
            fb.startY = spring.position.y + 1.8;
            fb.startZ = spring.position.z + 1.2;

            // Pick random safe landing point on the meadow
            const forwardAngle = groupRef.current ? groupRef.current.rotation.y : 0;
            let bestX = spring.position.x;
            let bestZ = spring.position.z;
            let found = false;

            for (let attempt = 0; attempt < 12; attempt++) {
              const throwAngle = forwardAngle + (Math.random() - 0.5) * Math.PI * 0.9;
              const throwDist = 2.4 + Math.random() * 1.5;
              const candX = THREE.MathUtils.clamp(
                spring.position.x + Math.sin(throwAngle) * throwDist,
                MAP_BOUNDS.minX + 0.6,
                MAP_BOUNDS.maxX - 0.6
              );
              const candZ = THREE.MathUtils.clamp(
                spring.position.z + Math.cos(throwAngle) * throwDist,
                MAP_BOUNDS.minZ + 0.6,
                MAP_BOUNDS.maxZ - 0.6
              );
              if (!isWaterAt(candX, candZ) && !isInsideObstacle(candX, candZ, 0.45)) {
                bestX = candX;
                bestZ = candZ;
                found = true;
                break;
              }
            }

            if (!found) {
              bestX = 0;
              bestZ = 0.2;
            }

            const safeTarget = resolveHorizontalCollisions(
              bestX,
              bestZ,
              BASE_GROUND_Y,
              0.42,
              false,
              false
            );
            fb.targetX = safeTarget.x;
            fb.targetZ = safeTarget.z;
            fb.targetY = getTerrainHeightAt(safeTarget.x, safeTarget.z);
            fb.ballX = fb.startX;
            fb.ballY = fb.startY;
            fb.ballZ = fb.startZ;
            fb.rotX = 0;
            fb.rotZ = 0;
            soundEffects.playBoing();
          }

          fb.timer += delta;

          if (fb.stage === "throwing") {
            const p = Math.min(1, fb.timer / 0.85);
            const arcY = Math.sin(p * Math.PI) * 1.5;
            fb.ballX = THREE.MathUtils.lerp(fb.startX, fb.targetX, p);
            fb.ballZ = THREE.MathUtils.lerp(fb.startZ, fb.targetZ, p);
            fb.ballY = THREE.MathUtils.lerp(fb.startY, fb.targetY + 0.082, p) + arcY;
            fb.rotX += delta * 12;
            fb.rotZ += delta * 8;

            if (p >= 1) {
              fb.stage = "bouncing";
              fb.timer = 0;
              fb.bouncesPlayed = 1;
              soundEffects.playHop();
            }
          } else if (fb.stage === "bouncing") {
            fb.rotX += delta * 6;
            let bounceY = 0;
            if (fb.timer < 0.45) {
              const b1 = fb.timer / 0.45;
              bounceY = Math.sin(b1 * Math.PI) * 0.38;
            } else if (fb.timer < 0.75) {
              if (fb.bouncesPlayed === 1) {
                fb.bouncesPlayed = 2;
                soundEffects.playHop();
              }
              const b2 = (fb.timer - 0.45) / 0.3;
              bounceY = Math.sin(b2 * Math.PI) * 0.15;
            } else {
              fb.stage = "ground";
              fb.timer = 0;
              soundEffects.playPlop();
            }
            fb.ballX = fb.targetX;
            fb.ballZ = fb.targetZ;
            fb.ballY = fb.targetY + 0.082 + Math.max(0, bounceY);
          } else if (fb.stage === "ground") {
            // Ball rests waiting on the grass
            fb.ballX = fb.targetX;
            fb.ballZ = fb.targetZ;
            fb.ballY = fb.targetY + 0.082 + Math.sin(t * 3) * 0.005;
          } else if (fb.stage === "caught") {
            // Held happily in front of Juro's mouth with heart celebration
            fb.timer += delta;
            const yaw = groupRef.current ? groupRef.current.rotation.y : 0;
            fb.ballX = spring.position.x + Math.sin(yaw) * 0.28;
            fb.ballY = spring.position.y - 0.04 + Math.sin(t * 10) * 0.03;
            fb.ballZ = spring.position.z + Math.cos(yaw) * 0.28;
            fb.rotX = 0;
            fb.rotZ = 0;

            if (heartBubbleRef.current) {
              heartBubbleRef.current.visible = true;
              heartBubbleRef.current.position.y = 0.95 + (fb.timer / 1.4) * 0.45;
              heartBubbleRef.current.scale.setScalar(Math.sin((fb.timer / 1.4) * Math.PI) * 1.15);
            }

            if (fb.timer >= 1.4) {
              fb.stage = "returning";
              fb.timer = 0;
              soundEffects.playPop();
              if (heartBubbleRef.current) heartBubbleRef.current.visible = false;
            }
          } else if (fb.stage === "returning") {
            // Returning to inventory: ball pops & shrinks to 0
            fb.timer += delta;
            const p = Math.min(1, fb.timer / 0.4);
            fb.scale = 1 - p;
            const yaw = groupRef.current ? groupRef.current.rotation.y : 0;
            fb.ballX = spring.position.x + Math.sin(yaw) * 0.28;
            fb.ballY = spring.position.y - 0.04 + p * 0.2;
            fb.ballZ = spring.position.z + Math.cos(yaw) * 0.28;

            if (p >= 1) {
              fb.active = false;
              clearToyBeingPlayed();
              fsm.transitionTo("happy", true);
              setBehaviorState("happy");
              playTimer.current = 0;
            }
          }

          // Position the 3D ball in world space
          worldToyRef.current.position.set(fb.ballX, fb.ballY, fb.ballZ);
          worldToyRef.current.scale.setScalar(fb.scale);
          if (worldToyMeshRef.current) {
            worldToyMeshRef.current.rotation.set(fb.rotX, 0, fb.rotZ);
            // Crisp, perfectly round sphere with no squashing or gepeng distortion
            worldToyMeshRef.current.scale.set(1, 1, 1);
          }

          // Ball contact shadow on the ground
          if (worldToyShadowRef.current) {
            worldToyShadowRef.current.visible = true;
            const groundY = getTerrainHeightAt(fb.ballX, fb.ballZ);
            worldToyShadowRef.current.position.set(fb.ballX, groundY + 0.005, fb.ballZ);
            const heightAboveGround = Math.max(0, fb.ballY - 0.082 - groundY);
            const shadowScale = Math.max(0.12, 0.55 / (1 + heightAboveGround * 2.2)) * fb.scale;
            worldToyShadowRef.current.scale.setScalar(shadowScale);
            const mat = worldToyShadowRef.current.material as THREE.MeshBasicMaterial;
            if (mat) {
              mat.opacity = Math.max(0.06, 0.35 / (1 + heightAboveGround * 1.5)) * fb.scale;
            }
          }
        } else if (toyId === "music-box") {
          const rs = radioStandRef.current;
          if (!rs.active) {
            rs.active = true;
            // Place retro radio freestanding on the meadow grass at a comfortable distance (never attached to Juro!)
            const yaw = groupRef.current ? groupRef.current.rotation.y : 0;
            const placeAngle = yaw + 0.55;
            const placeDist = 1.35;
            const candX = THREE.MathUtils.clamp(
              spring.position.x + Math.sin(placeAngle) * placeDist,
              MAP_BOUNDS.minX + 0.6,
              MAP_BOUNDS.maxX - 0.6
            );
            const candZ = THREE.MathUtils.clamp(
              spring.position.z + Math.cos(placeAngle) * placeDist,
              MAP_BOUNDS.minZ + 0.6,
              MAP_BOUNDS.maxZ - 0.6
            );
            const safe = resolveHorizontalCollisions(candX, candZ, BASE_GROUND_Y, 0.3, false, false);
            rs.x = safe.x;
            rs.z = safe.z;
            rs.y = getTerrainHeightAt(safe.x, safe.z) + 0.14;
            soundEffects.playHappy();
          }

          // Freestanding radio playing chiptune music on the meadow
          worldToyRef.current.position.set(rs.x, rs.y, rs.z);
          worldToyRef.current.scale.setScalar(1);
          if (worldToyMeshRef.current) {
            worldToyMeshRef.current.rotation.set(0, -0.35 + Math.sin(t * 3.5) * 0.04, 0);
          }

          if (worldToyShadowRef.current) {
            worldToyShadowRef.current.visible = true;
            const groundY = getTerrainHeightAt(rs.x, rs.z);
            worldToyShadowRef.current.position.set(rs.x, groundY + 0.005, rs.z);
            worldToyShadowRef.current.scale.set(0.65, 0.45, 1);
            const mat = worldToyShadowRef.current.material as THREE.MeshBasicMaterial;
            if (mat) mat.opacity = 0.35;
          }

          // Juro grooves happily on the grass facing the radio — STAYS POCKET-SIZED (multiplication by relative factor, NEVER absolute scale override!)
          const lookAngle = Math.atan2(rs.x - spring.position.x, rs.z - spring.position.z);
          if (groupRef.current) {
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, lookAngle, 0.12);
            groupRef.current.rotation.z = Math.sin(playTimer.current * 8) * 0.14;
            groupRef.current.scale.x *= 1 + Math.sin(playTimer.current * 16) * 0.04;
            groupRef.current.scale.y *= 1 - Math.sin(playTimer.current * 16) * 0.04;
          }

          if (playTimer.current >= 4.8) {
            soundEffects.playHappy();
            rs.active = false;
            clearToyBeingPlayed();
            fsm.transitionTo("happy", true);
            setBehaviorState("happy");
            playTimer.current = 0;
          }
        } else if (toyId === "bubble-blower") {
          const bs = bubbleStandRef.current;
          if (!bs.active) {
            bs.active = true;
            // Place the bubble wand freestanding on the meadow at a comfortable distance (never attached to Juro's body!)
            const yaw = groupRef.current ? groupRef.current.rotation.y : 0;
            const placeAngle = yaw + 0.6;
            const placeDist = 1.35;
            const candX = THREE.MathUtils.clamp(
              spring.position.x + Math.sin(placeAngle) * placeDist,
              MAP_BOUNDS.minX + 0.6,
              MAP_BOUNDS.maxX - 0.6
            );
            const candZ = THREE.MathUtils.clamp(
              spring.position.z + Math.cos(placeAngle) * placeDist,
              MAP_BOUNDS.minZ + 0.6,
              MAP_BOUNDS.maxZ - 0.6
            );
            const safe = resolveHorizontalCollisions(candX, candZ, BASE_GROUND_Y, 0.28, false, false);
            bs.x = safe.x;
            bs.z = safe.z;
            bs.y = getTerrainHeightAt(safe.x, safe.z) + 0.32;
            soundEffects.playBubble();
          }

          // Freestanding 3D bubble wand waving gently on the meadow
          worldToyRef.current.position.set(
            bs.x,
            bs.y + Math.sin(t * 3.5) * 0.03,
            bs.z
          );
          worldToyRef.current.scale.setScalar(1);
          if (worldToyMeshRef.current) {
            worldToyMeshRef.current.rotation.set(0.18, Math.sin(t * 2.2) * 0.35, -0.2);
          }

          if (worldToyShadowRef.current) {
            worldToyShadowRef.current.visible = true;
            const groundY = getTerrainHeightAt(bs.x, bs.z);
            worldToyShadowRef.current.position.set(bs.x, groundY + 0.005, bs.z);
            worldToyShadowRef.current.scale.set(0.65, 0.65, 1);
            const mat = worldToyShadowRef.current.material as THREE.MeshBasicMaterial;
            if (mat) mat.opacity = 0.25;
          }

          // Juro is completely independent: on the grass looking up at the rising bubbles and hopping with joy!
          const lookAngle = Math.atan2(bs.x - spring.position.x, bs.z - spring.position.z);
          if (groupRef.current) {
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, lookAngle, 0.12);
            groupRef.current.rotation.z = Math.sin(t * 8) * 0.07 * motionScale;
            // Playful hopping under the bubbles
            const hop = Math.abs(Math.sin(playTimer.current * 7)) * 0.18 * motionScale;
            _targetVec.set(spring.position.x, restY + hop, spring.position.z);
            spring.setTarget(_targetVec);
          }

          if (playTimer.current >= 4.8) {
            soundEffects.playHappy();
            soundEffects.playPop();
            bs.active = false;
            clearToyBeingPlayed();
            fsm.transitionTo("happy", true);
            setBehaviorState("happy");
            playTimer.current = 0;
          }
        }
      }
    } else {
      playTimer.current = 0;
      fetchBallRef.current.active = false;
      bubbleStandRef.current.active = false;
      radioStandRef.current.active = false;
      if (worldToyRef.current) worldToyRef.current.visible = false;
      if (worldToyShadowRef.current) worldToyShadowRef.current.visible = false;
      if (!isCurrentlyEating && heartBubbleRef.current) {
        heartBubbleRef.current.visible = false;
      }
    }

    // 7. Dynamic Need-State Facial Expressions (Real-time live attributes with realistic thresholds)
    const isDirty = liveAttributes.cleanliness < 45;
    type NeedExpression = "hungry" | "tired" | "angry" | "bored" | "normal";
    let expression: NeedExpression = "normal";

    const candidateNeeds: { type: NeedExpression; val: number }[] = [
      { type: "hungry", val: liveAttributes.hunger },
      { type: "tired", val: liveAttributes.energy },
      { type: "angry", val: liveAttributes.affection },
      { type: "bored", val: liveAttributes.happiness },
    ];
    // Sort ascending: prioritize whichever need is the lowest below 45%
    candidateNeeds.sort((a, b) => a.val - b.val);
    if (candidateNeeds[0].val < 45) {
      expression = candidateNeeds[0].type;
    }

    // Jam 9 malam (21:00) sampai pagi (06:00): ekspresi Juro akan terus mengantuk ("tired")
    if (isBedtimeHour()) {
      expression = "tired";
    }

    // Eyes: Awake vs Sleeping Curved Eyelids (︶ ︶)
    blinkState.current.timer += delta;
    if (blinkState.current.timer > blinkState.current.nextBlink) {
      blinkState.current.isBlinking = true;
      if (blinkState.current.timer > blinkState.current.nextBlink + 0.12) {
        blinkState.current.isBlinking = false;
        blinkState.current.timer = 0;
        blinkState.current.nextBlink = 2.2 + Math.random() * 3.5;
      }
    }

    const liveBathState = bathStateRef?.current;
    const soapLevelNow = liveBathState?.soapLevel ?? 0;
    const isScrubbingNow = liveBathState?.isScrubbing ?? false;
    const isRinsingNow = liveBathState?.isRinsing ?? false;

    const isSleeping = currentState === "sleep";
    const isDizzy = !isSleeping && dizzyRef.current.timer > 0;
    if (isDizzyRef) {
      isDizzyRef.current = isDizzy;
    }
    const dizzyFade = isDizzy ? Math.min(1, dizzyRef.current.timer / 0.65) : 0;
    const isChewing = isEating && eatingTimer.current > 0.7 && eatingTimer.current < 2.6;
    const isBathSquint = isScrubbingNow || isRinsingNow;
    const isChasingBall =
      isPlayingToy &&
      currentToyBeingPlayed?.id === "bounce-ball" &&
      (fetchBallRef.current.stage === "throwing" ||
        fetchBallRef.current.stage === "bouncing" ||
        fetchBallRef.current.stage === "ground");
    const isPlayingBubbles = isPlayingToy && currentToyBeingPlayed?.id === "bubble-blower";
    const isInteractingHappy =
      (isPlayingToy && !isChasingBall && !isPlayingBubbles) || isPettingActive;
    const isHappyFace =
      !isSleeping &&
      !isDizzy &&
      (isInteractingHappy || (currentState === "happy" && expression === "normal"));

    const blinkScaleY = isRinsingNow
      ? 0.16
      : isScrubbingNow
      ? 0.26
      : isChewing
      ? 0.22
      : blinkState.current.isBlinking
      ? 0.14
      : 1;

    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.visible = !isSleeping && !isDizzy && !isHappyFace;
      rightEyeRef.current.visible = !isSleeping && !isDizzy && !isHappyFace;

      if (!isSleeping && !isDizzy && !isHappyFace) {
        let lookX = state.pointer.x * 0.08;
        let lookY = state.pointer.y * 0.06;

        if (isChasingBall) {
          const fb = fetchBallRef.current;
          const dx = fb.ballX - spring.position.x;
          const dz = fb.ballZ - spring.position.z;
          const distXZ = Math.hypot(dx, dz) || 1;
          lookX = THREE.MathUtils.clamp((dx / distXZ) * 0.06, -0.06, 0.06);
          lookY = THREE.MathUtils.clamp((fb.ballY - spring.position.y) * 0.05, -0.04, 0.08);
        } else if (isPlayingBubbles) {
          lookX = Math.sin(t * 3) * 0.04;
          lookY = 0.068; // Eyes look up at the floating 3D bubbles in the meadow!
        } else if (isBlowingBubbles) {
          lookX = THREE.MathUtils.clamp(state.pointer.x * 0.08, -0.06, 0.06);
          lookY = THREE.MathUtils.clamp(state.pointer.y * 0.06 + 0.04, -0.02, 0.08); // Eyes follow the bubbles on screen!
        } else if (isDraggingFood) {
          // Eyes eagerly locked on food being dragged by player across the screen!
          lookX = THREE.MathUtils.clamp(state.pointer.x * 0.08, -0.065, 0.065);
          lookY = THREE.MathUtils.clamp(state.pointer.y * 0.06 + 0.045, -0.02, 0.08);
        } else if (isEating) {
          lookX = 0;
          lookY = -0.05;
        } else if (expression === "hungry") {
          // Looking up pleadingly at the player begging for food
          lookX = 0;
          lookY = 0.045;
        } else if (expression === "tired") {
          // Heavy weary gaze drooping downward
          lookX = 0;
          lookY = -0.025;
        } else if (currentState === "curious") {
          lookX = fsm.lookTarget.x * 0.08;
          lookY = fsm.lookTarget.y * 0.06;
        }

        leftEyeRef.current.position.x = -0.35 + lookX;
        leftEyeRef.current.position.y = 0.07 + lookY;
        rightEyeRef.current.position.x = 0.35 + lookX;
        rightEyeRef.current.position.y = 0.07 + lookY;

        if (expression === "hungry") {
          // Puppy dog pleading sad watery eyes with outer corner droop & looking up
          leftEyeRef.current.scale.set(1.22, 1.35 * blinkScaleY, 0.52);
          rightEyeRef.current.scale.set(1.22, 1.35 * blinkScaleY, 0.52);
          // Outward droop (sad puppy eyes)
          leftEyeRef.current.rotation.z = 0.16;
          rightEyeRef.current.rotation.z = -0.16;
          if (leftCatchlightRef.current && rightCatchlightRef.current) {
            const catchPulse = 1.35 + Math.sin(t * 8) * 0.2;
            leftCatchlightRef.current.scale.setScalar(catchPulse);
            rightCatchlightRef.current.scale.setScalar(catchPulse);
          }
        } else if (expression === "tired") {
          // Heavy weary droopy eyelids (u u) - flat sleepy cute eyes without alien slant
          leftEyeRef.current.scale.set(1.10, 0.20 * blinkScaleY, 0.48);
          rightEyeRef.current.scale.set(1.10, 0.20 * blinkScaleY, 0.48);
          leftEyeRef.current.rotation.z = 0;
          rightEyeRef.current.rotation.z = 0;
        } else if (expression === "angry") {
          // Fierce angled pouting angry eyes (> <)
          leftEyeRef.current.scale.set(1.12, 0.65 * blinkScaleY, 0.52);
          rightEyeRef.current.scale.set(1.12, 0.65 * blinkScaleY, 0.52);
          leftEyeRef.current.rotation.z = 0.32;
          rightEyeRef.current.rotation.z = -0.32;
          if (leftCatchlightRef.current && rightCatchlightRef.current) {
            leftCatchlightRef.current.scale.setScalar(0.65);
            rightCatchlightRef.current.scale.setScalar(0.65);
          }
        } else if (expression === "bored") {
          // Flat horizontal slit eyes (- -)
          leftEyeRef.current.scale.set(1.24, 0.22 * blinkScaleY, 0.52);
          rightEyeRef.current.scale.set(1.24, 0.22 * blinkScaleY, 0.52);
          leftEyeRef.current.rotation.z = 0;
          rightEyeRef.current.rotation.z = 0;
        } else {
          // Normal awake eyes
          leftEyeRef.current.scale.set(1.0, 1.24 * blinkScaleY, 0.52);
          rightEyeRef.current.scale.set(1.0, 1.24 * blinkScaleY, 0.52);
          leftEyeRef.current.rotation.z = -0.05;
          rightEyeRef.current.rotation.z = 0.05;
          if (leftCatchlightRef.current && rightCatchlightRef.current) {
            leftCatchlightRef.current.scale.setScalar(1.0);
            rightCatchlightRef.current.scale.setScalar(1.0);
          }
        }
      }
    }

    // Spinning Spiral Dizzy Eyes (@_@)
    if (dizzyEyesGroupRef.current) {
      dizzyEyesGroupRef.current.visible = isDizzy;
      if (isDizzy) {
        if (dizzyLeftEyeRef.current) {
          dizzyLeftEyeRef.current.rotation.z = t * 9.5;
        }
        if (dizzyRightEyeRef.current) {
          dizzyRightEyeRef.current.rotation.z = -t * 9.5;
        }
      }
    }

    const showCatchlights =
      !isSleeping &&
      !isDizzy &&
      !isChewing &&
      !isBathSquint &&
      !isHappyFace &&
      expression !== "bored" &&
      expression !== "tired";

    if (leftCatchlightRef.current && rightCatchlightRef.current) {
      leftCatchlightRef.current.visible = showCatchlights;
      rightCatchlightRef.current.visible = showCatchlights;
    }
    if (leftSubCatchlightRef.current && rightSubCatchlightRef.current) {
      leftSubCatchlightRef.current.visible = showCatchlights;
      rightSubCatchlightRef.current.visible = showCatchlights;
    }

    // Peaceful Sleeping Closed Eyelids or Sweet Petting/Play Eyes (︶ ︶)
    if (sleepEyesRef.current) {
      sleepEyesRef.current.visible = isSleeping || isHappyFace;
      if (isSleeping || isHappyFace) {
        sleepEyesRef.current.position.y = 0.01 - sleepBreath * 0.012;
      }
    }

    // 8. Mouth: Dynamic Expression vs Eating vs Sleeping
    const isTiredMouth = !isSleeping && !isDizzy && !isEating && !isHappyFace && expression === "tired";
    const isHungryMouth = !isSleeping && !isDizzy && !isEating && !isHappyFace && expression === "hungry";
    const isAngryMouth = !isSleeping && !isDizzy && !isEating && !isHappyFace && expression === "angry";
    const isBoredMouth = !isSleeping && !isDizzy && !isEating && !isHappyFace && expression === "bored";
    const isDefaultMouth =
      !isSleeping &&
      !isDizzy &&
      !isHungryMouth &&
      !isAngryMouth &&
      !isBoredMouth &&
      !isTiredMouth;

    if (mouthGroupRef.current) {
      mouthGroupRef.current.visible = isDefaultMouth;
      if (isDefaultMouth) {
        if (isEating) {
          const eatT = eatingTimer.current;
          if (eatT < 0.7) {
            mouthGroupRef.current.scale.set(1.25, 1.4, 1);
          } else if (eatT < 2.5) {
            const chew = 0.35 + Math.abs(Math.sin(t * 16)) * 0.75;
            mouthGroupRef.current.scale.set(1.1, chew, 1);
          } else {
            mouthGroupRef.current.scale.set(1.2, 1.15, 1);
          }
          mouthGroupRef.current.position.set(0, -0.01, 1.035);
        } else if (isDraggingFood) {
          // Open mouth anticipating delicious food!
          mouthGroupRef.current.scale.set(1.22, 1.35, 1);
          mouthGroupRef.current.position.set(0, -0.015, 1.035);
        } else if (isHappyFace || isBlowingBubbles || isPlayingBubbles) {
          mouthGroupRef.current.scale.set(1.18 + Math.sin(t * 8) * 0.08, 1.16, 1);
          mouthGroupRef.current.position.set(0, -0.01, 1.035);
        } else {
          // Content normal gentle smile
          mouthGroupRef.current.scale.set(1, 1, 1);
          mouthGroupRef.current.position.set(0, -0.01, 1.035);
        }
      }
    }

    if (sleepyMouthGroupRef.current) {
      sleepyMouthGroupRef.current.visible = isTiredMouth;
      if (isTiredMouth) {
        // Cute slow sleepy breathing & subtle yawn cycle every ~8 seconds
        const yawnCycle = (t * 0.75) % 8;
        if (yawnCycle < 1.4) {
          const yawnPhase = Math.sin((yawnCycle / 1.4) * Math.PI);
          sleepyMouthGroupRef.current.scale.set(1.0 + yawnPhase * 0.35, 1.0 + yawnPhase * 1.6, 1);
          sleepyMouthGroupRef.current.position.set(0, -0.035 - yawnPhase * 0.012, 1.035);
        } else {
          sleepyMouthGroupRef.current.scale.set(1, 1, 1);
          sleepyMouthGroupRef.current.position.set(0, -0.035, 1.035);
        }
      }
    }

    if (hungryMouthGroupRef.current) {
      hungryMouthGroupRef.current.visible = isHungryMouth;
      if (isHungryMouth) {
        // Subtle trembling longing "o" mouth
        const quiver = 1 + Math.sin(t * 12) * 0.08;
        hungryMouthGroupRef.current.scale.set(quiver, quiver, 1);
        hungryMouthGroupRef.current.position.set(0, -0.035, 1.035);
      }
    }

    if (poutMouthGroupRef.current) {
      poutMouthGroupRef.current.visible = isAngryMouth;
      if (isAngryMouth) {
        const huff = 1 + Math.sin(t * 8) * 0.05;
        poutMouthGroupRef.current.scale.set(huff, 1, 1);
        poutMouthGroupRef.current.position.set(0, -0.02, 1.035);
      }
    }

    if (flatMouthGroupRef.current) {
      flatMouthGroupRef.current.visible = isBoredMouth;
      if (isBoredMouth) {
        flatMouthGroupRef.current.scale.set(1, 1, 1);
        flatMouthGroupRef.current.position.set(0, -0.02, 1.035);
      }
    }

    // Dynamic Cheeks, Accessories & Dirty Overlays
    const isAngry = !isSleeping && expression === "angry";
    const cheekColor = isAngry
      ? "#DC2626"
      : isPettingActive || isBlowingBubbles || isPlayingBubbles
      ? "#F43F5E"
      : "#F97316";
    if (leftCheekMatRef.current) leftCheekMatRef.current.color.set(cheekColor);
    if (rightCheekMatRef.current) rightCheekMatRef.current.color.set(cheekColor);
    if (leftCheekGroupRef.current && rightCheekGroupRef.current) {
      const cheekScale = isAngry ? 1.25 : 1.0;
      leftCheekGroupRef.current.scale.setScalar(cheekScale);
      rightCheekGroupRef.current.scale.setScalar(cheekScale);
    }

    // Saliva Drip (Hungry)
    if (salivaDripRef.current) {
      const showSaliva = !isSleeping && !isEating && !isPlayingToy && expression === "hungry";
      salivaDripRef.current.visible = showSaliva;
      if (showSaliva) {
        const dripScale = 0.85 + Math.sin(t * 5) * 0.22;
        salivaDripRef.current.scale.set(1, dripScale, 1);
      }
    }

    // Anime Sweat Drop (Tired) - daytime exhaustion only, not peaceful nighttime drowsiness
    if (sweatDropRef.current) {
      const showSweat = !isSleeping && !isPlayingToy && expression === "tired" && !isNightSleepy;
      sweatDropRef.current.visible = showSweat;
      if (showSweat) {
        sweatDropRef.current.position.y = 0.48 + Math.sin(t * 6.5) * 0.035;
      }
    }

    // Anger Steam Puffs (Angry)
    if (angerSteamGroupRef.current) {
      const showSteam = !isSleeping && !isPlayingToy && expression === "angry";
      angerSteamGroupRef.current.visible = showSteam;
      if (showSteam) {
        const steamPuff = 0.75 + Math.sin(t * 8) * 0.28;
        angerSteamGroupRef.current.scale.setScalar(steamPuff);
      }
    }

    // Bored Heavy Sigh Cloud
    if (sighCloudRef.current) {
      const showSigh = !isSleeping && !isPlayingToy && expression === "bored";
      sighCloudRef.current.visible = showSigh;
      if (showSigh) {
        const sighCycle = (t * 0.35) % 1;
        sighCloudRef.current.position.set(0.12 + sighCycle * 0.15, -0.02 + sighCycle * 0.42, 1.06);
        const sighScale = Math.sin(sighCycle * Math.PI) * 0.85;
        sighCloudRef.current.scale.setScalar(sighScale);
      }
    }

    // Mud Splatters & Orbiting Dust/Fly Specks (Dirty)
    if (mudGroupRef.current) {
      mudGroupRef.current.visible = isDirty;
    }
    if (dustGroupRef.current) {
      dustGroupRef.current.visible = isDirty;
      if (isDirty) {
        for (let i = 0; i < 3; i++) {
          const speck = dustSpeckRefs.current[i];
          if (speck) {
            const angle = t * 3.5 + (i * Math.PI * 2) / 3;
            const jitter = Math.sin(t * 19 + i * 5) * 0.08;
            speck.position.set(
              Math.cos(angle) * 0.72 + jitter,
              0.35 + Math.sin(t * 4 + i) * 0.3 + jitter,
              Math.sin(angle) * 0.65 + jitter
            );
          }
        }
      }
    }

    // Dirty Skin Material Reaction
    if (bodyMeshRef.current) {
      const mat = bodyMeshRef.current.material as THREE.MeshPhysicalMaterial;
      if (mat) {
        // Dynamic jelly luster based on cleanliness (clean = crystal clear gloss, dirty = matte dusty finish)
        const cleanRatio = Math.max(0, Math.min(1, liveAttributes.cleanliness / 100));
        mat.roughness = THREE.MathUtils.lerp(0.42, 0.10, cleanRatio);
        mat.clearcoat = THREE.MathUtils.lerp(0.22, 1.0, cleanRatio);
      }
    }

    // Dirty Dust Shake Shiver
    if (isDirty && !isSleeping && !isEating && !isPlayingToy) {
      dirtyShakeTimer.current.timer += delta;
      if (dirtyShakeTimer.current.timer > dirtyShakeTimer.current.nextShake) {
        if (groupRef.current) {
          groupRef.current.rotation.z = Math.sin(dirtyShakeTimer.current.timer * 36) * 0.12;
        }
        if (dirtyShakeTimer.current.timer > dirtyShakeTimer.current.nextShake + 0.35) {
          dirtyShakeTimer.current.timer = 0;
          dirtyShakeTimer.current.nextShake = 5 + Math.random() * 5;
          soundEffects.playPlop();
        }
      }
    }

    // Wavy Squiggly Dizzy Mouth (~)
    if (dizzyMouthRef.current) {
      dizzyMouthRef.current.visible = isDizzy;
      if (isDizzy) {
        dizzyMouthRef.current.rotation.z = Math.sin(t * 14) * 0.14;
        dizzyMouthRef.current.scale.set(1 + Math.sin(t * 9) * 0.12, 1, 1);
      }
    }

    // Orbiting Golden Stars Halo Above Juro's Crown when Dizzy
    if (dizzyHaloRef.current) {
      dizzyHaloRef.current.visible = isDizzy;
      if (isDizzy) {
        dizzyHaloRef.current.rotation.z = Math.sin(t * 4.2) * 0.12 * motionScale;
        for (let i = 0; i < 3; i++) {
          const star = dizzyStarRefs.current[i];
          if (star) {
            const angle = t * 4.6 + (i * Math.PI * 2) / 3;
            star.position.x = Math.cos(angle) * 0.68;
            star.position.z = Math.sin(angle) * 0.56;
            star.position.y = Math.sin(t * 7 + i * 2) * 0.065;
            const s = (0.24 + Math.sin(t * 8 + i) * 0.03) * (0.65 + dizzyFade * 0.35);
            star.scale.set(s, s, 1);
            (star.material as THREE.SpriteMaterial).opacity = dizzyFade;
          }
        }
      }
    }

    // Cozy Sleeping Mouth ("o") + Breathing Sleep Bubble
    if (sleepMouthGroupRef.current) {
      sleepMouthGroupRef.current.visible = isSleeping;
      if (isSleeping) {
        const mouthPulse = 0.85 + (sleepBreath * 0.5 + 0.5) * 0.3;
        sleepMouthGroupRef.current.scale.set(mouthPulse, mouthPulse, 1);
      }
    }

    if (sleepBubbleRef.current) {
      sleepBubbleRef.current.visible = isSleeping;
      if (isSleeping) {
        // Bubble inflates smoothly during exhale and shrinks gently during inhale
        const bubbleScale = 0.55 + (sleepBreath * 0.5 + 0.5) * 0.65;
        sleepBubbleRef.current.scale.setScalar(bubbleScale);
        sleepBubbleRef.current.position.y = -0.05 + bubbleScale * 0.03;
      }
    }

    // 9. Animated Floating "Z" "z" "z" Pixel Sprites rising smoothly in a wavy arc
    if (zzzGroupRef.current) {
      zzzGroupRef.current.visible = isSleeping;
      if (isSleeping) {
        zOffsets.forEach((offset, idx) => {
          const sprite = zSpriteRefs.current[idx];
          if (sprite) {
            const progress = (t * 0.35 + offset) % 1; // 0 -> 1 continuous cycle
            // Drift up and gently wave left/right
            sprite.position.x = 0.55 + progress * 0.5 + Math.sin(progress * Math.PI * 2) * 0.12;
            sprite.position.y = 0.62 + progress * 1.15;
            sprite.position.z = 0.45;

            // Grow smoothly from small z to bigger Z
            const size = 0.2 + progress * 0.26;
            sprite.scale.set(size, size, 1);

            // Smooth fade-in and fade-out
            const alpha =
              progress < 0.18
                ? progress / 0.18
                : progress > 0.72
                ? (1 - progress) / 0.28
                : 1.0;
            (sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, alpha));
          }
        });
      }
    }

    // 9.5 Cute Leaf Umbrella Swaying & Bobbing in the Rain
    if (leafUmbrellaRef.current) {
      leafUmbrellaRef.current.visible = isRaining;
      if (isRaining) {
        const rainSway = Math.sin(t * 3.4) * 0.05 + Math.cos(t * 2.1) * 0.03;
        leafUmbrellaRef.current.rotation.z = -0.06 + rainSway;
        leafUmbrellaRef.current.rotation.x = 0.08 + Math.sin(t * 4.2) * 0.035;
        leafUmbrellaRef.current.position.y = 0.52 + Math.sin(t * 3.6) * 0.015;
      }
    }

    // 9.6 Mini Golden Crown (Stage 3 Evolution: Juro Mulia, Lv. 10+)
    if (crownRef.current) {
      crownRef.current.visible = level >= 10;
      if (level >= 10) {
        crownRef.current.position.y = 0.86 + Math.sin(t * 3.2) * 0.012;
        crownRef.current.rotation.z = Math.sin(t * 2.4) * 0.03;
      }
    }

    // 10. 3D Soap Foam Bubbles Clinging to Juro (InstancedMesh)
    if (soapFoamInstRef.current) {
      soapFoamInstRef.current.visible = soapLevelNow > 0.01;
      if (soapLevelNow > 0.01) {
        for (let i = 0; i < soapBubblesData.length; i++) {
          const b = soapBubblesData[i];
          const progress = THREE.MathUtils.clamp((soapLevelNow - b.threshold * 0.82) / 0.18, 0, 1);
          const wobble = isScrubbingNow
            ? 1 + Math.sin(t * 14 + b.phase) * 0.14
            : 1 + Math.sin(t * 3.2 + b.phase) * 0.05;
          const radius = b.size * progress * wobble;

          _bathDummy.position.set(
            b.pos[0],
            b.pos[1] + Math.sin(t * 2.5 + b.phase) * 0.012,
            b.pos[2]
          );
          _bathDummy.rotation.set(0, 0, 0);
          _bathDummy.scale.set(radius, radius, radius);
          _bathDummy.updateMatrix();
          soapFoamInstRef.current.setMatrixAt(i, _bathDummy.matrix);
        }
        soapFoamInstRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // 12. 3D Cascading Water Rinse Shower Droplets (InstancedMesh)
    if (waterDropsInstRef.current) {
      waterDropsInstRef.current.visible = isRinsingNow;
      if (isRinsingNow) {
        for (let i = 0; i < waterDropsData.length; i++) {
          const wd = waterDropsData[i];
          const p = (t * wd.speed + wd.offset) % 1;
          const x = THREE.MathUtils.lerp(wd.startX, wd.endX, p);
          const z = THREE.MathUtils.lerp(wd.startZ, wd.endZ, p);
          // Parabolic fall from bucket spout above Juro down to splash around floor
          const y = 1.68 - p * p * 2.5;
          const stretchY = 0.08 + p * 0.07;
          const width = 0.048 * (1 - p * 0.25);

          _bathDummy.position.set(x, y, z);
          _bathDummy.rotation.set(0, 0, 0);
          _bathDummy.scale.set(width, stretchY, width);
          _bathDummy.updateMatrix();
          waterDropsInstRef.current.setMatrixAt(i, _bathDummy.matrix);
        }
        waterDropsInstRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  const isCurrentlyEating = storeState === "eating";
  const isPlayingToy = storeState === "play" && Boolean(currentToyBeingPlayed);

  return (
    <>
      {/* Main Character Group (Clicking opens action menu; dragging managed via Pegang) */}
      <group
        ref={groupRef}
        position={[0, -0.1, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          const now = performance.now();
          rapidTapHistoryRef.current = rapidTapHistoryRef.current.filter((ts) => now - ts < 1100);
          rapidTapHistoryRef.current.push(now);
          if (
            rapidTapHistoryRef.current.length >= 5 &&
            dizzyRef.current.timer <= 0.2 &&
            fsm.currentState !== "sleep"
          ) {
            dizzyRef.current.timer = 3.2;
            rapidTapHistoryRef.current = [];
            soundEffects.playDizzy();
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          soundEffects.playPet();
          if (fsm.currentState === "wander") {
            jumpRef.current.active = false;
            fsm.transitionTo("idle", true);
            setBehaviorState("idle");
          }
          // Project Juro's crown/head to screen coordinates immediately
          _projCenter
            .set(
              spring.position.x,
              spring.position.y + 1.15 * currentPetScaleRef.current,
              spring.position.z
            )
            .project(camera);
          const screenX = (_projCenter.x * 0.5 + 0.5) * size.width;
          const screenY = (-_projCenter.y * 0.5 + 0.5) * size.height;

          onPetClick?.({ x: screenX, y: screenY });
        }}
      >
        {/* Main Sculpted Chubby Jelly Body */}
        <mesh ref={bodyMeshRef} geometry={outerBodyGeometry}>
          <meshPhysicalMaterial
            vertexColors={true}
            roughness={0.14}
            metalness={0.02}
            clearcoat={1.0}
            clearcoatRoughness={0.06}
            sheen={0.55}
            sheenColor={skinPalette.centerColor}
            emissive={skinPalette.emissiveColor}
            emissiveIntensity={0.08}
          />
        </mesh>

        {/* Top-Right Soft Glossy Jelly Swirl Fold (Tucked smoothly into crown) */}
        <mesh
          position={[0.24, 0.72, 0.02]}
          rotation={[0.22, 0.35, -0.2]}
          scale={[1.0, 0.72, 1.0]}
        >
          <torusGeometry args={[0.3, 0.088, 16, 32, Math.PI * 0.85]} />
          <meshPhysicalMaterial
            color={skinPalette.limbColor}
            roughness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            emissive={skinPalette.emissiveColor}
            emissiveIntensity={0.12}
          />
        </mesh>

        {/* Left Jelly Droplet Arm */}
        <mesh position={[-1.16, -0.22, 0.04]} rotation={[0, 0, 0.35]} scale={[1.22, 0.85, 0.85]}>
          <sphereGeometry args={[0.21, 24, 24]} />
          <meshPhysicalMaterial
            color={skinPalette.limbColor}
            roughness={0.12}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            emissive={skinPalette.emissiveColor}
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* Right Jelly Droplet Arm */}
        <mesh position={[1.16, -0.2, 0.02]} rotation={[0, 0, -0.35]} scale={[1.22, 0.85, 0.85]}>
          <sphereGeometry args={[0.21, 24, 24]} />
          <meshPhysicalMaterial
            color={skinPalette.limbColor}
            roughness={0.12}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            emissive={skinPalette.emissiveColor}
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* === AWAKE EYES === */}
        <group ref={leftEyeRef} position={[-0.35, 0.07, 0.96]} rotation={[0, -0.24, -0.05]}>
          <mesh scale={[1.0, 1.24, 0.52]}>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#1E140E" roughness={0.08} metalness={0.05} />
          </mesh>
          <mesh ref={leftCatchlightRef} position={[0.032, 0.042, 0.056]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh ref={leftSubCatchlightRef} position={[-0.025, -0.042, 0.052]}>
            <sphereGeometry args={[0.014, 10, 10]} />
            <meshBasicMaterial color="#FFFFFF" opacity={0.7} transparent />
          </mesh>
        </group>

        <group ref={rightEyeRef} position={[0.35, 0.07, 0.96]} rotation={[0, 0.24, 0.05]}>
          <mesh scale={[1.0, 1.24, 0.52]}>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#1E140E" roughness={0.08} metalness={0.05} />
          </mesh>
          <mesh ref={rightCatchlightRef} position={[0.032, 0.042, 0.056]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh ref={rightSubCatchlightRef} position={[-0.025, -0.042, 0.052]}>
            <sphereGeometry args={[0.014, 10, 10]} />
            <meshBasicMaterial color="#FFFFFF" opacity={0.7} transparent />
          </mesh>
        </group>

        {/* === DIZZY SPINNING SPIRAL EYES (@_@) === */}
        <group ref={dizzyEyesGroupRef} visible={false}>
          {dizzyEyeTexture && (
            <>
              <mesh
                ref={dizzyLeftEyeRef}
                position={[-0.35, 0.07, 1.015]}
                rotation={[0, -0.24, 0]}
              >
                <planeGeometry args={[0.28, 0.28]} />
                <meshBasicMaterial map={dizzyEyeTexture} transparent depthWrite={false} />
              </mesh>
              <mesh
                ref={dizzyRightEyeRef}
                position={[0.35, 0.07, 1.015]}
                rotation={[0, 0.24, 0]}
              >
                <planeGeometry args={[0.28, 0.28]} />
                <meshBasicMaterial map={dizzyEyeTexture} transparent depthWrite={false} />
              </mesh>
            </>
          )}
        </group>

        {/* === SLEEPING PEACEFUL CURVED EYELIDS (︶  ︶) === */}
        <group ref={sleepEyesRef} visible={false}>
          {/* Left Closed Eyelid Arc */}
          <mesh position={[-0.34, 0.1, 0.985]} rotation={[0, -0.24, Math.PI + 0.06]}>
            <torusGeometry args={[0.095, 0.022, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#271A12" roughness={0.25} />
          </mesh>
          {/* Right Closed Eyelid Arc */}
          <mesh position={[0.34, 0.1, 0.985]} rotation={[0, 0.24, Math.PI - 0.06]}>
            <torusGeometry args={[0.095, 0.022, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#271A12" roughness={0.25} />
          </mesh>
        </group>

        {/* === AWAKE SMILING OPEN MOUTH === */}
        <group ref={mouthGroupRef} position={[0, -0.01, 1.035]}>
          <mesh position={[0, 0, 0]}>
            <shapeGeometry args={[mouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.008, 0.006]}>
            <shapeGeometry args={[tongueShape]} />
            <meshBasicMaterial color="#FB7185" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* === HUNGRY TREMBLING LONGING "o" MOUTH === */}
        <group ref={hungryMouthGroupRef} position={[0, -0.035, 1.035]} visible={false}>
          <mesh>
            <shapeGeometry args={[hungryMouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* === ANGRY DOWNWARD POUT MOUTH === */}
        <group ref={poutMouthGroupRef} position={[0, -0.02, 1.035]} visible={false}>
          <mesh>
            <shapeGeometry args={[poutMouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* === BORED FLAT LINE MOUTH === */}
        <group ref={flatMouthGroupRef} position={[0, -0.02, 1.035]} visible={false}>
          <mesh>
            <shapeGeometry args={[flatMouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* === SLEEPY / DROWSY RELAXED MOUTH === */}
        <group ref={sleepyMouthGroupRef} position={[0, -0.035, 1.035]} visible={false}>
          <mesh>
            <shapeGeometry args={[sleepyMouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* === DIZZY WAVY MOUTH (~) === */}
        {dizzyMouthTexture && (
          <mesh ref={dizzyMouthRef} position={[0, -0.06, 1.045]} visible={false}>
            <planeGeometry args={[0.3, 0.15]} />
            <meshBasicMaterial map={dizzyMouthTexture} transparent depthWrite={false} />
          </mesh>
        )}

        {/* === ORBITING DIZZY STARS HALO ABOVE HEAD === */}
        <group ref={dizzyHaloRef} position={[0, 1.18, 0.05]} visible={false}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.66, 0.015, 8, 32]} />
            <meshBasicMaterial color="#FDE047" transparent opacity={0.45} depthWrite={false} />
          </mesh>
          {dizzyStarTexture &&
            [0, 1, 2].map((idx) => (
              <sprite
                key={idx}
                ref={(el) => {
                  dizzyStarRefs.current[idx] = el;
                }}
              >
                <spriteMaterial
                  map={dizzyStarTexture}
                  transparent
                  depthWrite={false}
                  opacity={1}
                />
              </sprite>
            ))}
        </group>

        {/* === SLEEPING BREATHING MOUTH ("o") + EXPANDING SLEEP BUBBLE === */}
        <group ref={sleepMouthGroupRef} position={[0, -0.075, 1.035]} visible={false}>
          <mesh>
            <circleGeometry args={[0.046, 20]} />
            <meshBasicMaterial color="#7C2D12" />
          </mesh>
          <mesh position={[0, -0.012, 0.003]}>
            <circleGeometry args={[0.028, 16]} />
            <meshBasicMaterial color="#FB7185" />
          </mesh>
        </group>

        {/* Translucent Breathing Sleep Bubble */}
        <mesh ref={sleepBubbleRef} position={[0.06, -0.06, 1.12]} visible={false}>
          <sphereGeometry args={[0.088, 20, 20]} />
          <meshPhysicalMaterial
            color="#E0F2FE"
            roughness={0.05}
            clearcoat={1.0}
            transparent
            opacity={0.62}
            emissive="#BAE6FD"
            emissiveIntensity={0.2}
          />
          {/* Tiny shiny highlight dot on sleep bubble */}
          <mesh position={[-0.025, 0.03, 0.072]}>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </mesh>

        {/* === CHEEK BLUSH STRIPES (Dynamically Flushes Crimson when Angry, Rosy when Petted) === */}
        <group ref={leftCheekGroupRef} position={[-0.45, -0.075, 0.945]} rotation={[0, -0.36, -0.16]}>
          <mesh position={[-0.038, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.046, 4, 8]} />
            <meshBasicMaterial ref={leftCheekMatRef} color="#F97316" opacity={0.92} transparent />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.058, 4, 8]} />
            <meshBasicMaterial color="#F97316" opacity={0.92} transparent />
          </mesh>
          <mesh position={[0.038, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.046, 4, 8]} />
            <meshBasicMaterial color="#F97316" opacity={0.92} transparent />
          </mesh>
        </group>

        <group ref={rightCheekGroupRef} position={[0.45, -0.075, 0.945]} rotation={[0, 0.36, 0.16]}>
          <mesh position={[-0.038, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.046, 4, 8]} />
            <meshBasicMaterial ref={rightCheekMatRef} color="#F97316" opacity={0.92} transparent />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.058, 4, 8]} />
            <meshBasicMaterial color="#F97316" opacity={0.92} transparent />
          </mesh>
          <mesh position={[0.038, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.046, 4, 8]} />
            <meshBasicMaterial color="#F97316" opacity={0.92} transparent />
          </mesh>
        </group>

        {/* Detailed Sculpted 3D Food Prop ONLY Rendered When Actively Eating */}
        {isCurrentlyEating && (
          <group ref={foodPropRef} position={[0, -0.14, 1.48]}>
            <FoodProp3D foodId={currentFoodBeingEaten?.id} />

            {/* Matching Food Crumbs / Drops for all 5 Shop Foods */}
            <group ref={crumbsGroupRef} visible={false}>
              <mesh position={[0.16, 0.09, 0.05]}>
                <sphereGeometry args={[0.024, 8, 8]} />
                <meshBasicMaterial
                  color={
                    currentFoodBeingEaten?.id === "melon-cubes"
                      ? "#34D399"
                      : currentFoodBeingEaten?.id === "honey-drop"
                      ? "#FBBF24"
                      : currentFoodBeingEaten?.id === "biscuit"
                      ? "#D97706"
                      : currentFoodBeingEaten?.id === "warm-milk"
                      ? "#FFFBEB"
                      : "#F97316"
                  }
                />
              </mesh>
              <mesh position={[-0.14, 0.1, 0.06]}>
                <sphereGeometry args={[0.022, 8, 8]} />
                <meshBasicMaterial
                  color={
                    currentFoodBeingEaten?.id === "melon-cubes"
                      ? "#10B981"
                      : currentFoodBeingEaten?.id === "honey-drop"
                      ? "#FDE047"
                      : currentFoodBeingEaten?.id === "biscuit"
                      ? "#F59E0B"
                      : currentFoodBeingEaten?.id === "warm-milk"
                      ? "#FFFFFF"
                      : "#FB923C"
                  }
                />
              </mesh>
              <mesh position={[0.1, -0.09, 0.07]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshBasicMaterial
                  color={
                    currentFoodBeingEaten?.id === "melon-cubes"
                      ? "#A7F3D0"
                      : currentFoodBeingEaten?.id === "honey-drop"
                      ? "#F59E0B"
                      : currentFoodBeingEaten?.id === "biscuit"
                      ? "#FBBF24"
                      : currentFoodBeingEaten?.id === "warm-milk"
                      ? "#FEF3C7"
                      : "#F97316"
                  }
                />
              </mesh>
              <mesh position={[-0.09, -0.08, 0.06]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshBasicMaterial
                  color={
                    currentFoodBeingEaten?.id === "melon-cubes"
                      ? "#ECFDF5"
                      : currentFoodBeingEaten?.id === "honey-drop"
                      ? "#FEF3C7"
                      : currentFoodBeingEaten?.id === "biscuit"
                      ? "#FDE68A"
                      : currentFoodBeingEaten?.id === "warm-milk"
                      ? "#F8FAFC"
                      : "#FED7AA"
                  }
                />
              </mesh>
            </group>
          </group>
        )}


        {/* Pleading Hungry Droplet at mouth corner */}
        <group ref={salivaDripRef} position={[-0.08, -0.15, 1.05]} visible={false}>
          <mesh scale={[0.024, 0.048, 0.024]}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshPhysicalMaterial
              color="#BAE6FD"
              roughness={0.06}
              clearcoat={1.0}
              transparent
              opacity={0.85}
              emissive="#E0F2FE"
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position={[0, 0.032, 0]} scale={[0.014, 0.028, 0.014]}>
            <coneGeometry args={[1, 1.5, 8]} />
            <meshPhysicalMaterial
              color="#BAE6FD"
              roughness={0.06}
              clearcoat={1.0}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>

        {/* Anime Weary Sweat Droplet on forehead */}
        <group ref={sweatDropRef} position={[0.42, 0.48, 0.82]} rotation={[0, 0, -0.28]} visible={false}>
          <mesh scale={[0.038, 0.062, 0.03]}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshPhysicalMaterial
              color="#38BDF8"
              roughness={0.05}
              clearcoat={1.0}
              transparent
              opacity={0.88}
              emissive="#7DD3FC"
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh position={[0, 0.048, 0]} rotation={[0, 0, Math.PI]} scale={[0.028, 0.045, 0.024]}>
            <coneGeometry args={[1, 1.6, 10]} />
            <meshPhysicalMaterial
              color="#38BDF8"
              roughness={0.05}
              clearcoat={1.0}
              transparent
              opacity={0.88}
            />
          </mesh>
        </group>

        {/* Cartoon Anger Steam Puffs on Crown */}
        <group ref={angerSteamGroupRef} visible={false}>
          <group position={[-0.45, 0.95, 0.15]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.068, 12, 12]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
            </mesh>
            <mesh position={[-0.035, 0.052, 0]}>
              <sphereGeometry args={[0.048, 10, 10]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
            </mesh>
            <mesh position={[0.032, 0.045, 0]}>
              <sphereGeometry args={[0.04, 10, 10]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
            </mesh>
          </group>
          <group position={[0.45, 0.95, 0.15]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.068, 12, 12]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
            </mesh>
            <mesh position={[0.035, 0.052, 0]}>
              <sphereGeometry args={[0.048, 10, 10]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
            </mesh>
            <mesh position={[-0.032, 0.045, 0]}>
              <sphereGeometry args={[0.04, 10, 10]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
            </mesh>
          </group>
        </group>

        {/* Soft Sigh Cloud */}
        <group ref={sighCloudRef} position={[0.12, -0.02, 1.05]} visible={false}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.052, 12, 12]} />
            <meshBasicMaterial color="#F3F4F6" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0.038, 0.02, 0]}>
            <sphereGeometry args={[0.036, 10, 10]} />
            <meshBasicMaterial color="#F3F4F6" transparent opacity={0.65} />
          </mesh>
          <mesh position={[-0.032, 0.015, 0]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshBasicMaterial color="#F3F4F6" transparent opacity={0.6} />
          </mesh>
        </group>

        {/* 5 Sculpted Dark Mud Splatters clinging to Juro's Body */}
        <group ref={mudGroupRef} visible={false}>
          {/* Mud Blot 1 - Crown */}
          <mesh position={[0.18, 0.74, 0.42]} rotation={[0.4, 0.2, -0.3]} scale={[1.2, 0.35, 1.0]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#451A03" roughness={0.85} />
          </mesh>
          {/* Mud Blot 2 - Left Flank */}
          <mesh position={[-0.72, 0.16, 0.65]} rotation={[-0.2, -0.5, 0.3]} scale={[0.85, 1.25, 0.4]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color="#3E1A04" roughness={0.85} />
          </mesh>
          {/* Mud Blot 3 - Right Shoulder */}
          <mesh position={[0.78, -0.15, 0.58]} rotation={[0.2, 0.6, -0.2]} scale={[1.1, 0.85, 0.45]}>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial color="#451A03" roughness={0.85} />
          </mesh>
          {/* Mud Blot 4 - Belly Spot */}
          <mesh position={[-0.15, -0.42, 0.88]} rotation={[0.5, 0, 0]} scale={[1.15, 0.4, 0.8]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color="#3A1700" roughness={0.9} />
          </mesh>
          {/* Mud Blot 5 - Back Side */}
          <mesh position={[0.22, 0.38, -0.78]} rotation={[-0.4, 0.3, 0]} scale={[1.0, 0.5, 0.9]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color="#451A03" roughness={0.85} />
          </mesh>
        </group>

        {/* 3 Buzzing Dark Dust/Fly Specks */}
        <group ref={dustGroupRef} visible={false}>
          {[0, 1, 2].map((idx) => (
            <mesh
              key={idx}
              ref={(el) => {
                dustSpeckRefs.current[idx] = el;
              }}
            >
              <sphereGeometry args={[0.016, 6, 6]} />
              <meshBasicMaterial color="#1C1917" />
            </mesh>
          ))}
        </group>

        {/* Sculpted Glossy 3D Heart Satisfaction Pop after Eating */}
        <group ref={heartBubbleRef} position={[0, 1.0, 0.35]} visible={false}>
          <HeartPop3D />
        </group>

        {/* === ANIMATED FLOATING PIXEL "Z" "z" "z" SPRITES === */}
        <group ref={zzzGroupRef} visible={false}>
          {sleepZTexture &&
            zOffsets.map((_, idx) => (
              <sprite
                key={idx}
                ref={(el) => {
                  zSpriteRefs.current[idx] = el;
                }}
              >
                <spriteMaterial
                  map={sleepZTexture}
                  transparent
                  depthWrite={false}
                  opacity={0.9}
                />
              </sprite>
            ))}
        </group>

        {/* === 3D COZY LEAF PARASOL / UMBRELLA (Worn during Pixel Rain) === */}
        <group
          ref={leafUmbrellaRef}
          visible={false}
          position={[0.22, 0.52, 0.08]}
        >
          {/* Stem reaching up from right flank */}
          <group position={[-0.04, -0.16, 0.02]} rotation={[0.12, 0, -0.28]}>
            {/* Lower stalk */}
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.024, 0.028, 0.36, 7]} />
              <meshLambertMaterial color="#15803D" />
            </mesh>
            {/* Upper arching stem */}
            <mesh position={[0.04, 0.38, 0.02]} rotation={[0, 0, 0.36]}>
              <cylinderGeometry args={[0.018, 0.024, 0.24, 7]} />
              <meshLambertMaterial color="#166534" />
            </mesh>
          </group>

          {/* Broad organic leaf canopy sheltering Juro's head */}
          <group position={[0.04, 0.46, 0.05]} rotation={[0.22, 0.12, -0.22]}>
            {/* Main leaf blade: gentle domed disc */}
            <mesh scale={[1.45, 0.14, 1.7]}>
              <sphereGeometry args={[0.36, 16, 12]} />
              <meshStandardMaterial
                color="#22C55E"
                roughness={0.28}
                metalness={0.06}
              />
            </mesh>
            {/* Dark green leaf rim */}
            <mesh scale={[1.5, 0.06, 1.76]}>
              <sphereGeometry args={[0.355, 14, 10]} />
              <meshBasicMaterial color="#16A34A" />
            </mesh>
            {/* Leaf central spine / vein */}
            <mesh position={[0, 0.022, 0]} scale={[0.038, 0.038, 0.88]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshLambertMaterial color="#15803D" />
            </mesh>
            {/* Left lateral leaf vein */}
            <mesh position={[-0.15, 0.018, -0.06]} rotation={[0, 0.65, 0]} scale={[0.26, 0.024, 0.02]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshLambertMaterial color="#166534" />
            </mesh>
            {/* Right lateral leaf vein */}
            <mesh position={[0.15, 0.018, -0.06]} rotation={[0, -0.65, 0]} scale={[0.26, 0.024, 0.02]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshLambertMaterial color="#166534" />
            </mesh>
            {/* Glistening rain dewdrop sitting on leaf tip */}
            <mesh position={[0, 0.035, 0.5]}>
              <sphereGeometry args={[0.042, 8, 8]} />
              <meshStandardMaterial
                color="#E0F2FE"
                roughness={0.05}
                metalness={0.2}
                transparent
                opacity={0.88}
                emissive="#BAE6FD"
                emissiveIntensity={0.25}
              />
            </mesh>
          </group>
        </group>

        {/* === MINI NOBLE GOLDEN CROWN (Evolution Stage 3: Juro Mulia, Lv. 10+) === */}
        <group
          ref={crownRef}
          visible={level >= 10}
          position={[0, 0.86, 0.04]}
          rotation={[-0.05, 0, 0]}
        >
          {/* Crown Base Circlet */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.25, 0.08, 12]} />
            <meshStandardMaterial color="#CA8A04" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Crown Golden Body */}
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.27, 0.22, 0.09, 12]} />
            <meshStandardMaterial color="#FACC15" roughness={0.25} metalness={0.8} />
          </mesh>
          {/* 3 Crown Spikes (Front, Left, Right) */}
          <mesh position={[0, 0.16, 0.22]} rotation={[0.15, 0, 0]}>
            <coneGeometry args={[0.07, 0.14, 5]} />
            <meshStandardMaterial color="#FDE047" roughness={0.2} metalness={0.85} />
          </mesh>
          <mesh position={[-0.18, 0.15, 0.08]} rotation={[0.1, 0, 0.2]}>
            <coneGeometry args={[0.06, 0.12, 5]} />
            <meshStandardMaterial color="#FDE047" roughness={0.2} metalness={0.85} />
          </mesh>
          <mesh position={[0.18, 0.15, 0.08]} rotation={[0.1, 0, -0.2]}>
            <coneGeometry args={[0.06, 0.12, 5]} />
            <meshStandardMaterial color="#FDE047" roughness={0.2} metalness={0.85} />
          </mesh>
          {/* Center Ruby Gem Accent */}
          <mesh position={[0, 0.06, 0.24]}>
            <sphereGeometry args={[0.038, 8, 8]} />
            <meshStandardMaterial color="#EF4444" roughness={0.15} metalness={0.4} />
          </mesh>
        </group>

        {/* === 3D SOAP FOAM BUBBLES CLINGING TO JURO (1 Draw Call) === */}
        <instancedMesh
          ref={soapFoamInstRef}
          args={[undefined, undefined, soapBubblesData.length]}
          visible={false}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial
            color="#F0F9FF"
            roughness={0.12}
            metalness={0.05}
            transparent
            opacity={0.88}
            emissive="#E0F2FE"
            emissiveIntensity={0.22}
          />
        </instancedMesh>

        {/* === 3D CASCADING WATER RINSE DROPLETS (1 Draw Call) === */}
        <instancedMesh
          ref={waterDropsInstRef}
          args={[undefined, undefined, waterDropsData.length]}
          visible={false}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#38BDF8"
            roughness={0.08}
            metalness={0.1}
            transparent
            opacity={0.82}
            emissive="#7DD3FC"
            emissiveIntensity={0.3}
          />
        </instancedMesh>
      </group>

      {/* Soft Feathered Contact Shadow Synced to Juro's Position & Footprint */}
      <mesh
        ref={shadowRef}
        position={[0, -0.912, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={softShadowTexture ?? undefined}
          color={softShadowTexture ? "#FFFFFF" : "#1C1410"}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>

      {/* 3D World Toy Prop (Rendered in true World Coordinates, never attached to Juro's head) */}
      {isPlayingToy && currentToyBeingPlayed && (
        <group ref={worldToyRef} visible={false}>
          <group ref={worldToyMeshRef}>
            <ToyProp3D
              toyId={currentToyBeingPlayed.id}
              bounceHeight={playTimer.current}
            />
          </group>
          {currentToyBeingPlayed.id === "music-box" && (
            <>
              <MusicalNote3D progress={playTimer.current * 0.8} offset={0} />
              <MusicalNote3D progress={playTimer.current * 0.8} offset={0.33} />
              <MusicalNote3D progress={playTimer.current * 0.8} offset={0.66} />
            </>
          )}
          {currentToyBeingPlayed.id === "bubble-blower" && (
            <>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
                <PlayBubble3D
                  key={idx}
                  index={idx}
                  progress={playTimer.current * 0.75}
                />
              ))}
            </>
          )}
        </group>
      )}

      {/* 3D World Toy Ground Shadow */}
      {isPlayingToy && currentToyBeingPlayed && (
        <mesh
          ref={worldToyShadowRef}
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial
            map={softShadowTexture ?? undefined}
            color={softShadowTexture ? "#FFFFFF" : "#1C1410"}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
});
