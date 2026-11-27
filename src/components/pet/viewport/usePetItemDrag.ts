import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { usePetStore } from "../../../stores/petStore";
import { useGameStore } from "../../../stores/gameStore";
import { useCaregiverStore } from "../../../stores/caregiverStore";
import { useUIStore } from "../../../stores/uiStore";
import { soundEffects } from "../../../engine/audio/soundEffects";
import type { FoodItem, ToyItem } from "../../../types/pet";
import type { BathLiveState, JuroScreenTarget } from "../../../features/character/JuroModel";
import type { DragPayload } from "./ActionTray";
import type {
  ActiveTray,
  DragBubbleItem,
  DragVisualState,
  SpeechInteractionDetail,
} from "./viewportConstants";

interface UsePetItemDragParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  ghostRef: React.RefObject<HTMLDivElement | null>;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  bathStateRef: React.RefObject<BathLiveState>;
  juroScreenPosRef: React.RefObject<JuroScreenTarget>;
  wakeCooldownUntilRef: React.RefObject<number>;
  isHeadingToBedRef: React.RefObject<boolean>;
  setActiveTray: React.Dispatch<React.SetStateAction<ActiveTray>>;
  triggerInteractionSpeech: (
    interaction: "feed" | "play" | "bath_scrub" | "bath_rinse" | "pet",
    detail?: SpeechInteractionDetail
  ) => void;
}

/**
 * Manages feed, play, and bath actions alongside GPU-composited pointer dragging
 * for food, toys, soap bars, and rinse buckets.
 */
