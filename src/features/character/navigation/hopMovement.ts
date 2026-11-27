import type React from "react";
import * as THREE from "three";
import type { BehaviorStateMachine } from "../../../engine/behavior/BehaviorStateMachine";
import type { SpringOscillator3D } from "../../../engine/physics/SpringOscillator";
import type { PetBehaviorState, ToyItem } from "../../../types/pet";
import { soundEffects } from "../../../engine/audio/soundEffects";
import { usePetStore } from "../../../stores/petStore";
import {
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  clampToCircularWorld,
  getTerrainHeightAt,
  isWaterAt,
  resolveHorizontalCollisions,
} from "../../../engine/world/mapTerrain";
import { findPath, getGlobalNavGrid } from "../../../engine/world/pathfinding";
import {
  JURO_COLLISION_RADIUS,
  dampAngleExp,
  dampExp,
  type FetchBallState,
  type JumpState,
} from "../juroTypes";

const _targetVec = new THREE.Vector3();
const _bedTargetVec = new THREE.Vector3();
const _benchTargetVec = new THREE.Vector3();
const _trampolineTargetVec = new THREE.Vector3();
const _wanderTargetVec = new THREE.Vector3();
const _impulseDown = new THREE.Vector3(0, -0.35, 0);
const _impulseJump = new THREE.Vector3(0, 2.8, 0);

export interface CrawlScale {
  x: number;
  y: number;
  z: number;
}

export interface WanderStepParams {
  t: number;
  delta: number;
  isPartner?: boolean;
  currGroundY: number;
  restY: number;
  storeState: PetBehaviorState;
  isSleepy: boolean;
  motionScale: number;
  currentPetScale: number;
  currentBottomOffset: number;
  fsm: BehaviorStateMachine;
  spring: SpringOscillator3D;
  groupRef: React.RefObject<THREE.Group | null>;
  jumpRef: React.RefObject<JumpState>;
  waypointQueueRef: React.RefObject<Array<{ x: number; z: number }>>;
  lastFsmWanderRef: React.RefObject<THREE.Vector3>;
  myBedSlot: { x: number; z: number };
  isHeadingToBedRef?: React.RefObject<boolean>;
  isHeadingToBenchRef?: React.RefObject<boolean>;
  isSittingOnBench: boolean;
  isHeadingToTrampolineRef?: React.RefObject<boolean>;
  isBouncingOnTrampoline: boolean;
}

/**
 * Advances Juro's active A* path following, high bouncy hops, and ledge jumps for one frame.
 */
