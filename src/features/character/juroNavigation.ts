import type React from "react";
import * as THREE from "three";
import type { BehaviorStateMachine } from "../../engine/behavior/BehaviorStateMachine";
import type { SpringOscillator3D } from "../../engine/physics/SpringOscillator";
import type { PetAttributes, PetBehaviorState, ToyItem } from "../../types/pet";
import { soundEffects } from "../../engine/audio/soundEffects";
import { usePetStore } from "../../stores/petStore";
import {
  BASE_GROUND_Y,
  JURO_BED_POS,
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  clampToCircularWorld,
  getTerrainHeightAt,
  resolveHorizontalCollisions,
  isWaterAt,
} from "../../engine/world/mapTerrain";
import { findPath, getGlobalNavGrid } from "../../engine/world/pathfinding";
import {
  BODY_BOTTOM_LOCAL,
  JURO_COLLISION_RADIUS,
  dampExp,
  dampAngleExp,
  type BathLiveState,
  type FetchBallState,
  type JumpState,
  type JuroScreenTarget,
  type WalkCommand,
} from "./juroTypes";

const _projCenter = new THREE.Vector3();
const _projEdge = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _bedTargetVec = new THREE.Vector3();
const _benchTargetVec = new THREE.Vector3();
const _trampolineTargetVec = new THREE.Vector3();
const _wanderTargetVec = new THREE.Vector3();
const _impulseDown = new THREE.Vector3(0, -0.35, 0);
const _impulseJump = new THREE.Vector3(0, 2.8, 0);

interface EnqueueWalkPathParams {
  walkCommand: WalkCommand;
  spring: SpringOscillator3D;
  fsm: BehaviorStateMachine;
  waypointQueueRef: React.RefObject<Array<{ x: number; z: number }>>;
  lastFsmWanderRef: React.RefObject<THREE.Vector3>;
  myBedSlot: { x: number; z: number };
  isHeadingToBedRef?: React.RefObject<boolean>;
  isHeadingToBenchRef?: React.RefObject<boolean>;
  isHeadingToTrampolineRef?: React.RefObject<boolean>;
  setBehaviorState: (state: PetBehaviorState) => void;
}

/**
 * Computes an A* navigation path for a walk command and transitions the FSM into wander.
 */
export function enqueueWalkPath({
  walkCommand,
  spring,
  fsm,
  waypointQueueRef,
  lastFsmWanderRef,
  myBedSlot,
  isHeadingToBedRef,
  isHeadingToBenchRef,
  isHeadingToTrampolineRef,
  setBehaviorState,
}: EnqueueWalkPathParams): void {
  const { x: rawX, z: rawZ } = clampToCircularWorld(walkCommand.x, walkCommand.z);
  const isBedTarget =
    Boolean(isHeadingToBedRef?.current) ||
    Math.hypot(rawX - myBedSlot.x, rawZ - myBedSlot.z) < 0.75 ||
    Math.hypot(rawX - JURO_BED_POS.x, rawZ - JURO_BED_POS.z) < 0.75;
  const isBenchTarget =
    Boolean(isHeadingToBenchRef?.current) ||
    Math.hypot(rawX - JURO_BENCH_POS.x, rawZ - JURO_BENCH_POS.z) < 0.35;
  const isTrampolineTarget =
    Boolean(isHeadingToTrampolineRef?.current) ||
    Math.hypot(rawX - JURO_TRAMPOLINE_POS.x, rawZ - JURO_TRAMPOLINE_POS.z) < 0.45;

  if (usePetStore.getState().currentState === "sleep") {
    return;
  }

  let targetX = rawX;
  let targetZ = rawZ;

  if (isBedTarget) {
    targetX = myBedSlot.x;
    targetZ = myBedSlot.z;
  } else if (isBenchTarget) {
    targetX = JURO_BENCH_POS.x;
    targetZ = JURO_BENCH_POS.z;
  } else if (isTrampolineTarget) {
    targetX = JURO_TRAMPOLINE_POS.x;
    targetZ = JURO_TRAMPOLINE_POS.z;
  } else {
    const rawSurface = getTerrainHeightAt(rawX, rawZ);
    const safeTarget = resolveHorizontalCollisions(
      rawX,
      rawZ,
      rawSurface,
      JURO_COLLISION_RADIUS,
      true,
      false,
      false,
      false
    );
    targetX = safeTarget.x;
    targetZ = safeTarget.z;
  }

  const ty = isBenchTarget
    ? JURO_BENCH_POS.seatY
    : isTrampolineTarget
    ? JURO_TRAMPOLINE_POS.surfaceY
    : getTerrainHeightAt(targetX, targetZ);
  fsm.wanderTarget.set(targetX, ty, targetZ);
  lastFsmWanderRef.current.copy(fsm.wanderTarget);

  const navPath = findPath(
    getGlobalNavGrid(),
    { x: spring.position.x, z: spring.position.z },
    { x: targetX, z: targetZ }
  );
  waypointQueueRef.current = navPath.length > 0 ? navPath : [{ x: targetX, z: targetZ }];

  fsm.transitionTo("wander", true);
  fsm.stateDuration = isBedTarget || isBenchTarget || isTrampolineTarget ? 24.0 : 18.0;
  fsm.timeInState = 0;
  setBehaviorState("wander");
}

