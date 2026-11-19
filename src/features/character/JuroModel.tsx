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
  getTerrainHeightAt,
  resolveHorizontalCollisions,
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
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const sleepEyesRef = useRef<THREE.Group>(null);
  const leftCatchlightRef = useRef<THREE.Mesh>(null);
  const rightCatchlightRef = useRef<THREE.Mesh>(null);
  const mouthGroupRef = useRef<THREE.Group>(null);
  const sleepMouthGroupRef = useRef<THREE.Group>(null);
  const sleepBubbleRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
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

  // Eating animation refs
  const foodPropRef = useRef<THREE.Group>(null);
  const crumbsGroupRef = useRef<THREE.Group>(null);
  const heartBubbleRef = useRef<THREE.Group>(null);
  const eatingTimer = useRef(0);
  const lastBiteSoundRef = useRef(-1);

  // Toy playing animation refs
  const toyPropRef = useRef<THREE.Group>(null);
  const playTimer = useRef(0);
  const lastPlayHopSoundRef = useRef(-1);

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

  // Interactive Bath 3D effects (GPU-instanced for smooth mobile performance)
  const soapFoamInstRef = useRef<THREE.InstancedMesh>(null);
  const waterDropsInstRef = useRef<THREE.InstancedMesh>(null);

  const {
    getMood,
    getAttributes,
    currentState: storeState,
    currentFoodBeingEaten,
    currentToyBeingPlayed,
    clearToyBeingPlayed,
    setBehaviorState,
  } = usePetStore();
  const { activeSkin } = useGameStore();
  const skinPalette = getSkinById(activeSkin);

  const mood = getMood();
  const attributes = getAttributes();

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
    if (initialSleep) {
      const bedGroundY = getTerrainHeightAt(JURO_BED_POS.x, JURO_BED_POS.z);
      return new SpringOscillator3D(
        new THREE.Vector3(JURO_BED_POS.x, bedGroundY + BODY_BOTTOM_OFFSET, JURO_BED_POS.z),
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
        new THREE.Vector3(savedPos.x, groundY + BODY_BOTTOM_OFFSET, savedPos.z),
        {
          stiffness: 145,
          damping: 10,
          mass: 1,
        }
      );
    }
    return new SpringOscillator3D(new THREE.Vector3(0, BASE_GROUND_Y + BODY_BOTTOM_OFFSET, 0.2), {
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

    let targetX = rawX;
    let targetZ = rawZ;

    if (isBedTarget) {
      targetX = JURO_BED_POS.x;
      targetZ = JURO_BED_POS.z;
    } else {
      const rawSurface = getTerrainHeightAt(rawX, rawZ);
      const safeTarget = resolveHorizontalCollisions(
        rawX,
        rawZ,
        rawSurface,
        JURO_COLLISION_RADIUS,
        true,
        false
      );
      targetX = safeTarget.x;
      targetZ = safeTarget.z;
    }

    const ty = getTerrainHeightAt(targetX, targetZ);
    fsm.wanderTarget.set(targetX, ty, targetZ);
    fsm.transitionTo("wander", true);
    fsm.stateDuration = isBedTarget ? 24.0 : 9.0;
    fsm.timeInState = 0;
    setBehaviorState("wander");
  }, [walkCommand, fsm, setBehaviorState, isHeadingToBedRef]);

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

    // 1. Update Autonomous Behavior Engine
    if (isHeadingToBedRef?.current) {
      // Keep Juro locked into wander mode moving towards bed without autonomous distraction
      if (fsm.currentState !== "wander") {
        fsm.transitionTo("wander", true);
        setBehaviorState("wander");
      }
      fsm.stateDuration = 24.0;
      fsm.timeInState = 0;
    } else {
      const activeState = fsm.update(delta, attributes, mood);
      if (activeState !== storeState) {
        setBehaviorState(activeState);
      }
    }

    const currentState = fsm.currentState;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const motionScale = prefersReduced ? 0.3 : 1;

    // 2. Behavior Position, Slime Drag-Crawl & Jump-Up Calculations across the 3D Valley Map
    let crawlScaleX = 1;
    let crawlScaleY = 1;
    let crawlScaleZ = 1;

    if (isHeadingToBedRef?.current) {
      const distToBed = Math.hypot(
        spring.position.x - JURO_BED_POS.x,
        spring.position.z - JURO_BED_POS.z
      );
      if (distToBed < 0.45) {
        onBedArrival?.();
      }
    }

    const currGroundY = getTerrainHeightAt(spring.position.x, spring.position.z);
    const restY = currGroundY + BODY_BOTTOM_OFFSET;

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
              groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, targetYaw, 0.12);
            }

            // Authentic Slime Drag-Stretch Crawl (reach front forward -> drag rear body in!)
            const cycle = t * 5.6;
            const wave = Math.sin(cycle);
            let crawlSpeed: number;
            if (wave >= 0) {
              // Reach forward: elongate along local Z, slim & lower slightly
              crawlScaleZ = 1 + wave * 0.24 * motionScale;
              crawlScaleX = 1 - wave * 0.11 * motionScale;
              crawlScaleY = 1 - wave * 0.12 * motionScale;
              crawlSpeed = 0.42;
            } else {
              // Drag trailing jelly body forward in a plump surge!
              const pull = -wave;
              crawlScaleZ = 1 - pull * 0.16 * motionScale;
              crawlScaleX = 1 + pull * 0.13 * motionScale;
              crawlScaleY = 1 + pull * 0.14 * motionScale;
              crawlSpeed = 1.55;
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
              const isHeadingToBed = isHeadingToBedRef?.current ?? false;
              const safeLanding = isHeadingToBed
                ? { x: probeX, z: probeZ }
                : resolveHorizontalCollisions(
                    probeX,
                    probeZ,
                    aheadGroundY,
                    JURO_COLLISION_RADIUS,
                    true,
                    isHeadingToBed
                  );
              const landSurfaceY = getTerrainHeightAt(safeLanding.x, safeLanding.z);
              j.active = true;
              j.elapsed = 0;
              soundEffects.playHop();
              j.duration = 0.52;
              j.startX = spring.position.x;
              j.startY = spring.position.y;
              j.startZ = spring.position.z;
              j.endX = safeLanding.x;
              j.endZ = safeLanding.z;
              j.endY = landSurfaceY + BODY_BOTTOM_OFFSET;
              j.peakY = Math.max(currGroundY, landSurfaceY) + BODY_BOTTOM_OFFSET + 0.42;
            } else {
              const step = Math.min(dist, crawlSpeed * delta * motionScale);
              const rawNextX = spring.position.x + dirX * step;
              const rawNextZ = spring.position.z + dirZ * step;
              const isHeadingToBed = isHeadingToBedRef?.current ?? false;
              const resolvedStep = isHeadingToBed
                ? { x: rawNextX, z: rawNextZ, hitObstacle: false }
                : resolveHorizontalCollisions(
                    rawNextX,
                    rawNextZ,
                    currGroundY,
                    JURO_COLLISION_RADIUS,
                    false,
                    isHeadingToBed
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
                  isHeadingToBed
                );
                finalX = slid.x;
                finalZ = slid.z;
              }

              const nextGroundY = getTerrainHeightAt(finalX, finalZ);
              _targetVec.set(finalX, nextGroundY + BODY_BOTTOM_OFFSET, finalZ);
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
            // Reached destination! Settle happily on current spot
            _targetVec.set(spring.position.x, restY, spring.position.z);
            spring.setTarget(_targetVec);
            usePetStore.getState().setLastPosition({
              x: spring.position.x,
              y: restY,
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
        } else if (currentState === "happy" || currentState === "play") {
          const bounceY = restY + Math.abs(Math.sin(t * 7)) * 0.24 * motionScale;
          _targetVec.set(spring.position.x, bounceY, spring.position.z);
          spring.setTarget(_targetVec);

          if (groupRef.current) {
            groupRef.current.rotation.z = Math.sin(t * 7) * 0.07 * motionScale;
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0, 0.08);
          }
        } else if (currentState === "sleep") {
          const isAtBed =
            Math.hypot(spring.position.x - JURO_BED_POS.x, spring.position.z - JURO_BED_POS.z) < 0.75;
          const targetX = isAtBed ? JURO_BED_POS.x : spring.position.x;
          const targetZ = isAtBed ? JURO_BED_POS.z : spring.position.z;
          const targetGroundY = getTerrainHeightAt(targetX, targetZ);

          _targetVec.set(targetX, targetGroundY + BODY_BOTTOM_OFFSET * 0.96, targetZ);
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
            const targetYaw = isAtBed ? 0.35 : 0;
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, targetYaw, 0.06);
          }
        } else if (currentState === "eating") {
          const chewY = restY + Math.sin(t * 14) * 0.015 * motionScale;
          _targetVec.set(spring.position.x, chewY, spring.position.z);
          spring.setTarget(_targetVec);
          if (groupRef.current) {
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.08, 0.15);
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, 0, 0.14);
          }
        } else {
          const idleY = restY + Math.sin(t * 1.8) * 0.02 * motionScale;
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
    spring.update(delta);

    const isSleepingOrHeading =
      currentState === "sleep" || (isHeadingToBedRef?.current ?? false);

    const postStepCollision = resolveHorizontalCollisions(
      spring.position.x,
      spring.position.z,
      spring.position.y - BODY_BOTTOM_OFFSET,
      JURO_COLLISION_RADIUS,
      jumpRef.current.active,
      isSleepingOrHeading
    );
    if (postStepCollision.hitObstacle) {
      spring.resolveHorizontal(postStepCollision.x, postStepCollision.z, 0.1);
      spring.target.x = postStepCollision.x;
      spring.target.z = postStepCollision.z;

      // If wandering and persistently blocked by an obstacle, pick a new path immediately!
      if (currentState === "wander") {
        blockedTimerRef.current += delta;
        if (blockedTimerRef.current > 0.35) {
          blockedTimerRef.current = 0;
          fsm.pickNewWanderTarget(spring.position);
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

      // Scale entire character cleanly to pocket-sized JURO_BASE_SCALE
      scale.multiplyScalar(JURO_BASE_SCALE);

      // Hard terrain collision boundary: keep Juro's bottom resting cleanly on grass/hill/bridge/stump/mattress
      const isSleepingOnBed =
        currentState === "sleep" &&
        Math.hypot(spring.position.x - JURO_BED_POS.x, spring.position.z - JURO_BED_POS.z) < 0.6;
      const bedMattressLift = isSleepingOnBed ? 0.125 : 0;
      const minCenterY = liveSurfaceY + bedMattressLift + 0.01 + BODY_BOTTOM_LOCAL * scale.y;
      spring.clampFloor(minCenterY, 0.22);

      groupRef.current.position.copy(spring.position);
      groupRef.current.scale.copy(scale);

      // Read live bath state directly from ref (zero React re-renders during drag!)
      const liveBath = bathStateRef?.current;
      const isScrubbingNow = liveBath?.isScrubbing ?? false;
      const isRinsingNow = liveBath?.isRinsing ?? false;

      // Playful bath reactions & woozy dizzy body sway
      const isDizzyActive = currentState !== "sleep" && dizzyRef.current.timer > 0;
      const dizzyFade = isDizzyActive ? Math.min(1, dizzyRef.current.timer / 0.65) : 0;

      if (isScrubbingNow) {
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
      } else if (isDizzyActive) {
        // Woozy circular sway + soft jelly wobble while recovering from being flung fast
        groupRef.current.rotation.z = Math.sin(t * 5.4) * 0.24 * dizzyFade * motionScale;
        groupRef.current.rotation.x = Math.cos(t * 5.4) * 0.12 * dizzyFade * motionScale;
        groupRef.current.rotation.y = Math.sin(t * 2.7) * 0.26 * dizzyFade * motionScale;
        const wobble = Math.sin(t * 11) * 0.035 * dizzyFade * motionScale;
        groupRef.current.scale.x *= 1 + wobble;
        groupRef.current.scale.y *= 1 - wobble;
      }

      // Project Juro's live 3D position & scaled radius to viewport pixel coordinates
      if (juroScreenPosRef?.current) {
        _projCenter.copy(spring.position).project(camera);
        _projEdge
          .set(spring.position.x + 1.18 * JURO_BASE_SCALE, spring.position.y, spring.position.z)
          .project(camera);
        const cx = (_projCenter.x * 0.5 + 0.5) * size.width;
        const cy = (-_projCenter.y * 0.5 + 0.5) * size.height;
        const ex = (_projEdge.x * 0.5 + 0.5) * size.width;

        // Project Juro's crown/head top
        _projCenter
          .set(spring.position.x, spring.position.y + 1.15 * JURO_BASE_SCALE, spring.position.z)
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

    // 5. Soft Contact Shadow — sits directly on whatever ground/hill/stump/bridge Juro is above!
    if (shadowRef.current && groupRef.current) {
      const isSleepingOnBed =
        currentState === "sleep" &&
        Math.hypot(spring.position.x - JURO_BED_POS.x, spring.position.z - JURO_BED_POS.z) < 0.6;
      const bedMattressLift = isSleepingOnBed ? 0.125 : 0;
      shadowRef.current.position.set(
        spring.position.x,
        liveSurfaceY + bedMattressLift + 0.008,
        spring.position.z
      );

      const lift = Math.max(
        0,
        spring.position.y - (liveSurfaceY + bedMattressLift + BODY_BOTTOM_OFFSET)
      );
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
            soundEffects.playSquish();
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
            soundEffects.playSquish();
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

    // 6.5 Interactive Toy Playing Sequence with 3D Toy Prop
    const isPlayingToy = currentState === "play" && Boolean(currentToyBeingPlayed);
    if (isPlayingToy) {
      playTimer.current += delta;
      const playT = playTimer.current;
      const toyId = currentToyBeingPlayed?.id ?? "bounce-ball";

      if (toyPropRef.current) {
        toyPropRef.current.visible = true;

        if (toyId === "bounce-ball") {
          // Bouncy striped rubber ball
          const bounceCycle = (playT * 3.6) % 1;
          const bounceArc = Math.sin(bounceCycle * Math.PI);
          const bounceY = -0.1 + bounceArc * 0.72;
          toyPropRef.current.position.set(0.42, bounceY, 0.95);
          toyPropRef.current.rotation.x = playT * 8;
          toyPropRef.current.rotation.z = playT * 6;

          const hopBucket = Math.floor(playT * 3.6);
          if (bounceArc < 0.12 && lastPlayHopSoundRef.current !== hopBucket) {
            lastPlayHopSoundRef.current = hopBucket;
            soundEffects.playHop();
          }

          if (groupRef.current) {
            const juroHop = Math.sin(bounceCycle * Math.PI * 2) * 0.08;
            groupRef.current.position.y = -0.1 + Math.max(0, juroHop);
          }
        } else if (toyId === "bubble-blower") {
          toyPropRef.current.position.set(0.55, 0.05 + Math.sin(playT * 3) * 0.04, 0.85);
          toyPropRef.current.rotation.z = -0.3 + Math.sin(playT * 2.5) * 0.1;

          if (groupRef.current) {
            groupRef.current.position.y = -0.1 + Math.abs(Math.sin(playT * 6)) * 0.07;
          }
        } else if (toyId === "music-box") {
          toyPropRef.current.position.set(0.58, -0.15, 0.78);
          toyPropRef.current.rotation.y = -0.4;

          if (groupRef.current) {
            groupRef.current.rotation.z = Math.sin(playT * 9) * 0.16;
            groupRef.current.scale.x = 1 + Math.sin(playT * 18) * 0.08;
            groupRef.current.scale.y = 1 - Math.sin(playT * 18) * 0.08;
          }
        }
      }

      if (playT >= 4.2) {
        soundEffects.playHappy();
        clearToyBeingPlayed();
        fsm.transitionTo("happy", true);
        setBehaviorState("happy");
        playTimer.current = 0;
        lastPlayHopSoundRef.current = -1;
      }
    } else {
      playTimer.current = 0;
      lastPlayHopSoundRef.current = -1;
      if (toyPropRef.current) toyPropRef.current.visible = false;
    }

    // 7. Dynamic Need-State Facial Expressions
    const isDirty = attributes.cleanliness < 35;
    let expression: "hungry" | "tired" | "angry" | "bored" | "normal" = "normal";
    if (attributes.hunger < 35) {
      expression = "hungry";
    } else if (attributes.energy < 35) {
      expression = "tired";
    } else if (attributes.affection < 35) {
      expression = "angry";
    } else if (attributes.happiness < 35) {
      expression = "bored";
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
    const dizzyFade = isDizzy ? Math.min(1, dizzyRef.current.timer / 0.65) : 0;
    const isChewing = isEating && eatingTimer.current > 0.7 && eatingTimer.current < 2.6;
    const isBathSquint = isScrubbingNow || isRinsingNow;
    const isHappyFace = isPlayingToy || currentState === "happy" || isPettingActive;

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

        if (isEating) {
          lookX = 0;
          lookY = -0.05;
        } else if (currentState === "curious") {
          lookX = fsm.lookTarget.x * 0.08;
          lookY = fsm.lookTarget.y * 0.06;
        }

        leftEyeRef.current.position.x = -0.35 + lookX;
        leftEyeRef.current.position.y = 0.07 + lookY;
        rightEyeRef.current.position.x = 0.35 + lookX;
        rightEyeRef.current.position.y = 0.07 + lookY;

        if (expression === "hungry") {
          // Puppy dog pleading watery eyes with sparkling shimmer
          leftEyeRef.current.scale.set(1.18, 1.35 * blinkScaleY, 0.52);
          rightEyeRef.current.scale.set(1.18, 1.35 * blinkScaleY, 0.52);
          leftEyeRef.current.rotation.z = -0.05;
          rightEyeRef.current.rotation.z = 0.05;
          if (leftCatchlightRef.current && rightCatchlightRef.current) {
            const catchPulse = 1.35 + Math.sin(t * 8) * 0.2;
            leftCatchlightRef.current.scale.setScalar(catchPulse);
            rightCatchlightRef.current.scale.setScalar(catchPulse);
          }
        } else if (expression === "tired") {
          // Heavy weary droopy eyelids (u u)
          leftEyeRef.current.scale.set(1.02, 0.42 * blinkScaleY, 0.52);
          rightEyeRef.current.scale.set(1.02, 0.42 * blinkScaleY, 0.52);
          leftEyeRef.current.rotation.z = -0.16;
          rightEyeRef.current.rotation.z = 0.16;
          if (leftCatchlightRef.current && rightCatchlightRef.current) {
            leftCatchlightRef.current.scale.setScalar(0.68);
            rightCatchlightRef.current.scale.setScalar(0.68);
          }
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

    if (leftCatchlightRef.current && rightCatchlightRef.current) {
      leftCatchlightRef.current.visible =
        !isSleeping && !isDizzy && !isChewing && !isBathSquint && !isHappyFace && expression !== "bored";
      rightCatchlightRef.current.visible =
        !isSleeping && !isDizzy && !isChewing && !isBathSquint && !isHappyFace && expression !== "bored";
    }

    // Peaceful Sleeping Closed Eyelids or Sweet Petting/Play Eyes (︶ ︶)
    if (sleepEyesRef.current) {
      sleepEyesRef.current.visible = isSleeping || isHappyFace;
      if (isSleeping || isHappyFace) {
        sleepEyesRef.current.position.y = 0.01 - sleepBreath * 0.012;
      }
    }

    // 8. Mouth: Dynamic Expression vs Eating vs Sleeping
    if (mouthGroupRef.current) {
      mouthGroupRef.current.visible = !isSleeping && !isDizzy;
      if (!isSleeping && !isDizzy) {
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
        } else if (isHappyFace) {
          mouthGroupRef.current.scale.set(1.18 + Math.sin(t * 8) * 0.08, 1.16, 1);
          mouthGroupRef.current.position.set(0, -0.01, 1.035);
        } else if (expression === "hungry") {
          // Open longing mouth
          mouthGroupRef.current.scale.set(1.15, 1.3, 1);
          mouthGroupRef.current.position.set(0, -0.03, 1.035);
        } else if (expression === "tired") {
          // Small panting oval
          const pant = 0.55 + Math.sin(t * 7.5) * 0.2;
          mouthGroupRef.current.scale.set(0.65, pant, 1);
          mouthGroupRef.current.position.set(0, -0.04, 1.035);
        } else if (expression === "angry") {
          // Grumpy inverted pout
          mouthGroupRef.current.scale.set(0.85, -0.65, 1);
          mouthGroupRef.current.position.set(0, -0.035, 1.035);
        } else if (expression === "bored") {
          // Flat horizontal line
          mouthGroupRef.current.scale.set(0.95, 0.16, 1);
          mouthGroupRef.current.position.set(0, -0.06, 1.035);
        } else {
          mouthGroupRef.current.scale.set(1, 1, 1);
          mouthGroupRef.current.position.set(0, -0.01, 1.035);
        }
      }
    }

    // Dynamic Cheeks, Accessories & Dirty Overlays
    const isAngry = !isSleeping && expression === "angry";
    const cheekColor = isAngry
      ? "#DC2626"
      : isPettingActive
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

    // Anime Sweat Drop (Tired)
    if (sweatDropRef.current) {
      const showSweat = !isSleeping && !isPlayingToy && expression === "tired";
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
        mat.roughness = isDirty ? 0.36 : 0.14;
        mat.clearcoat = isDirty ? 0.35 : 1.0;
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
            .set(spring.position.x, spring.position.y + 1.15 * JURO_BASE_SCALE, spring.position.z)
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
          <mesh position={[-0.025, -0.042, 0.052]}>
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
          <mesh position={[-0.025, -0.042, 0.052]}>
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

        {/* Interactive 3D Toy Prop and Play Accessories */}
        {isPlayingToy && currentToyBeingPlayed && (
          <group ref={toyPropRef}>
            <ToyProp3D
              toyId={currentToyBeingPlayed.id}
              bounceHeight={playTimer.current}
            />
            {currentToyBeingPlayed.id === "music-box" && (
              <>
                <MusicalNote3D progress={playTimer.current * 0.8} offset={0} />
                <MusicalNote3D progress={playTimer.current * 0.8} offset={0.33} />
                <MusicalNote3D progress={playTimer.current * 0.8} offset={0.66} />
              </>
            )}
            {currentToyBeingPlayed.id === "bubble-blower" && (
              <>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
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
    </>
  );
});