export function stepWanderLocomotion(params: WanderStepParams): CrawlScale {
  const {
    t,
    delta,
    isPartner = false,
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
  } = params;

  let crawlScaleX = 1;
  let crawlScaleY = 1;
  let crawlScaleZ = 1;
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
    return { x: crawlScaleX, y: crawlScaleY, z: crawlScaleZ };
  }

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

  if (dist <= 0.16) {
    waypointQueueRef.current = [];
    _targetVec.set(spring.position.x, restY, spring.position.z);
    spring.setTarget(_targetVec);
    if (!isPartner) {
      usePetStore.getState().setLastPosition({
        x: spring.position.x,
        y: restY,
        z: spring.position.z,
      });
    }
    if (groupRef.current) {
      groupRef.current.rotation.x = dampExp(groupRef.current.rotation.x, 0, 7.0, delta);
      groupRef.current.rotation.z = dampExp(groupRef.current.rotation.z, 0, 7.0, delta);
    }
    return { x: crawlScaleX, y: crawlScaleY, z: crawlScaleZ };
  }

  const dirX = dx / dist;
  const dirZ = dz / dist;
  const targetYaw = Math.atan2(dirX, dirZ);

  const currentYaw = groupRef.current ? groupRef.current.rotation.y : targetYaw;
  let turnDiff = (targetYaw - currentYaw) % (Math.PI * 2);
  turnDiff = ((turnDiff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

  if (groupRef.current) {
    const turnSpeed = Math.abs(turnDiff) > Math.PI * 0.35 ? 24.0 : isSleepy ? 7.5 : 15.0;
    groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, targetYaw, turnSpeed, delta);
  }

  const alignFactor = Math.max(0.25, Math.cos(turnDiff));
  const hopCycleSpeed = isSleepy ? 6.8 : 14.5;
  const cycle = t * hopCycleSpeed;
  const hopWave = Math.sin(cycle);
  const boingScale = isSleepy ? 0.5 : 1.0;
  const speedMult = isSleepy ? 0.72 : 1.0;
  const speedWave = Math.max(0, hopWave);
  const hopSpeed = (7.4 + speedWave * 4.6) * speedMult;

  if (hopWave > 0) {
    crawlScaleY = 1.0 + hopWave * 0.3 * motionScale * boingScale;
    crawlScaleX = 1.0 - hopWave * 0.14 * motionScale * boingScale;
    crawlScaleZ = 1.0 - hopWave * 0.14 * motionScale * boingScale;
  } else {
    crawlScaleY = 1.0 + hopWave * 0.22 * motionScale * boingScale;
    crawlScaleX = 1.0 - hopWave * 0.16 * motionScale * boingScale;
    crawlScaleZ = 1.0 - hopWave * 0.16 * motionScale * boingScale;
  }

  const hopArc = Math.max(0, hopWave) * (0.78 * currentPetScale);
  const probeDist = Math.min(dist, 0.95);
  const { x: probeX, z: probeZ } = clampToCircularWorld(
    spring.position.x + dirX * probeDist,
    spring.position.z + dirZ * probeDist
  );
  const aheadGroundY = getTerrainHeightAt(probeX, probeZ);

  const isSleepingOrHeading = storeState === "sleep" || (isHeadingToBedRef?.current ?? false);
  const isSittingOrHeadingToBench = isSittingOnBench || (isHeadingToBenchRef?.current ?? false);
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
    j.duration = isSleepy ? 0.34 : 0.20;
    j.startX = spring.position.x;
    j.startY = spring.position.y;
    j.startZ = spring.position.z;
    j.endX = safeLanding.x;
    j.endZ = safeLanding.z;
    j.endY = landSurfaceY + currentBottomOffset;
    j.peakY =
      Math.max(currGroundY, landSurfaceY) + currentBottomOffset + (isSleepy ? 0.42 : 0.92);

    const jumpDx = safeLanding.x - spring.position.x;
    const jumpDz = safeLanding.z - spring.position.z;
    if (Math.hypot(jumpDx, jumpDz) > 0.05 && groupRef.current) {
      groupRef.current.rotation.y = Math.atan2(jumpDx, jumpDz);
    }
    return { x: crawlScaleX, y: crawlScaleY, z: crawlScaleZ };
  }

  const forwardImpulse = Math.max(0.55, (hopWave + 1.0) * 0.5);
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
    groupRef.current.rotation.z = dampExp(groupRef.current.rotation.z, bankRoll + waddleRoll, 9.0, delta);
  }

  return { x: crawlScaleX, y: crawlScaleY, z: crawlScaleZ };
}

export interface NonWanderStepParams {
  t: number;
  delta: number;
  currGroundY: number;
  restY: number;
  currentState: PetBehaviorState;
  isSleepy: boolean;
  motionScale: number;
  currentBottomOffset: number;
  fsm: BehaviorStateMachine;
  spring: SpringOscillator3D;
  groupRef: React.RefObject<THREE.Group | null>;
  fetchBallRef: React.RefObject<FetchBallState>;
  currentToyBeingPlayed: ToyItem | null;
  myBedSlot: { x: number; z: number };
  isSittingOnBench: boolean;
  isBouncingOnTrampoline: boolean;
  isBlowingBubbles: boolean;
}

/**
 * Handles non-wander behaviors: curious, happy, play/fetch ball, bench sitting, trampoline, sleep, eating, idle.
 */
export function stepStationaryAndPlayState(params: NonWanderStepParams): CrawlScale {
  const {
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
  } = params;

  let crawlScaleX = 1;
  let crawlScaleY = 1;
  let crawlScaleZ = 1;

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
    if (currentToyBeingPlayed?.id === "bounce-ball") {
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
    const distToBed = Math.hypot(spring.position.x - sleepTarget.x, spring.position.z - sleepTarget.z);
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

  return { x: crawlScaleX, y: crawlScaleY, z: crawlScaleZ };
}
