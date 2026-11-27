import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SpringOscillator3D } from "../../engine/physics/SpringOscillator";
import { BehaviorStateMachine } from "../../engine/behavior/BehaviorStateMachine";
import type { PetBehaviorState } from "../../types/pet";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useShallow } from "zustand/react/shallow";
import { usePetStore } from "../../stores/petStore";
import { useGameStore } from "../../stores/gameStore";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { juroSyncService } from "../../services/firebase/juroSyncService";
import { PartnerInterpolationBuffer } from "../multiplayer/PartnerInterpolationBuffer";
import { MovementSyncCoordinator } from "../multiplayer/SyncCoordinator";
import { getSkinById } from "../../data/economyCatalog";
import {
  createSleepZTexture,
  createSoftShadowTexture,
  createDizzyEyeTexture,
  createDizzyMouthTexture,
  createDizzyStarTexture,
} from "./juroTextures";
import {
  BASE_GROUND_Y,
  JURO_BED_SLOT_1,
  JURO_BED_SLOT_2,
  getTerrainHeightAt,
} from "../../engine/world/mapTerrain";
import { isBedtimeHour } from "../../utils/timeOfDay";
import { buildJuroBodyGeometry } from "./juroBodyGeometry";
import { createMouthShapes } from "./juroMouthShapes";
import { enqueueWalkPath, stepJuroMovementAndPhysics } from "./juroNavigation";
import { updateEatingAndToys } from "./juroToyAnimator";
import { updateJuroExpressionsAndParticles } from "./juroExpressionAnimator";
import { useJuroInteraction } from "./useJuroInteraction";
import { JuroCharacterMeshes } from "./JuroCharacterMeshes";
import {
  BODY_BOTTOM_LOCAL,
  BODY_BOTTOM_OFFSET,
  JURO_BASE_SCALE,
  type FetchBallState,
  type JuroModelProps,
  type JuroVisualRefs,
  type JumpState,
  type StandState,
} from "./juroTypes";

export type { JuroScreenTarget, BathLiveState, WalkCommand, JuroModelProps } from "./juroTypes";