interface MovementStepParams {
  t: number;
  delta: number;
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

  let crawlScaleX = 1;
  let crawlScaleY = 1;
  let crawlScaleZ = 1;

  // Check landmark arrivals (Bed, Bench, Trampoline)
  if (isHeadingToBedRef?.current && currentState !== "sleep") {
    bedHeadingTimerRef.current += delta;
    const distToSlot = Math.hypot(spring.position.x - myBedSlot.x, spring.position.z - myBedSlot.z);
    const distToCenter = Math.hypot(
      spring.position.x - JURO_BED_POS.x,
      spring.position.z - JURO_BED_POS.z
    );
    if (
      distToSlot < 0.55 ||
      distToCenter < 0.65 ||
      (bedHeadingTimerRef.current > 2.5 && (distToSlot < 1.35 || distToCenter < 1.35))
    ) {
      bedHeadingTimerRef.current = 0;
      jumpRef.current.active = false;
      spring.position.x = myBedSlot.x;
      spring.position.z = myBedSlot.z;
      spring.target.x = myBedSlot.x;
      spring.target.z = myBedSlot.z;
      spring.velocity.set(0, 0, 0);
      onBedArrival?.();
    }
  } else {
    bedHeadingTimerRef.current = 0;
    if (
      currentState !== "sleep" &&
      currentState !== "dragging" &&
      !isEatingNow &&
      !liveBath?.isScrubbing &&
      Date.now() > wakeCooldownRef.current
    ) {
      const distToCenter = Math.hypot(
        spring.position.x - JURO_BED_POS.x,
        spring.position.z - JURO_BED_POS.z
      );
      if (distToCenter < 0.65) {
        jumpRef.current.active = false;
        spring.position.x = myBedSlot.x;
        spring.position.z = myBedSlot.z;
        spring.target.x = myBedSlot.x;
        spring.target.z = myBedSlot.z;
        spring.velocity.set(0, 0, 0);
        onBedArrival?.();
      }
    }
  }

  if (isHeadingToBenchRef?.current && !isSittingOnBench) {
    const distToBench = Math.hypot(
      spring.position.x - JURO_BENCH_POS.x,
      spring.position.z - JURO_BENCH_POS.z
    );
    if (distToBench < 0.26) {
      jumpRef.current.active = false;
      spring.position.x = JURO_BENCH_POS.x;
      spring.position.z = JURO_BENCH_POS.z;
      spring.position.y = JURO_BENCH_POS.seatY + currentBottomOffset;
      spring.target.set(
        JURO_BENCH_POS.x,
        JURO_BENCH_POS.seatY + currentBottomOffset,
        JURO_BENCH_POS.z
      );
      spring.velocity.set(0, 0, 0);
      onBenchArrival?.();
    }
  }

  if (isHeadingToTrampolineRef?.current && !isBouncingOnTrampoline) {
    const distToTrampoline = Math.hypot(
      spring.position.x - JURO_TRAMPOLINE_POS.x,
      spring.position.z - JURO_TRAMPOLINE_POS.z
    );
    if (distToTrampoline < 0.26) {
      jumpRef.current.active = false;
      spring.position.x = JURO_TRAMPOLINE_POS.x;
      spring.position.z = JURO_TRAMPOLINE_POS.z;
      spring.position.y = JURO_TRAMPOLINE_POS.surfaceY + currentBottomOffset;
      spring.target.set(
        JURO_TRAMPOLINE_POS.x,
        JURO_TRAMPOLINE_POS.surfaceY + currentBottomOffset,
        JURO_TRAMPOLINE_POS.z
      );
      spring.velocity.set(0, 0, 0);
      onTrampolineArrival?.();
    }
  }

