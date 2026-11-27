import type React from "react";
import * as THREE from "three";
import type { BehaviorStateMachine } from "../../engine/behavior/BehaviorStateMachine";
import type { SpringOscillator3D } from "../../engine/physics/SpringOscillator";
import type { PetAttributes, PetBehaviorState, ToyItem } from "../../types/pet";
import { soundEffects } from "../../engine/audio/soundEffects";
import {
  BASE_GROUND_Y,
  getTerrainHeightAt,
  isWaterAt,
  resolveHorizontalCollisions,
} from "../../engine/world/mapTerrain";
import {
  BODY_BOTTOM_LOCAL,
  JURO_COLLISION_RADIUS,
  dampAngleExp,
  dampExp,
  type BathLiveState,
  type FetchBallState,
  type JumpState,
  type JuroScreenTarget,
} from "./juroTypes";
import type { InterpolatedPose } from "../multiplayer/PartnerInterpolationBuffer";
import { checkLandmarkArrivals, resolveLandmarkSurfaceY } from "./navigation/walkPlanner";
import { stepStationaryAndPlayState, stepWanderLocomotion } from "./navigation/hopMovement";

export { enqueueWalkPath } from "./navigation/walkPlanner";

const _projCenter = new THREE.Vector3();
const _projEdge = new THREE.Vector3();

interface MovementStepParams {
  t: number;
  delta: number;
  isPartner?: boolean;
  partnerPose?: InterpolatedPose | null;
  currentState: PetBehaviorState;
  storeState: PetBehaviorState;
  isSleepy: boolean;
  isSleepingNow: boolean;
  isEatingNow: boolean;
  isPlayingToyNow: boolean;
  motionScale: number;
  currentPetScale: number;
  currentBottomOffset: number;
  liveAttributes: PetAttributes;
  liveBath: BathLiveState | undefined;
  fsm: BehaviorStateMachine;
  spring: SpringOscillator3D;
  groupRef: React.RefObject<THREE.Group | null>;
  shadowRef: React.RefObject<THREE.Mesh | null>;
  jumpRef: React.RefObject<JumpState>;
  waypointQueueRef: React.RefObject<Array<{ x: number; z: number }>>;
  lastFsmWanderRef: React.RefObject<THREE.Vector3>;
  blockedTimerRef: React.RefObject<number>;
  bedHeadingTimerRef: React.RefObject<number>;
  wakeCooldownRef: React.RefObject<number>;
  snoreTimerRef: React.RefObject<number>;
  scrubSoundTimerRef: React.RefObject<number>;
  tummyRumbleTimer: React.RefObject<{ nextRumble: number; timer: number }>;
  sleepyYawnTimer: React.RefObject<{ nextYawn: number; timer: number }>;
  dizzyRef: React.RefObject<{ buildup: number; timer: number; lastSoundAt: number; dragAge: number }>;
  fetchBallRef: React.RefObject<FetchBallState>;
  currentToyBeingPlayed: ToyItem | null;
  myBedSlot: { x: number; z: number };
  isHeadingToBedRef?: React.RefObject<boolean>;
  onBedArrival?: () => void;
  isHeadingToBenchRef?: React.RefObject<boolean>;
  onBenchArrival?: () => void;
  isSittingOnBench: boolean;
  isHeadingToTrampolineRef?: React.RefObject<boolean>;
  onTrampolineArrival?: () => void;
  isBouncingOnTrampoline: boolean;
  isBlowingBubbles: boolean;
  isDraggingFood: boolean;
  camera: THREE.Camera;
  size: { width: number; height: number };
  juroScreenPosRef?: React.RefObject<JuroScreenTarget>;
  juroWorldPosRef?: React.RefObject<THREE.Vector3>;
  juroYawRef?: React.RefObject<number>;
}

/**
 * Advances Juro's locomotion, landmark arrivals, spring physics, collision resolution,
 * scale/squash-and-stretch, screen projection, and contact shadow in one frame.
 */