export function usePetItemDrag({
  containerRef,
  ghostRef,
  controlsRef,
  bathStateRef,
  juroScreenPosRef,
  wakeCooldownUntilRef,
  isHeadingToBedRef,
  setActiveTray,
  triggerInteractionSpeech,
}: UsePetItemDragParams) {
  const { feedWithItem, playWithItem, wakeUp, clean } = usePetStore();
  const { addLog, consumeFood } = useGameStore();
  const showToast = useUIStore((s) => s.showToast);

  const [dragVisual, setDragVisual] = useState<DragVisualState | null>(null);
  const [soapBadgePercent, setSoapBadgePercent] = useState(0);
  const [dragBubbles, setDragBubbles] = useState<DragBubbleItem[]>([]);

  const dragMetaRef = useRef<{
    payload: DragPayload;
    startX: number;
    startY: number;
    x: number;
    y: number;
    moved: boolean;
    overJuro: boolean;
    rect: DOMRect;
  } | null>(null);
  const hadMeaningfulSoapRef = useRef(false);
  const lastBathSoundRef = useRef(0);
  const rinseIntervalRef = useRef<number | null>(null);
  const lastBubbleSpawnRef = useRef<number>(0);
  const lastBubbleSoundRef = useRef<number>(0);

  const handlePopBubble = useCallback((bubbleId: number) => {
    soundEffects.playPop();
    setDragBubbles((prev) =>
      prev.map((b) => (b.id === bubbleId ? { ...b, popped: true } : b))
    );
    window.setTimeout(() => {
      setDragBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 180);
  }, []);

  const triggerFeed = useCallback(
    (food: FoodItem) => {
      if (!consumeFood(food.id)) return;
      wakeCooldownUntilRef.current = Date.now() + 120_000;
      isHeadingToBedRef.current = false;
      feedWithItem(food);
      soundEffects.playFeed();
      addLog(
        "feed",
        `Memberikan ${food.name} kepada Juro. (+${food.hungerRestore} Lapar, +${food.xpReward} XP)`
      );
      useCaregiverStore.getState().recordAction(
        "feed",
        `Memberikan ${food.name} kepada Juro.`,
        { hunger: food.hungerRestore, happiness: food.happinessGain },
        food.name
      );
      setActiveTray("none");
      triggerInteractionSpeech("feed", { food });
    },
    [consumeFood, feedWithItem, addLog, setActiveTray, triggerInteractionSpeech, wakeCooldownUntilRef, isHeadingToBedRef]
  );

  const triggerPlay = useCallback(
    (toy: ToyItem) => {
      wakeCooldownUntilRef.current = Date.now() + 120_000;
      isHeadingToBedRef.current = false;
      playWithItem(toy);
      soundEffects.playHappy();
      const actionVerb = toy.id === "bounce-ball" ? "Melempar" : "Bermain menggunakan";
      addLog(
        "play",
        `${actionVerb} ${toy.name}. (+${toy.happinessGain} Bahagia, +${toy.xpReward} XP)`
      );
      useCaregiverStore.getState().recordAction(
        "play",
        `${actionVerb} ${toy.name} bersama Juro.`,
        { happiness: toy.happinessGain, energy: -toy.energyCost },
        toy.name
      );
      setActiveTray("none");
      triggerInteractionSpeech("play", { toy });
    },
    [playWithItem, addLog, setActiveTray, triggerInteractionSpeech, wakeCooldownUntilRef, isHeadingToBedRef]
  );

  const finishBathRinse = useCallback(() => {
    wakeCooldownUntilRef.current = Date.now() + 120_000;
    isHeadingToBedRef.current = false;
    clean();
    soundEffects.playSparkle();
    soundEffects.playHappy();
    addLog("clean", "Juro selesai disabuni dan dibilas hingga bersih.");
    useCaregiverStore.getState().recordAction(
      "bath",
      "Memandikan dan membilas Juro hingga bersih dan wangi.",
      { cleanliness: 35, happiness: 8 }
    );
    hadMeaningfulSoapRef.current = false;
    setSoapBadgePercent(0);
    triggerInteractionSpeech("bath_rinse");
  }, [clean, addLog, triggerInteractionSpeech, wakeCooldownUntilRef, isHeadingToBedRef]);

  const stopRinseLoop = useCallback(() => {
    bathStateRef.current.isRinsing = false;
    if (rinseIntervalRef.current !== null) {
      window.clearInterval(rinseIntervalRef.current);
      rinseIntervalRef.current = null;
    }
  }, [bathStateRef]);

  const startRinseLoop = useCallback(() => {
    bathStateRef.current.isRinsing = true;
    if (rinseIntervalRef.current !== null) return;

    rinseIntervalRef.current = window.setInterval(() => {
      const nowMs = Date.now();
      if (nowMs - lastBathSoundRef.current > 320) {
        lastBathSoundRef.current = nowMs;
        soundEffects.playSplash();
      }

      if (bathStateRef.current.soapLevel > 0) {
        const nextSoap = Math.max(0, bathStateRef.current.soapLevel - 0.09);
        bathStateRef.current.soapLevel = nextSoap;
        if (nextSoap === 0 && hadMeaningfulSoapRef.current) {
          finishBathRinse();
        }
      }
    }, 70);
  }, [bathStateRef, finishBathRinse]);

  useEffect(() => {
    return () => {
      stopRinseLoop();
    };
  }, [stopRinseLoop]);

  const checkOverJuro = useCallback(
    (relX: number, relY: number, kind: DragPayload["kind"]) => {
      const target = juroScreenPosRef.current;
      const dx = relX - target.x;
      const dy = relY - target.y;
      const dist = Math.hypot(dx, dy);

      if (kind === "bucket") {
        const aboveHead =
          Math.abs(dx) <= target.radiusPx * 1.15 &&
          relY >= target.y - target.radiusPx * 1.65 &&
          relY <= target.y + target.radiusPx * 0.9;
        return dist <= target.radiusPx * 1.18 || aboveHead;
      }

      return dist <= target.radiusPx * 1.18;
    },
    [juroScreenPosRef]
  );

  const handleStartItemDrag = useCallback(
    (payload: DragPayload, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      soundEffects.playPickup();

      dragMetaRef.current = {
        payload,
        startX: relX,
        startY: relY,
        x: relX,
        y: relY,
        moved: false,
        overJuro: false,
        rect,
      };

      setDragVisual({ payload, moved: false, overJuro: false });
    },
    [containerRef, controlsRef]
  );

  useEffect(() => {
    if (dragVisual?.moved && ghostRef.current && dragMetaRef.current) {
      const { x, y } = dragMetaRef.current;
      ghostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  }, [dragVisual?.moved, ghostRef]);

  const isDraggingTool = dragVisual !== null;

  useEffect(() => {
    if (!isDraggingTool) return;

    const handlePointerMove = (e: PointerEvent) => {
      const meta = dragMetaRef.current;
      if (!meta) return;

      const relX = e.clientX - meta.rect.left;
      const relY = e.clientY - meta.rect.top;
      const stepDist = Math.hypot(relX - meta.x, relY - meta.y);
      const totalDist = Math.hypot(relX - meta.startX, relY - meta.startY);
      const nextMoved = meta.moved || totalDist > 8;
      const nextOverJuro = checkOverJuro(relX, relY, meta.payload.kind);

      meta.x = relX;
      meta.y = relY;

      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${relX}px, ${relY}px, 0) translate(-50%, -50%)`;
      }

      if (nextMoved !== meta.moved || nextOverJuro !== meta.overJuro) {
        meta.moved = nextMoved;
        meta.overJuro = nextOverJuro;
        setDragVisual({
          payload: meta.payload,
          moved: nextMoved,
          overJuro: nextOverJuro,
        });
      }

      if (meta.payload.kind === "soap") {
        if (nextOverJuro && stepDist > 1.2) {
          bathStateRef.current.isScrubbing = true;
          if (usePetStore.getState().currentState === "sleep") {
            wakeUp();
          }
          const nextSoap = Math.min(1, bathStateRef.current.soapLevel + stepDist * 0.0024);
          bathStateRef.current.soapLevel = nextSoap;
          if (nextSoap >= 0.3) {
            hadMeaningfulSoapRef.current = true;
            triggerInteractionSpeech("bath_scrub");
          }

          const nowMs = Date.now();
          if (nowMs - lastBathSoundRef.current > 210) {
            lastBathSoundRef.current = nowMs;
            soundEffects.playBubble();
          }
        } else {
          bathStateRef.current.isScrubbing = false;
        }
      }

      if (meta.payload.kind === "bucket") {
        if (nextOverJuro) {
          if (usePetStore.getState().currentState === "sleep") {
            wakeUp();
          }
          startRinseLoop();
        } else {
          stopRinseLoop();
        }
      }

      if (
        meta.payload.kind === "toy" &&
        meta.payload.toy.id === "bubble-blower" &&
        nextMoved
      ) {
        const now = Date.now();
        if (now - lastBubbleSpawnRef.current > 115 && stepDist > 3.5) {
          lastBubbleSpawnRef.current = now;
          const bubbleId = now + Math.random();
          const size = Math.floor(24 + Math.random() * 22);
          const dx = (Math.random() - 0.5) * 50;
          const wandTipX = relX + 24;
          const wandTipY = relY - 22;

          setDragBubbles((prev) => [
            ...prev.slice(-9),
            { id: bubbleId, x: wandTipX, y: wandTipY, size, dx },
          ]);

          if (now - lastBubbleSoundRef.current > 150) {
            lastBubbleSoundRef.current = now;
            soundEffects.playBubble();
          }

          window.setTimeout(() => {
            setDragBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
          }, 1900);
        }
      }
    };

    const handlePointerUp = () => {
      const finalMeta = dragMetaRef.current;

      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }

      bathStateRef.current.isScrubbing = false;
      stopRinseLoop();
      setSoapBadgePercent(Math.round(bathStateRef.current.soapLevel * 100));

      dragMetaRef.current = null;
      setDragVisual(null);

      if (!finalMeta) return;

      const totalDist = Math.hypot(finalMeta.x - finalMeta.startX, finalMeta.y - finalMeta.startY);
      const isTap = totalDist < 28 || !finalMeta.moved;

      if (finalMeta.moved && !finalMeta.overJuro && !isTap && finalMeta.payload.kind !== "toy") {
        soundEffects.playDrop();
      }

      if (finalMeta.payload.kind === "food") {
        if (finalMeta.overJuro || isTap) {
          triggerFeed(finalMeta.payload.food);
        }
      } else if (finalMeta.payload.kind === "toy") {
        if (finalMeta.overJuro || isTap || finalMeta.moved) {
          triggerPlay(finalMeta.payload.toy);
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [
    isDraggingTool,
    checkOverJuro,
    startRinseLoop,
    stopRinseLoop,
    triggerFeed,
    triggerPlay,
    triggerInteractionSpeech,
    wakeUp,
    bathStateRef,
    controlsRef,
    ghostRef,
  ]);

  const handleDirectUse = useCallback(
    (payload: DragPayload) => {
      if (payload.kind === "food") {
        triggerFeed(payload.food);
      } else if (payload.kind === "toy") {
        triggerPlay(payload.toy);
      } else if (payload.kind === "soap") {
        if (usePetStore.getState().currentState === "sleep") {
          wakeUp();
        }
        bathStateRef.current.soapLevel = Math.min(1, bathStateRef.current.soapLevel + 0.35);
        hadMeaningfulSoapRef.current = true;
        soundEffects.playBubble();
        triggerInteractionSpeech("bath_scrub");
        showToast("Busa sabun digosokkan ke Juro! (Bilas dengan Ember Air)", "info");
      } else if (payload.kind === "bucket") {
        if (usePetStore.getState().currentState === "sleep") {
          wakeUp();
        }
        if (bathStateRef.current.soapLevel > 0 || hadMeaningfulSoapRef.current) {
          finishBathRinse();
        } else {
          soundEffects.playSplash();
          showToast("Gosok sabun dulu sebelum dibilas ember air!", "warn");
        }
      }
    },
    [triggerFeed, triggerPlay, wakeUp, bathStateRef, triggerInteractionSpeech, showToast, finishBathRinse]
  );

  return {
    dragVisual,
    soapBadgePercent,
    dragBubbles,
    isDraggingTool,
    handlePopBubble,
    handleStartItemDrag,
    handleDirectUse,
  };
}