  const currGroundY = getTerrainHeightAt(spring.position.x, spring.position.z);
  const restY = currGroundY + currentBottomOffset;

  if (currentState === "wander") {
    const j = jumpRef.current;

    if (j.active) {
      j.elapsed += delta;
      const p = Math.min(1, j.elapsed / j.duration);
      const jx = THREE.MathUtils.lerp(j.startX, j.endX, p);
      const jz = THREE.MathUtils.lerp(j.startZ, j.endZ, p);
      const baseArcY = THREE.MathUtils.lerp(j.startY, j.endY, p);
      const arcLift = Math.sin(p * Math.PI) * Math.max(0.25, j.peakY - Math.max(j.startY, j.endY));
      _targetVec.set(jx, baseArcY + arcLift, jz);
      spring.setTarget(_targetVec);

      const jumpDx = j.endX - j.startX;
      const jumpDz = j.endZ - j.startZ;
      if (Math.hypot(jumpDx, jumpDz) > 0.05 && groupRef.current) {
        const jumpYaw = Math.atan2(jumpDx, jumpDz);
        groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, jumpYaw, 22.0, delta);
      }

      const prep = p < 0.18 ? Math.sin((p / 0.18) * Math.PI) * -0.22 : 0;
      const flight = p >= 0.12 && p <= 0.84 ? Math.sin(((p - 0.12) / 0.72) * Math.PI) * 0.22 : 0;
      const land = p > 0.78 ? Math.sin(((p - 0.78) / 0.22) * Math.PI) * -0.18 : 0;

      const jumpDeltaY = (prep + flight + land) * motionScale;
      crawlScaleY = 1.0 + jumpDeltaY;
      crawlScaleX = 1.0 - jumpDeltaY * 0.55;
      crawlScaleZ = 1.0 - jumpDeltaY * 0.55;

      if (isSleepy) {
        crawlScaleY = THREE.MathUtils.lerp(1.0, crawlScaleY, 0.35);
        crawlScaleX = THREE.MathUtils.lerp(1.0, crawlScaleX, 0.35);
        crawlScaleZ = THREE.MathUtils.lerp(1.0, crawlScaleZ, 0.35);
      }

      if (p >= 1) {
        j.active = false;
        soundEffects.playPlop();
        spring.applyImpulse(_impulseDown);
      }
    } else {
      if (
        waypointQueueRef.current.length === 0 &&
        fsm.wanderTarget.distanceToSquared(lastFsmWanderRef.current) > 0.45
      ) {
        lastFsmWanderRef.current.copy(fsm.wanderTarget);
        const autoPath = findPath(
          getGlobalNavGrid(),
          { x: spring.position.x, z: spring.position.z },
          { x: fsm.wanderTarget.x, z: fsm.wanderTarget.z }
        );
        if (autoPath.length > 0) {
          waypointQueueRef.current = autoPath;
        }
      }

      let currentTarget: THREE.Vector3;
      if (waypointQueueRef.current.length > 0) {
        const nextWp = waypointQueueRef.current[0];
        const distToWp = Math.hypot(nextWp.x - spring.position.x, nextWp.z - spring.position.z);
        if (distToWp < 0.52 && waypointQueueRef.current.length > 1) {
          waypointQueueRef.current.shift();
        }
        const activeWp = waypointQueueRef.current[0];
        const isLast = waypointQueueRef.current.length === 1;
        const wpY =
          isLast && isHeadingToBenchRef?.current
            ? JURO_BENCH_POS.seatY
            : isLast && isHeadingToTrampolineRef?.current
            ? JURO_TRAMPOLINE_POS.surfaceY
            : getTerrainHeightAt(activeWp.x, activeWp.z);
        currentTarget = _wanderTargetVec.set(activeWp.x, wpY, activeWp.z);
      } else {
        currentTarget = isHeadingToBedRef?.current
          ? _bedTargetVec.set(myBedSlot.x, getTerrainHeightAt(myBedSlot.x, myBedSlot.z), myBedSlot.z)
          : isHeadingToBenchRef?.current
          ? _benchTargetVec.set(JURO_BENCH_POS.x, JURO_BENCH_POS.seatY, JURO_BENCH_POS.z)
          : isHeadingToTrampolineRef?.current
          ? _trampolineTargetVec.set(
              JURO_TRAMPOLINE_POS.x,
              JURO_TRAMPOLINE_POS.surfaceY,
              JURO_TRAMPOLINE_POS.z
            )
          : fsm.wanderTarget;
      }

      const dx = currentTarget.x - spring.position.x;
      const dz = currentTarget.z - spring.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.16) {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        const targetYaw = Math.atan2(dirX, dirZ);

        const currentYaw = groupRef.current ? groupRef.current.rotation.y : targetYaw;
        let turnDiff = (targetYaw - currentYaw) % (Math.PI * 2);
        turnDiff = ((turnDiff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

        if (groupRef.current) {
          const turnSpeed = Math.abs(turnDiff) > Math.PI * 0.35 ? 20.0 : isSleepy ? 6.5 : 12.0;
          groupRef.current.rotation.y = dampAngleExp(
            groupRef.current.rotation.y,
            targetYaw,
            turnSpeed,
            delta
          );
        }

        const alignFactor = Math.max(0, Math.cos(turnDiff));
        const hopCycleSpeed = isSleepy ? 6.4 : 13.8;
        const cycle = t * hopCycleSpeed;
        const hopWave = Math.sin(cycle);
        const boingScale = isSleepy ? 0.45 : 1.0;
        const speedMult = isSleepy ? 0.65 : 1.0;
        const speedWave = Math.max(0, hopWave);
        const hopSpeed = (5.6 + speedWave * 3.4) * speedMult;

        if (hopWave > 0) {
          crawlScaleY = 1.0 + hopWave * 0.24 * motionScale * boingScale;
          crawlScaleX = 1.0 - hopWave * 0.12 * motionScale * boingScale;
          crawlScaleZ = 1.0 - hopWave * 0.12 * motionScale * boingScale;
        } else {
          crawlScaleY = 1.0 + hopWave * 0.18 * motionScale * boingScale;
          crawlScaleX = 1.0 - hopWave * 0.14 * motionScale * boingScale;
          crawlScaleZ = 1.0 - hopWave * 0.14 * motionScale * boingScale;
        }

        const hopArc = Math.max(0, hopWave) * (0.38 * currentPetScale);
        const probeDist = Math.min(dist, 0.95);
        const { x: probeX, z: probeZ } = clampToCircularWorld(
          spring.position.x + dirX * probeDist,
          spring.position.z + dirZ * probeDist
        );
        const aheadGroundY = getTerrainHeightAt(probeX, probeZ);

        const isSleepingOrHeading =
          storeState === "sleep" || (isHeadingToBedRef?.current ?? false);
        const isSittingOrHeadingToBench =
          isSittingOnBench || (isHeadingToBenchRef?.current ?? false);
        const isBouncingOrHeadingToTrampoline =
          isBouncingOnTrampoline || (isHeadingToTrampolineRef?.current ?? false);

        if (aheadGroundY > currGroundY + 0.22 || aheadGroundY < currGroundY - 0.30) {
          const safeLanding = resolveHorizontalCollisions(
            probeX,
            probeZ,
            aheadGroundY,
            JURO_COLLISION_RADIUS * currentPetScale,
            true,
            isSleepingOrHeading,
            isSittingOrHeadingToBench,
            isBouncingOrHeadingToTrampoline
          );
          const landSurfaceY = getTerrainHeightAt(safeLanding.x, safeLanding.z);
          j.active = true;
          j.elapsed = 0;
          soundEffects.playHop();
          j.duration = isSleepy ? 0.38 : 0.22;
          j.startX = spring.position.x;
          j.startY = spring.position.y;
          j.startZ = spring.position.z;
          j.endX = safeLanding.x;
          j.endZ = safeLanding.z;
          j.endY = landSurfaceY + currentBottomOffset;
          j.peakY =
            Math.max(currGroundY, landSurfaceY) +
            currentBottomOffset +
            (isSleepy ? 0.3 : 0.55);

          const jumpDx = safeLanding.x - spring.position.x;
          const jumpDz = safeLanding.z - spring.position.z;
          if (Math.hypot(jumpDx, jumpDz) > 0.05 && groupRef.current) {
            groupRef.current.rotation.y = Math.atan2(jumpDx, jumpDz);
          }
        } else {
          const forwardImpulse = Math.max(0.35, (hopWave + 1.0) * 0.5);
          const step = Math.min(dist, hopSpeed * delta * forwardImpulse * motionScale * alignFactor);
          const scaledRadius = JURO_COLLISION_RADIUS * currentPetScale;
          const resolvedStep = resolveHorizontalCollisions(
            spring.position.x + dirX * step,
            spring.position.z + dirZ * step,
            currGroundY,
            scaledRadius,
            false,
            isSleepingOrHeading,
            isSittingOrHeadingToBench,
            isBouncingOrHeadingToTrampoline
          );

          let finalX = resolvedStep.x;
          let finalZ = resolvedStep.z;
          if (resolvedStep.hitObstacle) {
            const tangentX = -dirZ * step * 0.7;
            const tangentZ = dirX * step * 0.7;
            const slid = resolveHorizontalCollisions(
              finalX + tangentX,
              finalZ + tangentZ,
              currGroundY,
              scaledRadius,
              false,
              isSleepingOrHeading,
              isSittingOrHeadingToBench,
              isBouncingOrHeadingToTrampoline
            );
            finalX = slid.x;
            finalZ = slid.z;
          }

          const nextGroundY = getTerrainHeightAt(finalX, finalZ);
          const inWaterStep = isWaterAt(finalX, finalZ);
          const waterFloat = inWaterStep ? Math.sin(t * 3.5) * 0.02 : 0;
          _targetVec.set(finalX, nextGroundY + currentBottomOffset + hopArc + waterFloat, finalZ);
          spring.setTarget(_targetVec);

          if (groupRef.current) {
            const targetPitch = (hopWave * 0.06 - 0.02) * motionScale;
            const nextTurnDiff =
              ((targetYaw - groupRef.current.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
            const bankRoll = THREE.MathUtils.clamp(-nextTurnDiff * 0.22, -0.15, 0.15) * motionScale;
            const waddleRoll = Math.sin(cycle * 0.5) * 0.05 * motionScale;
            groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, targetPitch, 9.0, delta);
            groupRef.current.rotation.z = dampExp(
              groupRef.current.rotation.z,
              bankRoll + waddleRoll,
              9.0,
              delta
            );
          }
        }
      } else {
        waypointQueueRef.current = [];
        _targetVec.set(spring.position.x, restY, spring.position.z);
        spring.setTarget(_targetVec);
        usePetStore.getState().setLastPosition({
          x: spring.position.x,
          y: restY,
          z: spring.position.z,
        });
        if (groupRef.current) {
          groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, 0, 7.0, delta);
          groupRef.current.rotation.z = dampExp(groupRef.current.rotation.z, 0, 7.0, delta);
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
        groupRef.current.rotation.z = dampExp(groupRef.current.rotation.z, 0.12 * motionScale, 6.0, delta);
        groupRef.current.rotation.y = dampAngleExp(
          groupRef.current.rotation.y,
          fsm.lookTarget.x * 0.45,
          6.0,
          delta
        );
      }
    } else if (currentState === "happy") {
      const bounceY = restY + Math.abs(Math.sin(t * 7)) * 0.24 * motionScale;
      _targetVec.set(spring.position.x, bounceY, spring.position.z);
      spring.setTarget(_targetVec);

      if (groupRef.current) {
        groupRef.current.rotation.z = dampExp(
          groupRef.current.rotation.z,
          Math.sin(t * 7) * 0.07 * motionScale,
          12.0,
          delta
        );
        groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, 0, 6.0, delta);
      }
    } else if (currentState === "play") {
      const isBounceBall = currentToyBeingPlayed?.id === "bounce-ball";
      if (isBounceBall) {
        const fb = fetchBallRef.current;
        if (fb.stage === "throwing") {
          const lookAngle = Math.atan2(fb.ballX - spring.position.x, fb.ballZ - spring.position.z);
          if (groupRef.current) {
            groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, lookAngle, 12.0, delta);
          }
          const anticipHop = restY + Math.abs(Math.sin(t * 8)) * 0.08 * motionScale;
          _targetVec.set(spring.position.x, anticipHop, spring.position.z);
          spring.setTarget(_targetVec);
        } else if (fb.stage === "bouncing" || fb.stage === "ground") {
          const dx = fb.targetX - spring.position.x;
          const dz = fb.targetZ - spring.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.42) {
            const dirX = dx / dist;
            const dirZ = dz / dist;
            const targetYaw = Math.atan2(dirX, dirZ);
            const currentYaw = groupRef.current ? groupRef.current.rotation.y : targetYaw;
            let turnDiff = (targetYaw - currentYaw) % (Math.PI * 2);
            turnDiff = ((turnDiff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            const alignFactor = Math.max(0, Math.cos(turnDiff));

            if (groupRef.current) {
              const turnSpeed = Math.abs(turnDiff) > Math.PI * 0.35 ? 20.0 : 14.0;
              groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, targetYaw, turnSpeed, delta);
            }

            const cycle = t * 7.5;
            const wave = Math.sin(cycle);
            const stepSpeed = wave >= 0 ? 2.4 : 3.4;
            const step = Math.min(dist, stepSpeed * delta * motionScale * alignFactor);
            const resolved = resolveHorizontalCollisions(
              spring.position.x + dirX * step,
              spring.position.z + dirZ * step,
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
            fb.stage = "caught";
            fb.timer = 0;
            soundEffects.playHappy();
            soundEffects.playHop();
            spring.applyImpulse(_impulseJump);
            _targetVec.set(spring.position.x, restY, spring.position.z);
            spring.setTarget(_targetVec);
          }
        } else if (fb.stage === "caught") {
          const happyHop = restY + Math.abs(Math.sin(t * 8)) * 0.18 * motionScale;
          _targetVec.set(spring.position.x, happyHop, spring.position.z);
          spring.setTarget(_targetVec);
          if (groupRef.current) {
            groupRef.current.rotation.z = dampExp(
              groupRef.current.rotation.z,
              Math.sin(t * 10) * 0.08 * motionScale,
              14.0,
              delta
            );
          }
        } else {
          _targetVec.set(spring.position.x, restY, spring.position.z);
          spring.setTarget(_targetVec);
        }
      } else {
        const bounceY = restY + Math.abs(Math.sin(t * 7)) * 0.24 * motionScale;
        _targetVec.set(spring.position.x, bounceY, spring.position.z);
        spring.setTarget(_targetVec);
        if (groupRef.current) {
          groupRef.current.rotation.z = dampExp(
            groupRef.current.rotation.z,
            Math.sin(t * 7) * 0.07 * motionScale,
            12.0,
            delta
          );
          groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, 0, 6.0, delta);
        }
      }
    } else if (isSittingOnBench) {
      const distToBench = Math.hypot(
        spring.position.x - JURO_BENCH_POS.x,
        spring.position.z - JURO_BENCH_POS.z
      );
      if (distToBench > 0.04) {
        spring.position.x = dampExp(spring.position.x, JURO_BENCH_POS.x, 10.0, delta);
        spring.position.z = dampExp(spring.position.z, JURO_BENCH_POS.z, 10.0, delta);
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
        groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, JURO_BENCH_POS.rotY, 6.0, delta);
        groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, 0.03, 6.0, delta);
        groupRef.current.rotation.z = dampExp(
          groupRef.current.rotation.z,
          Math.sin(t * 1.6) * 0.015 * motionScale,
          6.0,
          delta
        );
      }
    } else if (isBouncingOnTrampoline) {
      spring.position.x = JURO_TRAMPOLINE_POS.x;
      spring.position.z = JURO_TRAMPOLINE_POS.z;
      spring.target.x = JURO_TRAMPOLINE_POS.x;
      spring.target.z = JURO_TRAMPOLINE_POS.z;
      spring.velocity.x = 0;
      spring.velocity.z = 0;

      const bouncePhase = Math.sin(t * 7.5);
      if (bouncePhase >= 0) {
        const bounceY = JURO_TRAMPOLINE_POS.surfaceY + currentBottomOffset + bouncePhase * 0.48;
        _targetVec.set(JURO_TRAMPOLINE_POS.x, bounceY, JURO_TRAMPOLINE_POS.z);
        spring.setTarget(_targetVec);

        crawlScaleY = 1.0 + bouncePhase * 0.22;
        crawlScaleX = 1.0 - bouncePhase * 0.10;
        crawlScaleZ = 1.0 - bouncePhase * 0.10;
      } else {
        const impact = -bouncePhase;
        crawlScaleY = 0.76 - impact * 0.14;
        crawlScaleX = 1.18 + impact * 0.10;
        crawlScaleZ = 1.18 + impact * 0.10;

        const padDepression = impact * 0.05;
        const bounceY = JURO_TRAMPOLINE_POS.surfaceY + currentBottomOffset * crawlScaleY - padDepression;
        _targetVec.set(JURO_TRAMPOLINE_POS.x, bounceY, JURO_TRAMPOLINE_POS.z);
        spring.setTarget(_targetVec);
      }

      if (groupRef.current) {
        groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, 0, 6.0, delta);
        groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, 0, 6.0, delta);
        groupRef.current.rotation.z = dampExp(
          groupRef.current.rotation.z,
          Math.sin(t * 7.5) * 0.06 * motionScale,
          8.0,
          delta
        );
      }
    } else if (currentState === "sleep") {
      const sleepTarget = myBedSlot;
      const distToBed = Math.hypot(
        spring.position.x - sleepTarget.x,
        spring.position.z - sleepTarget.z
      );
      if (distToBed > 0.04) {
        spring.position.x = dampExp(spring.position.x, sleepTarget.x, 10.0, delta);
        spring.position.z = dampExp(spring.position.z, sleepTarget.z, 10.0, delta);
      } else {
        spring.position.x = sleepTarget.x;
        spring.position.z = sleepTarget.z;
      }
      spring.target.x = sleepTarget.x;
      spring.target.z = sleepTarget.z;
      spring.velocity.x *= 0.1;
      spring.velocity.z *= 0.1;

      const targetGroundY = getTerrainHeightAt(sleepTarget.x, sleepTarget.z);
      const sleepCenterY = targetGroundY + 0.36 + currentBottomOffset * 0.88;
      _targetVec.set(sleepTarget.x, sleepCenterY, sleepTarget.z);
      spring.setTarget(_targetVec);
      if (groupRef.current) {
        const gentleSway = -0.04 + Math.sin(t * 1.1) * 0.015 * motionScale;
        groupRef.current.rotation.z = dampExp(groupRef.current.rotation.z, gentleSway, 5.0, delta);
        groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, 0.02, 5.0, delta);
        groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, Math.PI * 0.5, 6.0, delta);
      }
    } else if (currentState === "eating") {
      const chewY = restY + Math.sin(t * 14) * 0.015 * motionScale;
      _targetVec.set(spring.position.x, chewY, spring.position.z);
      spring.setTarget(_targetVec);
      if (groupRef.current) {
        groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, 0.08, 10.0, delta);
        groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, 0, 9.0, delta);
      }
    } else if (isBlowingBubbles) {
      const bubbleExcitedHop = restY + Math.abs(Math.sin(t * 7.5)) * 0.1 * motionScale;
      _targetVec.set(spring.position.x, bubbleExcitedHop, spring.position.z);
      spring.setTarget(_targetVec);
      if (groupRef.current) {
        groupRef.current.rotation.z = dampExp(
          groupRef.current.rotation.z,
          Math.sin(t * 8) * 0.05 * motionScale,
          10.0,
          delta
        );
        groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, 0, 6.0, delta);
      }
    } else {
      const idleBobRate = isSleepy ? 1.0 : 1.8;
      const idleBobAmp = isSleepy ? 0.007 : 0.02;
      const idleY = restY + Math.sin(t * idleBobRate) * idleBobAmp * motionScale;
      _targetVec.set(spring.position.x, idleY, spring.position.z);
      spring.setTarget(_targetVec);
      if (groupRef.current) {
        groupRef.current.rotation.z = dampExp(groupRef.current.rotation.z, 0, 6.0, delta);
        groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, 0, 6.0, delta);
        groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, 0, 4.0, delta);
      }
    }
  }

  // Physics simulation step + solid obstacle collision enforcement
  spring.config.damping = isSleepy ? 24 : 10;
  spring.config.stiffness = isSleepy ? 95 : 145;
  spring.update(delta);

  const isSleepingOrHeading =
    currentState === "sleep" ||
    storeState === "sleep" ||
    (isHeadingToBedRef?.current ?? false);
  const isSittingOrHeadingToBench =
    isSittingOnBench || (isHeadingToBenchRef?.current ?? false);
  const isBouncingOrHeadingToTrampoline =
    isBouncingOnTrampoline || (isHeadingToTrampolineRef?.current ?? false);

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

  // Compute squash/stretch scale, floor collision, and project screen coords
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
      const inWater = isWaterAt(spring.position.x, spring.position.z);
      if (inWater) {
        crawlScaleY *= 0.92;
        crawlScaleX *= 1.04;
        crawlScaleZ *= 1.04;
      }
      scale.x *= crawlScaleX;
      scale.y *= crawlScaleY;
      scale.z *= crawlScaleZ;
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
          if (rumbleElapsed < delta * 1.5) {
            soundEffects.playSquish();
          }
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
          if (yawnElapsed < delta * 1.5) {
            soundEffects.playTired();
          }
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

    const isSleepingOnBed =
      currentState === "sleep" &&
      Math.abs(spring.position.x - JURO_BED_POS.x) < 2.0 &&
      Math.abs(spring.position.z - JURO_BED_POS.z) < 2.8;
    const isSittingOnBenchNear =
      isSittingOnBench &&
      Math.hypot(spring.position.x - JURO_BENCH_POS.x, spring.position.z - JURO_BENCH_POS.z) < 0.65;
    const isBouncingOnTrampolineNear =
      isBouncingOnTrampoline &&
      Math.hypot(spring.position.x - JURO_TRAMPOLINE_POS.x, spring.position.z - JURO_TRAMPOLINE_POS.z) < 0.65;
    const surfaceBaseY = isSittingOnBenchNear
      ? JURO_BENCH_POS.seatY
      : isBouncingOnTrampolineNear
      ? JURO_TRAMPOLINE_POS.surfaceY - 0.06
      : liveSurfaceY + (isSleepingOnBed ? 0.44 : 0);
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

  // Soft Contact Shadow synced to Juro's ground projection
  if (shadowRef.current && groupRef.current) {
    const isSleepingOnBed =
      currentState === "sleep" &&
      Math.abs(spring.position.x - JURO_BED_POS.x) < 2.0 &&
      Math.abs(spring.position.z - JURO_BED_POS.z) < 2.8;
    const isSittingOnBenchNear =
      isSittingOnBench &&
      Math.hypot(spring.position.x - JURO_BENCH_POS.x, spring.position.z - JURO_BENCH_POS.z) < 0.65;
    const isBouncingOnTrampolineNear =
      isBouncingOnTrampoline &&
      Math.hypot(spring.position.x - JURO_TRAMPOLINE_POS.x, spring.position.z - JURO_TRAMPOLINE_POS.z) < 0.65;
    const contactSurfaceY = isSittingOnBenchNear
      ? JURO_BENCH_POS.seatY + 0.003
      : isBouncingOnTrampolineNear
      ? JURO_TRAMPOLINE_POS.surfaceY + 0.003
      : liveSurfaceY + (isSleepingOnBed ? 0.44 : 0);
    shadowRef.current.position.set(spring.position.x, contactSurfaceY + 0.005, spring.position.z);

    const juroBottomY = spring.position.y - BODY_BOTTOM_LOCAL * groupRef.current.scale.y;
    const lift = Math.max(0, juroBottomY - contactSurfaceY);
    const heightShrink = 1 / (1 + lift * 0.55);
    const bodyScaleX = groupRef.current.scale.x;
    const bodyScaleZ = groupRef.current.scale.z;

    shadowRef.current.scale.set(
      2.55 * bodyScaleX * heightShrink,
      2.25 * bodyScaleZ * heightShrink,
      1
    );
    shadowRef.current.rotation.z = -groupRef.current.rotation.y;

    const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = THREE.MathUtils.clamp(0.82 / (1 + lift * 0.9), 0.16, 0.82);
  }
}

export { BASE_GROUND_Y };