export function stepJuroMovementAndPhysics(params: MovementStepParams): void {
  const {
    t,
    delta,
    isPartner = false,
    partnerPose = null,
    currentState,
    storeState,
    isSleepy,
    isSleepingNow,
    isEatingNow,
    isPlayingToyNow,
    motionScale,
    currentPetScale,
    currentBottomOffset,
    liveAttributes,
    liveBath,
    fsm,
    spring,
    groupRef,
    shadowRef,
    jumpRef,
    waypointQueueRef,
    lastFsmWanderRef,
    blockedTimerRef,
    bedHeadingTimerRef,
    wakeCooldownRef,
    snoreTimerRef,
    scrubSoundTimerRef,
    tummyRumbleTimer,
    sleepyYawnTimer,
    dizzyRef,
    fetchBallRef,
    currentToyBeingPlayed,
    myBedSlot,
    isHeadingToBedRef,
    onBedArrival,
    isHeadingToBenchRef,
    onBenchArrival,
    isSittingOnBench,
    isHeadingToTrampolineRef,
    onTrampolineArrival,
    isBouncingOnTrampoline,
    isBlowingBubbles,
    isDraggingFood,
    camera,
    size,
    juroScreenPosRef,
    juroWorldPosRef,
    juroYawRef,
  } = params;

  if (!isPartner) {
    checkLandmarkArrivals({
      delta,
      currentState,
      isEatingNow,
      isScrubbing: Boolean(liveBath?.isScrubbing),
      currentBottomOffset,
      spring,
      jumpRef,
      bedHeadingTimerRef,
      wakeCooldownRef,
      myBedSlot,
      isHeadingToBedRef,
      onBedArrival,
      isHeadingToBenchRef,
      onBenchArrival,
      isSittingOnBench,
      isHeadingToTrampolineRef,
      onTrampolineArrival,
      isBouncingOnTrampoline,
    });
  }

  const currGroundY = getTerrainHeightAt(spring.position.x, spring.position.z);
  const restY = currGroundY + currentBottomOffset;

  let crawlScale = { x: 1, y: 1, z: 1 };
  if (isPartner && partnerPose && currentState !== "sleep") {
    jumpRef.current.active = false;
    const targetGroundY = getTerrainHeightAt(partnerPose.x, partnerPose.z);
    const targetBaseY = targetGroundY + currentBottomOffset;
    const isMoving =
      currentState === "wander" ||
      Math.hypot(partnerPose.x - spring.position.x, partnerPose.z - spring.position.z) > 0.06;

    if (isMoving) {
      const hopWave = Math.sin(t * 14.5);
      const hopArc = Math.max(0, hopWave) * (0.78 * currentPetScale);
      const boing = Math.max(-0.18, hopWave * 0.24) * motionScale;
      crawlScale = {
        x: 1.0 - boing * 0.5,
        y: 1.0 + boing,
        z: 1.0 - boing * 0.5,
      };
      spring.target.set(partnerPose.x, targetBaseY + hopArc, partnerPose.z);
    } else if (currentState === "happy") {
      const bounceY = targetBaseY + Math.abs(Math.sin(t * 7)) * 0.24 * motionScale;
      spring.target.set(partnerPose.x, bounceY, partnerPose.z);
    } else {
      const idleBob = Math.sin(t * 1.8) * 0.02 * motionScale;
      spring.target.set(partnerPose.x, targetBaseY + idleBob, partnerPose.z);
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = dampAngleExp(
        groupRef.current.rotation.y,
        partnerPose.yaw,
        18.0,
        delta
      );
      groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, 0, 8.0, delta);
      groupRef.current.rotation.z = dampExp(groupRef.current.rotation.z, 0, 8.0, delta);
    }
  } else if (currentState === "wander") {
    crawlScale = stepWanderLocomotion({
      t,
      delta,
      isPartner,
      currGroundY,
      restY,
      storeState,
      isSleepy,
      motionScale,
      currentPetScale,
      currentBottomOffset,
      fsm,
      spring,
      groupRef,
      jumpRef,
      waypointQueueRef,
      lastFsmWanderRef,
      myBedSlot,
      isHeadingToBedRef,
      isHeadingToBenchRef,
      isSittingOnBench,
      isHeadingToTrampolineRef,
      isBouncingOnTrampoline,
    });
  } else {
    jumpRef.current.active = false;
    crawlScale = stepStationaryAndPlayState({
      t,
      delta,
      currGroundY,
      restY,
      currentState,
      isSleepy,
      motionScale,
      currentBottomOffset,
      fsm,
      spring,
      groupRef,
      fetchBallRef,
      currentToyBeingPlayed,
      myBedSlot,
      isSittingOnBench,
      isBouncingOnTrampoline,
      isBlowingBubbles,
    });
  }

  // Physics simulation step + solid obstacle collision enforcement
  spring.config.damping = isSleepy ? 24 : 12.5;
  spring.config.stiffness = isSleepy ? 95 : 190;
  spring.update(delta);

  const isSleepingOrHeading =
    currentState === "sleep" || storeState === "sleep" || (isHeadingToBedRef?.current ?? false);
  const isSittingOrHeadingToBench = isSittingOnBench || (isHeadingToBenchRef?.current ?? false);
  const isBouncingOrHeadingToTrampoline =
    isBouncingOnTrampoline || (isHeadingToTrampolineRef?.current ?? false);

  if (!isPartner || !partnerPose) {
    const postStepCollision = resolveHorizontalCollisions(
      spring.position.x,
      spring.position.z,
      spring.position.y - currentBottomOffset,
      JURO_COLLISION_RADIUS * currentPetScale,
      jumpRef.current.active,
      isSleepingOrHeading,
      isSittingOrHeadingToBench,
      isBouncingOrHeadingToTrampoline
    );
    if (postStepCollision.hitObstacle) {
      spring.resolveHorizontal(postStepCollision.x, postStepCollision.z, 0.1);
      spring.target.x = postStepCollision.x;
      spring.target.z = postStepCollision.z;

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
  } else {
    blockedTimerRef.current = 0;
  }

  const sleepBreath = Math.sin(t * 1.5);
  const liveSurfaceY = getTerrainHeightAt(spring.position.x, spring.position.z);

  if (groupRef.current) {
    const scale = spring.computeSquashAndStretch();
    if (isSleepy && currentState !== "sleep") {
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
      if (isWaterAt(spring.position.x, spring.position.z)) {
        crawlScale.y *= 0.92;
        crawlScale.x *= 1.04;
        crawlScale.z *= 1.04;
      }
      scale.x *= crawlScale.x;
      scale.y *= crawlScale.y;
      scale.z *= crawlScale.z;
    } else {
      const breathRate = isSleepy ? 1.4 : 2.4;
      const primaryBreath = Math.sin(t * breathRate) * (isSleepy ? 0.012 : 0.018);
      const secondaryRipple = Math.sin(t * breathRate * 2.1) * 0.003;
      const totalBreath = (primaryBreath + secondaryRipple) * motionScale;
      scale.x += totalBreath;
      scale.z += totalBreath;
      scale.y -= totalBreath * 1.1;
    }

    if (!isSleepingNow && !isEatingNow && !isPlayingToyNow && liveAttributes.hunger < 45) {
      tummyRumbleTimer.current.timer += delta;
      if (tummyRumbleTimer.current.timer > tummyRumbleTimer.current.nextRumble) {
        const rumbleElapsed = tummyRumbleTimer.current.timer - tummyRumbleTimer.current.nextRumble;
        if (rumbleElapsed < 0.55) {
          const rumbleWave = Math.sin(rumbleElapsed * 36) * (1 - rumbleElapsed / 0.55);
          scale.x *= 1 + rumbleWave * 0.12;
          scale.y *= 1 - rumbleWave * 0.08;
          scale.z *= 1 + rumbleWave * 0.12;
          if (rumbleElapsed < delta * 1.5) soundEffects.playSquish();
        } else {
          tummyRumbleTimer.current.timer = 0;
          tummyRumbleTimer.current.nextRumble = 10 + Math.random() * 5;
        }
      }
    }

    if (isSleepy && !isSleepingNow && !isEatingNow && !isPlayingToyNow && currentState === "idle") {
      sleepyYawnTimer.current.timer += delta;
      if (sleepyYawnTimer.current.timer > sleepyYawnTimer.current.nextYawn) {
        const yawnElapsed = sleepyYawnTimer.current.timer - sleepyYawnTimer.current.nextYawn;
        if (yawnElapsed < 1.6) {
          const yawnPhase = Math.sin((yawnElapsed / 1.6) * Math.PI);
          scale.y *= 1 + yawnPhase * 0.22;
          scale.x *= 1 - yawnPhase * 0.10;
          scale.z *= 1 - yawnPhase * 0.10;
          if (yawnElapsed < delta * 1.5) soundEffects.playTired();
        } else {
          sleepyYawnTimer.current.timer = 0;
          sleepyYawnTimer.current.nextYawn = 13 + Math.random() * 7;
        }
      }
    }

    if (liveAttributes.hunger < 45 && (currentState === "wander" || currentState === "curious") && !isSleepingNow) {
      groupRef.current.rotation.x = Math.sin(t * 4) * 0.04 + 0.08;
    }

    if (isDraggingFood && !isSleepingNow) {
      groupRef.current.rotation.x = -0.09;
      scale.y *= 1.05;
      scale.x *= 0.96;
    }

    scale.multiplyScalar(currentPetScale);

    const surfaceBaseY = resolveLandmarkSurfaceY(
      spring.position.x,
      spring.position.z,
      liveSurfaceY,
      currentState,
      isSittingOnBench,
      isBouncingOnTrampoline
    );
    const minCenterY = surfaceBaseY + BODY_BOTTOM_LOCAL * scale.y;
    spring.clampFloor(minCenterY, 0.22);

    groupRef.current.position.copy(spring.position);
    groupRef.current.scale.copy(scale);

    const isScrubbingNow = liveBath?.isScrubbing ?? false;
    const isRinsingNow = liveBath?.isRinsing ?? false;

    if (currentState === "sleep") {
      snoreTimerRef.current += delta;
      if (snoreTimerRef.current >= 4.2) {
        snoreTimerRef.current = 0;
        soundEffects.playSnore();
      }
    } else {
      snoreTimerRef.current = 0;
    }

    if (isScrubbingNow) {
      scrubSoundTimerRef.current += delta;
      if (scrubSoundTimerRef.current >= 0.22) {
        scrubSoundTimerRef.current = 0;
        soundEffects.playScrub();
      }
    } else {
      scrubSoundTimerRef.current = 0;
    }

    const isDizzyActive = currentState !== "sleep" && dizzyRef.current.timer > 0;
    const dizzyFade = isDizzyActive ? Math.min(1, dizzyRef.current.timer / 0.65) : 0;

    if (isDizzyActive) {
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
    }

    if (juroScreenPosRef?.current) {
      _projCenter.copy(spring.position).project(camera);
      _projEdge
        .set(spring.position.x + 1.18 * currentPetScale, spring.position.y, spring.position.z)
        .project(camera);
      const cx = (_projCenter.x * 0.5 + 0.5) * size.width;
      const cy = (-_projCenter.y * 0.5 + 0.5) * size.height;
      const ex = (_projEdge.x * 0.5 + 0.5) * size.width;

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
    if (juroYawRef && groupRef.current) {
      (juroYawRef as { current: number }).current = groupRef.current.rotation.y;
    }
  }

  if (shadowRef.current && groupRef.current) {
    const contactSurfaceY = resolveLandmarkSurfaceY(
      spring.position.x,
      spring.position.z,
      liveSurfaceY,
      currentState,
      isSittingOnBench,
      isBouncingOnTrampoline,
      0,
      0.003
    );
    shadowRef.current.position.set(spring.position.x, contactSurfaceY + 0.005, spring.position.z);

    const juroBottomY = spring.position.y - BODY_BOTTOM_LOCAL * groupRef.current.scale.y;
    const lift = Math.max(0, juroBottomY - contactSurfaceY);
    const heightShrink = 1 / (1 + lift * 0.55);

    shadowRef.current.scale.set(
      2.55 * groupRef.current.scale.x * heightShrink,
      2.25 * groupRef.current.scale.z * heightShrink,
      1
    );
    shadowRef.current.rotation.z = -groupRef.current.rotation.y;

    const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = THREE.MathUtils.clamp(0.82 / (1 + lift * 0.9), 0.16, 0.82);
  }
}

export { BASE_GROUND_Y };
