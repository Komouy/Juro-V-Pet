import type React from "react";
import * as THREE from "three";
import type { BehaviorStateMachine } from "../../engine/behavior/BehaviorStateMachine";
import type { SpringOscillator3D } from "../../engine/physics/SpringOscillator";
import type { PetBehaviorState, ToyItem } from "../../types/pet";
import { soundEffects } from "../../engine/audio/soundEffects";
import {
  BASE_GROUND_Y,
  WALKABLE_RADIUS,
  clampToCircularWorld,
  getTerrainHeightAt,
  resolveHorizontalCollisions,
  isWaterAt,
  isInsideObstacle,
} from "../../engine/world/mapTerrain";
import { dampAngleExp, type FetchBallState, type StandState } from "./juroTypes";

interface EatingToyParams {
  t: number;
  delta: number;
  currentState: PetBehaviorState;
  isCurrentlyEating: boolean;
  motionScale: number;
  currentToyBeingPlayed: ToyItem | null;
  spring: SpringOscillator3D;
  fsm: BehaviorStateMachine;
  setBehaviorState: (state: PetBehaviorState) => void;
  clearToyBeingPlayed: () => void;
  groupRef: React.RefObject<THREE.Group | null>;
  foodPropRef: React.RefObject<THREE.Group | null>;
  crumbsGroupRef: React.RefObject<THREE.Group | null>;
  heartBubbleRef: React.RefObject<THREE.Group | null>;
  worldToyRef: React.RefObject<THREE.Group | null>;
  worldToyMeshRef: React.RefObject<THREE.Group | null>;
  worldToyShadowRef: React.RefObject<THREE.Mesh | null>;
  eatingTimer: React.RefObject<number>;
  lastBiteSoundRef: React.RefObject<number>;
  playTimer: React.RefObject<number>;
  fetchBallRef: React.RefObject<FetchBallState>;
  bubbleStandRef: React.RefObject<StandState>;
  radioStandRef: React.RefObject<StandState>;
  restY: number;
}

const _targetVec = new THREE.Vector3();

/**
 * Updates 3D eating food prop, crumbs, heart pop, and interactive world toy sequences
 * (fetch ball, music box, bubble blower).
 */
export function updateEatingAndToys(params: EatingToyParams): void {
  const {
    t,
    delta,
    currentState,
    isCurrentlyEating,
    motionScale,
    currentToyBeingPlayed,
    spring,
    fsm,
    setBehaviorState,
    clearToyBeingPlayed,
    groupRef,
    foodPropRef,
    crumbsGroupRef,
    heartBubbleRef,
    worldToyRef,
    worldToyMeshRef,
    worldToyShadowRef,
    eatingTimer,
    lastBiteSoundRef,
    playTimer,
    fetchBallRef,
    bubbleStandRef,
    radioStandRef,
    restY,
  } = params;

  // 1. Eating Animation Sequence with 3D Food Prop
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

  // 2. Interactive 3D World Toy Playing Sequence
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

          const forwardAngle = groupRef.current ? groupRef.current.rotation.y : 0;
          let bestX = spring.position.x;
          let bestZ = spring.position.z;
          let found = false;

          for (let attempt = 0; attempt < 12; attempt++) {
            const throwAngle = forwardAngle + (Math.random() - 0.5) * Math.PI * 0.9;
            const throwDist = 2.4 + Math.random() * 1.5;
            const { x: candX, z: candZ } = clampToCircularWorld(
              spring.position.x + Math.sin(throwAngle) * throwDist,
              spring.position.z + Math.cos(throwAngle) * throwDist,
              WALKABLE_RADIUS - 0.6
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

          const safeTarget = resolveHorizontalCollisions(bestX, bestZ, BASE_GROUND_Y, 0.42, false, false);
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
          fb.ballX = fb.targetX;
          fb.ballZ = fb.targetZ;
          fb.ballY = fb.targetY + 0.082 + Math.sin(t * 3) * 0.005;
        } else if (fb.stage === "caught") {
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

        worldToyRef.current.position.set(fb.ballX, fb.ballY, fb.ballZ);
        worldToyRef.current.scale.setScalar(fb.scale);
        if (worldToyMeshRef.current) {
          worldToyMeshRef.current.rotation.set(fb.rotX, 0, fb.rotZ);
          worldToyMeshRef.current.scale.set(1, 1, 1);
        }

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
          const yaw = groupRef.current ? groupRef.current.rotation.y : 0;
          const placeAngle = yaw + 0.55;
          const placeDist = 1.35;
          const { x: candX, z: candZ } = clampToCircularWorld(
            spring.position.x + Math.sin(placeAngle) * placeDist,
            spring.position.z + Math.cos(placeAngle) * placeDist,
            WALKABLE_RADIUS - 0.6
          );
          const safe = resolveHorizontalCollisions(candX, candZ, BASE_GROUND_Y, 0.3, false, false);
          rs.x = safe.x;
          rs.z = safe.z;
          rs.y = getTerrainHeightAt(safe.x, safe.z) + 0.14;
          soundEffects.playHappy();
        }

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

        const lookAngle = Math.atan2(rs.x - spring.position.x, rs.z - spring.position.z);
        if (groupRef.current) {
          groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, lookAngle, 8.0, delta);
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
          const yaw = groupRef.current ? groupRef.current.rotation.y : 0;
          const placeAngle = yaw + 0.6;
          const placeDist = 1.35;
          const { x: candX, z: candZ } = clampToCircularWorld(
            spring.position.x + Math.sin(placeAngle) * placeDist,
            spring.position.z + Math.cos(placeAngle) * placeDist,
            WALKABLE_RADIUS - 0.6
          );
          const safe = resolveHorizontalCollisions(candX, candZ, BASE_GROUND_Y, 0.28, false, false);
          bs.x = safe.x;
          bs.z = safe.z;
          bs.y = getTerrainHeightAt(safe.x, safe.z) + 0.32;
          soundEffects.playBubble();
        }

        worldToyRef.current.position.set(bs.x, bs.y + Math.sin(t * 3.5) * 0.03, bs.z);
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

        const lookAngle = Math.atan2(bs.x - spring.position.x, bs.z - spring.position.z);
        if (groupRef.current) {
          groupRef.current.rotation.y = dampAngleExp(groupRef.current.rotation.y, lookAngle, 8.0, delta);
          groupRef.current.rotation.z = Math.sin(t * 8) * 0.07 * motionScale;
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
}
