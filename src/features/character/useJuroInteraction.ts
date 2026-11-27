import { useEffect, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { BehaviorStateMachine } from "../../engine/behavior/BehaviorStateMachine";
import type { SpringOscillator3D } from "../../engine/physics/SpringOscillator";
import type { PetBehaviorState } from "../../types/pet";
import { soundEffects } from "../../engine/audio/soundEffects";
import type { JumpState } from "./juroTypes";

const _projCenter = new THREE.Vector3();

interface UseJuroInteractionParams {
  isPartner: boolean;
  fsm: BehaviorStateMachine;
  spring: SpringOscillator3D;
  currentPetScaleRef: React.RefObject<number>;
  wakeCooldownRef: React.RefObject<number>;
  waypointQueueRef: React.RefObject<Array<{ x: number; z: number }>>;
  jumpRef: React.RefObject<JumpState>;
  dizzyRef: React.RefObject<{ buildup: number; timer: number; lastSoundAt: number; dragAge: number }>;
  setBehaviorState: (state: PetBehaviorState) => void;
  onPetClick?: (screenPos: { x: number; y: number }) => void;
  onPetPointerDown?: () => void;
}

/**
 * Handles pointer tap, rapid-tap dizzy trigger, and moving-tap fallback for Juro.
 */
export function useJuroInteraction({
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
}: UseJuroInteractionParams) {
  const { camera, size } = useThree();
  const rapidTapHistoryRef = useRef<number[]>([]);
  const petPointerDownPosRef = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number;
    isTouch: boolean;
    clicked: boolean;
  } | null>(null);

  const triggerPetTapRef = useRef<() => void>(() => {});
  triggerPetTapRef.current = () => {
    if (petPointerDownPosRef.current) {
      if (petPointerDownPosRef.current.clicked) return;
      petPointerDownPosRef.current.clicked = true;
    }

    if (!isPartner) {
      wakeCooldownRef.current = Date.now() + 60_000;
      waypointQueueRef.current = [];
      if (fsm.currentState === "wander") {
        jumpRef.current.active = false;
        fsm.transitionTo("idle", true);
        setBehaviorState("idle");
      }
    }
    soundEffects.playPet();

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
  };

  // Fallback for fast-moving/hopping Juro: if pointerdown hit Juro and pointerup stayed within tap slop,
  // trigger click even if Juro hopped away mid-tap.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let fallbackTimer: number | null = null;

    const onWindowPointerUp = (e: PointerEvent) => {
      const down = petPointerDownPosRef.current;
      if (!down || down.clicked || down.pointerId !== e.pointerId) return;

      const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const elapsed = Date.now() - down.time;
      const maxSlop = down.isTouch ? 24 : 14;

      if (dist <= maxSlop && elapsed <= 900) {
        if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
        fallbackTimer = window.setTimeout(() => {
          if (petPointerDownPosRef.current && !petPointerDownPosRef.current.clicked) {
            triggerPetTapRef.current();
          }
          petPointerDownPosRef.current = null;
        }, 0);
      } else {
        petPointerDownPosRef.current = null;
      }
    };

    const onWindowPointerCancel = (e: PointerEvent) => {
      if (petPointerDownPosRef.current?.pointerId === e.pointerId) {
        petPointerDownPosRef.current = null;
      }
    };

    window.addEventListener("pointerup", onWindowPointerUp, { passive: true });
    window.addEventListener("pointercancel", onWindowPointerCancel, { passive: true });
    return () => {
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerCancel);
    };
  }, []);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (typeof document !== "undefined") {
      document.body.style.cursor = "pointer";
    }
  };

  const handlePointerOut = () => {
    if (typeof document !== "undefined") {
      document.body.style.cursor = "auto";
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPetPointerDown?.();
    petPointerDownPosRef.current = {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      time: Date.now(),
      pointerId: e.nativeEvent.pointerId,
      isTouch: e.nativeEvent.pointerType === "touch",
      clicked: false,
    };
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
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (petPointerDownPosRef.current) {
      const dx = e.nativeEvent.clientX - petPointerDownPosRef.current.x;
      const dy = e.nativeEvent.clientY - petPointerDownPosRef.current.y;
      const dist = Math.hypot(dx, dy);
      const elapsed = Date.now() - petPointerDownPosRef.current.time;
      const maxSlop = petPointerDownPosRef.current.isTouch ? 24 : 14;
      if (dist > maxSlop || elapsed > 1200) {
        petPointerDownPosRef.current = null;
        return;
      }
    }

    triggerPetTapRef.current();
    petPointerDownPosRef.current = null;
  };

  return {
    handlePointerOver,
    handlePointerOut,
    handlePointerDown,
    handleClick,
  };
}
