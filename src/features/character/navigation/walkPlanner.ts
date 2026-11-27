import type React from "react";
import * as THREE from "three";
import type { BehaviorStateMachine } from "../../../engine/behavior/BehaviorStateMachine";
import type { SpringOscillator3D } from "../../../engine/physics/SpringOscillator";
import type { PetBehaviorState } from "../../../types/pet";
import { usePetStore } from "../../../stores/petStore";
import {
  JURO_BED_POS,
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  clampToCircularWorld,
  getTerrainHeightAt,
  resolveHorizontalCollisions,
} from "../../../engine/world/mapTerrain";
import { findPath, getGlobalNavGrid } from "../../../engine/world/pathfinding";
import { JURO_COLLISION_RADIUS, type JumpState, type WalkCommand } from "../juroTypes";

export interface EnqueueWalkPathParams {
  walkCommand: WalkCommand;
  isPartner?: boolean;
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
  isPartner = false,
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

  if (!isPartner && usePetStore.getState().currentState === "sleep") {
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
  if (!isPartner) {
    setBehaviorState("wander");
  }
}

interface LandmarkArrivalParams {
  delta: number;
  currentState: PetBehaviorState;
  isEatingNow: boolean;
  isScrubbing: boolean;
  currentBottomOffset: number;
  spring: SpringOscillator3D;
  jumpRef: React.RefObject<JumpState>;
  bedHeadingTimerRef: React.RefObject<number>;
  wakeCooldownRef: React.RefObject<number>;
  myBedSlot: { x: number; z: number };
  isHeadingToBedRef?: React.RefObject<boolean>;
  onBedArrival?: () => void;
  isHeadingToBenchRef?: React.RefObject<boolean>;
  onBenchArrival?: () => void;
  isSittingOnBench: boolean;
  isHeadingToTrampolineRef?: React.RefObject<boolean>;
  onTrampolineArrival?: () => void;
  isBouncingOnTrampoline: boolean;
}

/**
 * Checks proximity to interactive landmarks (bed, bench, trampoline) and snaps/fires callbacks on arrival.
 */
export function checkLandmarkArrivals({
  delta,
  currentState,
  isEatingNow,
  isScrubbing,
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
}: LandmarkArrivalParams): void {
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
      !isScrubbing &&
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
}

/**
 * Resolves the active floor elevation taking elevated landmarks (bed, bench, trampoline) into account.
 */
export function resolveLandmarkSurfaceY(
  x: number,
  z: number,
  liveSurfaceY: number,
  currentState: PetBehaviorState,
  isSittingOnBench: boolean,
  isBouncingOnTrampoline: boolean,
  trampolineOffset = -0.06,
  shadowPad = 0
): number {
  const isSleepingOnBed =
    currentState === "sleep" &&
    Math.abs(x - JURO_BED_POS.x) < 2.0 &&
    Math.abs(z - JURO_BED_POS.z) < 2.8;
  const isSittingOnBenchNear =
    isSittingOnBench && Math.hypot(x - JURO_BENCH_POS.x, z - JURO_BENCH_POS.z) < 0.65;
  const isBouncingOnTrampolineNear =
    isBouncingOnTrampoline &&
    Math.hypot(x - JURO_TRAMPOLINE_POS.x, z - JURO_TRAMPOLINE_POS.z) < 0.65;

  if (isSittingOnBenchNear) return JURO_BENCH_POS.seatY + shadowPad;
  if (isBouncingOnTrampolineNear) return JURO_TRAMPOLINE_POS.surfaceY + trampolineOffset + shadowPad;
  return liveSurfaceY + (isSleepingOnBed ? 0.44 : 0);
}