export const JuroModel: React.FC<JuroModelProps> = React.memo(({
  onDraggingChange: _onDraggingChange,
  bathStateRef,
  juroScreenPosRef,
  walkCommand,
  onPetClick,
  onPetPointerDown,
  juroWorldPosRef,
  juroYawRef,
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
  sphereSegments = [44, 32],
  usePhysicalMaterial = true,
  shadowsEnabled = true,
  customSkin,
  customHat,
  isPartner = false,
  initialPosition,
  partnerName: _partnerName,
  partnerState,
  isPartnerOnline = true,
  partnerPosition,
  partnerWalkTarget: _partnerWalkTarget,
  partnerYaw,
  partnerLastUpdated,
}) => {
  const refs: JuroVisualRefs = {
    groupRef: useRef<THREE.Group>(null),
    leftEyeRef: useRef<THREE.Group>(null),
    rightEyeRef: useRef<THREE.Group>(null),
    sleepEyesRef: useRef<THREE.Group>(null),
    petEyesRef: useRef<THREE.Group>(null),
    leftCatchlightRef: useRef<THREE.Mesh>(null),
    rightCatchlightRef: useRef<THREE.Mesh>(null),
    leftSubCatchlightRef: useRef<THREE.Mesh>(null),
    rightSubCatchlightRef: useRef<THREE.Mesh>(null),
    mouthGroupRef: useRef<THREE.Group>(null),
    hungryMouthGroupRef: useRef<THREE.Group>(null),
    poutMouthGroupRef: useRef<THREE.Group>(null),
    flatMouthGroupRef: useRef<THREE.Group>(null),
    sleepyMouthGroupRef: useRef<THREE.Group>(null),
    sleepMouthGroupRef: useRef<THREE.Group>(null),
    sleepBubbleRef: useRef<THREE.Mesh>(null),
    shadowRef: useRef<THREE.Mesh>(null),
    leafUmbrellaRef: useRef<THREE.Group>(null),
    crownRef: useRef<THREE.Group>(null),
    propellerRef: useRef<THREE.Group>(null),
    zzzGroupRef: useRef<THREE.Group>(null),
    zSpriteRefs: useRef<(THREE.Sprite | null)[]>([]),
    dizzyEyesGroupRef: useRef<THREE.Group>(null),
    dizzyLeftEyeRef: useRef<THREE.Mesh>(null),
    dizzyRightEyeRef: useRef<THREE.Mesh>(null),
    dizzyMouthRef: useRef<THREE.Mesh>(null),
    dizzyHaloRef: useRef<THREE.Group>(null),
    dizzyStarRefs: useRef<(THREE.Sprite | null)[]>([]),
    foodPropRef: useRef<THREE.Group>(null),
    crumbsGroupRef: useRef<THREE.Group>(null),
    heartBubbleRef: useRef<THREE.Group>(null),
    worldToyRef: useRef<THREE.Group>(null),
    worldToyMeshRef: useRef<THREE.Group>(null),
    worldToyShadowRef: useRef<THREE.Mesh>(null),
    bodyMeshRef: useRef<THREE.Mesh>(null),
    salivaDripRef: useRef<THREE.Group>(null),
    sweatDropRef: useRef<THREE.Group>(null),
    angerSteamGroupRef: useRef<THREE.Group>(null),
    sighCloudRef: useRef<THREE.Group>(null),
    mudGroupRef: useRef<THREE.Group>(null),
    dustGroupRef: useRef<THREE.Group>(null),
    dustSpeckRefs: useRef<(THREE.Mesh | null)[]>([]),
    leftCheekGroupRef: useRef<THREE.Group>(null),
    rightCheekGroupRef: useRef<THREE.Group>(null),
    leftCheekMatRef: useRef<THREE.MeshBasicMaterial>(null),
    rightCheekMatRef: useRef<THREE.MeshBasicMaterial>(null),
    soapFoamInstRef: useRef<THREE.InstancedMesh>(null),
    waterDropsInstRef: useRef<THREE.InstancedMesh>(null),
  };

  const currentPetScaleRef = useRef(JURO_BASE_SCALE);
  const currentLookRef = useRef({ x: 0, y: 0 });
  const waypointQueueRef = useRef<Array<{ x: number; z: number }>>([]);
  const lastFsmWanderRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const wakeCooldownRef = useRef<number>(0);
  const dizzyRef = useRef({ buildup: 0, timer: 0, lastSoundAt: -10, dragAge: 0 });
  const eatingTimer = useRef(0);
  const lastBiteSoundRef = useRef(-1);
  const playTimer = useRef(0);

  const fetchBallRef = useRef<FetchBallState>({
    active: false,
    stage: "throwing",
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
  const bubbleStandRef = useRef<StandState>({ active: false, x: 0, y: 0, z: 0 });
  const radioStandRef = useRef<StandState>({ active: false, x: 0, y: 0, z: 0 });
  const dirtyShakeTimer = useRef({ nextShake: 5 + Math.random() * 4, timer: 0 });
  const tummyRumbleTimer = useRef({ nextRumble: 10 + Math.random() * 5, timer: 0 });
  const sleepyYawnTimer = useRef({ nextYawn: 12 + Math.random() * 6, timer: 0 });
  const blinkState = useRef({ timer: 0, nextBlink: 2.5, isBlinking: false });
  const blockedTimerRef = useRef(0);
  const bedHeadingTimerRef = useRef(0);
  const snoreTimerRef = useRef(0);
  const scrubSoundTimerRef = useRef(0);

  const jumpRef = useRef<JumpState>({
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

  const {
    currentState: storeState,
    currentFoodBeingEaten,
    currentToyBeingPlayed,
    clearToyBeingPlayed,
    setBehaviorState,
  } = usePetStore(
    useShallow((s) => ({
      currentState: s.currentState,
      currentFoodBeingEaten: s.currentFoodBeingEaten,
      currentToyBeingPlayed: s.currentToyBeingPlayed,
      clearToyBeingPlayed: s.clearToyBeingPlayed,
      setBehaviorState: s.setBehaviorState,
    }))
  );
  const { activeSkin: storeSkin, activeHat: storeHat } = useGameStore();
  const activeSkin = customSkin ?? storeSkin;
  const activeHat = customHat !== undefined ? customHat : storeHat;
  const skinPalette = getSkinById(activeSkin);

  const myBedSlot = isPartner ? (initialPosition || JURO_BED_SLOT_2) : JURO_BED_SLOT_1;
  const fsm = useMemo(() => new BehaviorStateMachine("idle"), []);
  const lastSyncedWanderTargetRef = useRef(new THREE.Vector3(Number.NaN, 0, Number.NaN));

  const interpolationBuffer = useMemo(
    () => (isPartner ? new PartnerInterpolationBuffer() : null),
    [isPartner]
  );

  const syncCoordinator = useMemo(() => {
    if (isPartner) return null;
    return new MovementSyncCoordinator({
      onDispatchMovement: (payload) => {
        const { activeRoomCode, myProfile } = useCaregiverStore.getState();
        if (activeRoomCode && myProfile?.id) {
          void juroSyncService.syncMyPetMovement(activeRoomCode, myProfile.id, payload);
        }
      },
    });
  }, [isPartner]);

  const sleepZTexture = useMemo(() => createSleepZTexture(), []);
  const softShadowTexture = useMemo(() => createSoftShadowTexture(), []);
  const dizzyEyeTexture = useMemo(() => createDizzyEyeTexture(), []);
  const dizzyMouthTexture = useMemo(() => createDizzyMouthTexture(), []);
  const dizzyStarTexture = useMemo(() => createDizzyStarTexture(), []);

  const prefersReducedMotionRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [spring] = useState(() => {
    const isNight = isBedtimeHour(new Date());
    const initialSleep = isPartner
      ? !isPartnerOnline || partnerState === "sleep"
      : isNight || usePetStore.getState().currentState === "sleep";
    const initialLevel = level ?? usePetStore.getState().level;
    const initialGrowth = 0.68 + (Math.min(10, Math.max(1, initialLevel)) - 1) * (0.52 / 9);
    const initBottom = BODY_BOTTOM_LOCAL * JURO_BASE_SCALE * initialGrowth;

    const springOpts = { stiffness: 190, damping: 12.5, mass: 1 };

    if (
      isPartner &&
      partnerPosition &&
      Number.isFinite(partnerPosition.x) &&
      Number.isFinite(partnerPosition.z)
    ) {
      const initY =
        partnerPosition.y ?? getTerrainHeightAt(partnerPosition.x, partnerPosition.z) + initBottom;
      return new SpringOscillator3D(
        new THREE.Vector3(partnerPosition.x, initY, partnerPosition.z),
        springOpts
      );
    }

    if (initialPosition) {
      const initY =
        initialPosition.y ?? getTerrainHeightAt(initialPosition.x, initialPosition.z) + initBottom;
      return new SpringOscillator3D(
        new THREE.Vector3(initialPosition.x, initY, initialPosition.z),
        springOpts
      );
    }

    if (initialSleep) {
      const sleepBed = isPartner ? (initialPosition || JURO_BED_SLOT_2) : JURO_BED_SLOT_1;
      const bedGroundY = getTerrainHeightAt(sleepBed.x, sleepBed.z);
      return new SpringOscillator3D(
        new THREE.Vector3(sleepBed.x, bedGroundY + 0.44 + initBottom * 0.88, sleepBed.z),
        springOpts
      );
    }

    const savedPos = usePetStore.getState().lastPosition;
    if (savedPos && Number.isFinite(savedPos.x) && Number.isFinite(savedPos.z)) {
      const groundY = getTerrainHeightAt(savedPos.x, savedPos.z);
      return new SpringOscillator3D(
        new THREE.Vector3(savedPos.x, groundY + initBottom, savedPos.z),
        springOpts
      );
    }

    return new SpringOscillator3D(new THREE.Vector3(0, BASE_GROUND_Y + initBottom, 0.2), springOpts);
  });

  useEffect(() => {
    if (!isPartner || !interpolationBuffer || !partnerPosition) return;
    interpolationBuffer.pushSample(
      partnerPosition.x,
      partnerPosition.z,
      partnerYaw ?? 0,
      Date.now()
    );
  }, [isPartner, interpolationBuffer, partnerPosition, partnerYaw, partnerLastUpdated]);

  useEffect(() => {
    return () => {
      if (!isPartner) {
        const pos = spring.position;
        if (Number.isFinite(pos.x) && Number.isFinite(pos.z)) {
          usePetStore.getState().setLastPosition({ x: pos.x, y: pos.y, z: pos.z });
        }
      }
    };
  }, [spring, isPartner]);

  useEffect(() => {
    if (!isPartner && storeState && storeState !== fsm.currentState && fsm.currentState !== "dragging") {
      fsm.transitionTo(storeState, true);
    }
  }, [isPartner, storeState, fsm]);

  useEffect(() => {
    if (!walkCommand || isPartner) return;
    enqueueWalkPath({
      walkCommand,
      isPartner,
      spring,
      fsm,
      waypointQueueRef,
      lastFsmWanderRef,
      myBedSlot,
      isHeadingToBedRef,
      isHeadingToBenchRef,
      isHeadingToTrampolineRef,
      setBehaviorState,
    });
  }, [
    walkCommand,
    isPartner,
    fsm,
    setBehaviorState,
    isHeadingToBedRef,
    isHeadingToBenchRef,
    isHeadingToTrampolineRef,
    myBedSlot,
    spring,
  ]);

  const { camera, size } = useThree();
  const interactionHandlers = useJuroInteraction({
    isPartner,
    fsm,
    spring,
    currentPetScaleRef,
    wakeCooldownRef,
    waypointQueueRef,
    jumpRef,
    dizzyRef,
    setBehaviorState,
    onPetClick,
    onPetPointerDown,
  });

  const hasHat = Boolean(activeHat && activeHat !== "hat-none");
  const sphereWidthSegs = sphereSegments[0];
  const sphereHeightSegs = sphereSegments[1];
  const outerBodyGeometry = useMemo(
    () =>
      buildJuroBodyGeometry({
        centerColor: skinPalette.centerColor,
        midColor: skinPalette.midColor,
        edgeColor: skinPalette.edgeColor,
        hasHat,
        widthSegments: sphereWidthSegs,
        heightSegments: sphereHeightSegs,
      }),
    [
      skinPalette.centerColor,
      skinPalette.midColor,
      skinPalette.edgeColor,
      hasHat,
      sphereWidthSegs,
      sphereHeightSegs,
    ]
  );

  useEffect(() => {
    return () => {
      outerBodyGeometry.dispose();
    };
  }, [outerBodyGeometry]);

  const mouthShapes = useMemo(() => createMouthShapes(), []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const livePetStore = usePetStore.getState();
    const liveAttributes = livePetStore.getAttributes();
    const liveMood = livePetStore.getMood();

    if (isHeadingToBedRef?.current) {
      if (fsm.currentState !== "wander") {
        fsm.transitionTo("wander", true);
        setBehaviorState("wander");
      }
      fsm.stateDuration = 24.0;
      fsm.timeInState = 0;
    } else if (isHeadingToBenchRef?.current) {
      if (fsm.currentState !== "wander") {
        fsm.transitionTo("wander", true);
        setBehaviorState("wander");
      }
      fsm.stateDuration = 24.0;
      fsm.timeInState = 0;
    } else if (isSittingOnBench) {
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
    } else if (isPartner) {
      const partnerCurrentState: PetBehaviorState =
        !isPartnerOnline || partnerState === "sleep" ? "sleep" : partnerState ?? "idle";
      if (fsm.currentState !== partnerCurrentState) {
        fsm.transitionTo(partnerCurrentState, true);
      }
      fsm.stateDuration = 999.0;
    } else {
      const activeState = fsm.update(delta, liveAttributes, liveMood);
      if (activeState !== storeState) {
        setBehaviorState(activeState);
      }
    }

    const currentState = fsm.currentState;
    const isSleepingNow = currentState === "sleep";
    const isEatingNow = !isPartner && currentState === "eating";
    const effectiveToy = isPartner ? null : currentToyBeingPlayed;
    const effectiveEating = !isPartner && storeState === "eating";
    const isPlayingToyNow = effectiveToy !== null;
    const motionScale = prefersReducedMotionRef.current ? 0.3 : 1;
    const isNightSleepy = isBedtimeHour();
    const isSleepy = isNightSleepy || liveAttributes.energy < 45;

    if (dizzyRef.current.timer > 0) {
      dizzyRef.current.timer = Math.max(0, dizzyRef.current.timer - delta);
    }
    if (dizzyRef.current.buildup > 0) {
      dizzyRef.current.buildup = Math.max(0, dizzyRef.current.buildup - delta * 1.5);
    }

    const liveBath = bathStateRef?.current;
    if (liveBath?.isScrubbing && currentState !== "sleep") {
      dizzyRef.current.buildup = Math.min(2.5, dizzyRef.current.buildup + delta * 0.45);
      if (dizzyRef.current.buildup >= 1.4 && dizzyRef.current.timer <= 0.2) {
        dizzyRef.current.timer = 3.0;
        dizzyRef.current.buildup = 0;
        soundEffects.playDizzy();
      }
    }

    const growthFactor = 0.68 + (Math.min(10, Math.max(1, level)) - 1) * (0.52 / 9);
    const currentPetScale = JURO_BASE_SCALE * growthFactor;
    currentPetScaleRef.current = currentPetScale;
    const currentBottomOffset = BODY_BOTTOM_LOCAL * currentPetScale;

    const partnerPose =
      isPartner && interpolationBuffer ? interpolationBuffer.sample(Date.now()) : null;

    stepJuroMovementAndPhysics({
      t,
      delta,
      isPartner,
      partnerPose,
      currentState,
      storeState: isPartner ? currentState : storeState,
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
      groupRef: refs.groupRef,
      shadowRef: refs.shadowRef,
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
      currentToyBeingPlayed: effectiveToy,
      myBedSlot,
      isHeadingToBedRef,
      onBedArrival,
      isHeadingToBenchRef,
      onBenchArrival,
      isSittingOnBench,
      isHeadingToTrampolineRef,
      onTrampolineArrival,
      isBouncingOnTrampoline,
      isBlowingBubbles: !isPartner && isBlowingBubbles,
      isDraggingFood: !isPartner && isDraggingFood,
      camera,
      size,
      juroScreenPosRef,
      juroWorldPosRef,
      juroYawRef,
    });

    if (!isPartner && syncCoordinator) {
      const activeRoomCode = useCaregiverStore.getState().activeRoomCode;
      if (activeRoomCode) {
        const currentYaw = refs.groupRef.current?.rotation.y ?? 0;
        const nowMs = Date.now();
        if (currentState === "wander") {
          const tx = fsm.wanderTarget.x;
          const tz = fsm.wanderTarget.z;
          if (
            Math.hypot(
              tx - lastSyncedWanderTargetRef.current.x,
              tz - lastSyncedWanderTargetRef.current.z
            ) > 0.15
          ) {
            lastSyncedWanderTargetRef.current.set(tx, 0, tz);
            syncCoordinator.publishWalkIntent(
              spring.position,
              { x: tx, z: tz },
              currentYaw,
              nowMs
            );
          }
        }
        syncCoordinator.publishCheckpoint(spring.position, currentYaw, currentState, nowMs);
      } else {
        syncCoordinator.reset();
        lastSyncedWanderTargetRef.current.set(Number.NaN, 0, Number.NaN);
      }
    }

    const restY = getTerrainHeightAt(spring.position.x, spring.position.z) + currentBottomOffset;
    if (!isPartner) {
      updateEatingAndToys({
        t,
        delta,
        currentState,
        isCurrentlyEating: effectiveEating,
        motionScale,
        currentToyBeingPlayed: effectiveToy,
        spring,
        fsm,
        setBehaviorState,
        clearToyBeingPlayed,
        groupRef: refs.groupRef,
        foodPropRef: refs.foodPropRef,
        crumbsGroupRef: refs.crumbsGroupRef,
        heartBubbleRef: refs.heartBubbleRef,
        worldToyRef: refs.worldToyRef,
        worldToyMeshRef: refs.worldToyMeshRef,
        worldToyShadowRef: refs.worldToyShadowRef,
        eatingTimer,
        lastBiteSoundRef,
        playTimer,
        fetchBallRef,
        bubbleStandRef,
        radioStandRef,
        restY,
      });
    }

    updateJuroExpressionsAndParticles({
      t,
      delta,
      pointer: state.pointer,
      currentState,
      level,
      activeHat,
      isRaining,
      isBlowingBubbles: !isPartner && isBlowingBubbles,
      isDraggingFood: !isPartner && isDraggingFood,
      isCurrentlyEating: effectiveEating,
      motionScale,
      liveAttributes,
      liveBath: isPartner ? undefined : liveBath,
      currentToyBeingPlayed: effectiveToy,
      fsm,
      spring,
      refs,
      blinkState,
      currentLookRef,
      eatingTimer,
      fetchBallRef,
      dizzyRef,
      isDizzyRef: isPartner ? undefined : isDizzyRef,
      dirtyShakeTimer,
    });
  });

  return (
    <JuroCharacterMeshes
      refs={refs}
      outerBodyGeometry={outerBodyGeometry}
      skinPalette={skinPalette}
      mouthShapes={mouthShapes}
      activeHat={activeHat}
      level={level}
      usePhysicalMaterial={usePhysicalMaterial}
      shadowsEnabled={shadowsEnabled}
      isCurrentlyEating={!isPartner && storeState === "eating"}
      currentFoodBeingEaten={isPartner ? null : currentFoodBeingEaten}
      isPlayingToy={!isPartner && storeState === "play" && Boolean(currentToyBeingPlayed)}
      currentToyBeingPlayed={isPartner ? null : currentToyBeingPlayed}
      sleepZTexture={sleepZTexture}
      softShadowTexture={softShadowTexture}
      dizzyEyeTexture={dizzyEyeTexture}
      dizzyMouthTexture={dizzyMouthTexture}
      dizzyStarTexture={dizzyStarTexture}
      onPointerOver={interactionHandlers.handlePointerOver}
      onPointerOut={interactionHandlers.handlePointerOut}
      onPointerDown={interactionHandlers.handlePointerDown}
      onClick={interactionHandlers.handleClick}
    />
  );
});
