import React, { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  JuroModel,
  type JuroScreenTarget,
  type BathLiveState,
  type WalkCommand,
} from "../../features/character/JuroModel";
import { OutdoorEnvironment } from "./OutdoorEnvironment";
import { ItemIllustration } from "../items/ItemIllustration";
import { Hand } from "lucide-react";
import { usePetStore } from "../../stores/petStore";
import { useGameStore } from "../../stores/gameStore";
import { useUIStore } from "../../stores/uiStore";
import { SHOP_FOODS } from "../../data/economyCatalog";
import { soundEffects } from "../../engine/audio/soundEffects";
import {
  getTimePhaseFromDate,
  isBedtimeHour,
  TIME_THEMES,
  type TimePhase,
} from "../../utils/timeOfDay";
import { JURO_BED_POS } from "../../engine/world/mapTerrain";
import type { FoodItem, ToyItem } from "../../types/pet";
import { ResponsiveCamera } from "./viewport/ResponsiveCamera";
import { StatBars } from "./viewport/StatBars";
import { ActionTray, type DragPayload } from "./viewport/ActionTray";
import { JuroContextMenu } from "./viewport/JuroContextMenu";

type ActiveTray = "none" | "food" | "toy" | "bath";

interface DragVisualState {
  payload: DragPayload;
  moved: boolean;
  overJuro: boolean;
}

export const PetViewport: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const juroScreenPosRef = useRef<JuroScreenTarget>({ x: 300, y: 240, radiusPx: 110 });

  // Live 60fps bath state ref read directly by JuroModel useFrame (ZERO React re-renders during drag!)
  const bathStateRef = useRef<BathLiveState>({
    soapLevel: 0,
    isScrubbing: false,
    isRinsing: false,
  });

  const {
    name,
    hunger,
    energy,
    happiness,
    cleanliness,
    affection,
    level,
    currentState,
    recentlyLeveledUp,
    clearLevelUpAlert,
    feedWithItem,
    playWithItem,
    sleep,
    wakeUp,
    recoverSleepEnergy,
    clean,
  } = usePetStore();
  const { addLog, addCoins, foodInventory, ownedToys, consumeFood } = useGameStore();

  const [activeTray, setActiveTray] = useState<ActiveTray>("none");
  const [showStatDetails, setShowStatDetails] = useState(false);
  const [juroMenu, setJuroMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    isNearTop: boolean;
  }>({
    open: false,
    x: 0,
    y: 0,
    isNearTop: false,
  });

  const [isGrabActive, setIsGrabActive] = useState(false);
  const [isDraggingPet, setIsDraggingPet] = useState(false);
  const isHeadingToBedRef = useRef<boolean>(false);
  const wakeCooldownUntilRef = useRef<number>(0);
  const dragPointerNDC = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const juroMenuRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  // Coarse UI states (only change on discrete state flips — NEVER on pointermove pixels!)
  const [dragVisual, setDragVisual] = useState<DragVisualState | null>(null);
  const [soapBadgePercent, setSoapBadgePercent] = useState(0);
  const [walkCommand, setWalkCommand] = useState<WalkCommand | null>(null);

  const handleFinishGrab = useCallback(() => {
    setIsGrabActive(false);
    soundEffects.playBoing();
    soundEffects.playPlop();
    addLog("interaction", "Juro ditaruh kembali dengan aman di tanah.");
  }, [addLog]);

  const handleWalkPointSelect = useCallback(
    (x: number, z: number) => {
      if (isGrabActive) {
        handleFinishGrab();
        return;
      }
      soundEffects.playGuideTap();
      setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
      setActiveTray("none");
      setShowStatDetails(false);
      setWalkCommand({ x, z, nonce: Date.now() });
    },
    [isGrabActive, handleFinishGrab, setActiveTray, setShowStatDetails]
  );

  const handleOpenShopFromMap = useCallback(() => {
    if (isGrabActive) handleFinishGrab();
    setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
    soundEffects.playClick();
    navigate("/shop");
  }, [isGrabActive, handleFinishGrab, navigate]);

  const handleOpenMineFromMap = useCallback(() => {
    if (isGrabActive) handleFinishGrab();
    setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
    soundEffects.playClick();
    navigate("/mine");
  }, [isGrabActive, handleFinishGrab, navigate]);

  const handlePetClick = useCallback(
    (screenPos?: { x: number; y: number }) => {
      setShowStatDetails(false);
      setActiveTray("none");

      if (juroMenu.open) {
        soundEffects.playDismiss();
        setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
        return;
      }

      soundEffects.playPop();

      const contRect = containerRef.current?.getBoundingClientRect();
      const contW = contRect?.width || window.innerWidth;
      const contH = contRect?.height || window.innerHeight;

      const rawX = screenPos?.x ?? (juroScreenPosRef.current?.x ?? contW / 2);
      const rawY = screenPos?.y ?? (juroScreenPosRef.current?.headY ?? contH / 2);

      const halfMenuW = Math.min(180, (contW - 24) / 2);
      const clampedX = Math.max(halfMenuW + 12, Math.min(contW - halfMenuW - 12, rawX));

      const isNearTop = rawY < 140;
      const targetY = isNearTop ? rawY + 45 : rawY - 14;
      const clampedY = Math.max(20, Math.min(contH - 70, targetY));

      setJuroMenu({
        open: true,
        x: clampedX,
        y: clampedY,
        isNearTop,
      });
    },
    [juroMenu.open]
  );

  // Dismiss open trays / stat popover / Juro menu on Escape key
  useEffect(() => {
    if (activeTray === "none" && !showStatDetails && !juroMenu.open && !isGrabActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isGrabActive) handleFinishGrab();
        setActiveTray("none");
        setShowStatDetails(false);
        setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTray, showStatDetails, juroMenu.open, isGrabActive, handleFinishGrab]);

  // Dismiss Juro menu when clicking outside
  useEffect(() => {
    if (!juroMenu.open) return;
    const onWindowClick = (e: MouseEvent) => {
      if (juroMenuRef.current && juroMenuRef.current.contains(e.target as Node)) {
        return;
      }
      setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
    };
    const timer = setTimeout(() => {
      window.addEventListener("click", onWindowClick);
    }, 60);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", onWindowClick);
    };
  }, [juroMenu.open]);

  // Dismiss Juro menu when user rotates or zooms camera with OrbitControls
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onOrbitStart = () => {
      setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
    };
    controls.addEventListener("start", onOrbitStart);
    return () => controls.removeEventListener("start", onOrbitStart);
  }, []);

  // Continuous pointer tracking during Grab Mode (Pegang)
  useEffect(() => {
    if (!isGrabActive) return;
    let downTime = 0;
    let movedDistance = 0;
    let startX = 0;
    let startY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downTime = Date.now();
      movedDistance = 0;
      startX = e.clientX;
      startY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (downTime > 0) {
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        movedDistance = Math.max(movedDistance, dist);
      }
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        dragPointerNDC.current = { x: nx, y: ny };
      }
    };

    const onPointerUp = () => {
      // If user dragged on screen (> 18px moved), releasing finger drops Juro at that spot
      if (downTime > 0 && movedDistance > 18) {
        handleFinishGrab();
      }
      downTime = 0;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isGrabActive, handleFinishGrab]);

  // Lightweight 60fps RAF loop to keep Juro menu anchored directly above Juro in screen coordinates
  useEffect(() => {
    if (!juroMenu.open) return;
    let animId: number;
    const update = () => {
      if (juroMenuRef.current && juroScreenPosRef.current && containerRef.current) {
        const contRect = containerRef.current.getBoundingClientRect();
        const pos = juroScreenPosRef.current;
        const contW = contRect.width || window.innerWidth;
        const contH = contRect.height || window.innerHeight;

        const halfMenuW = Math.min(180, (contW - 24) / 2);
        const clampedX = Math.max(halfMenuW + 12, Math.min(contW - halfMenuW - 12, pos.x));

        const crownY = pos.headY ?? (pos.y - pos.radiusPx);
        const isNearTop = crownY < 140;
        const targetY = isNearTop ? crownY + 45 : crownY - 14;
        const clampedY = Math.max(20, Math.min(contH - 70, targetY));

        juroMenuRef.current.style.left = `${clampedX}px`;
        juroMenuRef.current.style.top = `${clampedY}px`;
      }
      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, [juroMenu.open]);

  // Imperative drag tracking refs (zero allocations, zero layout thrash, zero re-renders)
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

  const handleDraggingPetChange = useCallback((dragging: boolean) => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !dragging;
    }
    setIsDraggingPet(dragging);
  }, []);

  // Auto-grant level-up coin bonus silently without interrupting Home viewport
  useEffect(() => {
    if (recentlyLeveledUp) {
      clearLevelUpAlert();
      addCoins(25);
      addLog("interaction", `Juro mencapai Level ${level}! Bonus +25 koin otomatis ditambahkan.`);
    }
  }, [recentlyLeveledUp, clearLevelUpAlert, addCoins, addLog, level]);

  // Real-time local clock tracking for automatic day/night nature atmosphere
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Gentle ongoing energy recovery while Juro stays asleep
  useEffect(() => {
    if (currentState !== "sleep") return;
    const timer = setInterval(() => {
      recoverSleepEnergy(2);
    }, 3000);
    return () => clearInterval(timer);
  }, [currentState, recoverSleepEnergy]);

  const activePhase: TimePhase = getTimePhaseFromDate(now);
  const activeTheme = TIME_THEMES[activePhase];

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
      setActiveTray("none");
    },
    [consumeFood, feedWithItem, addLog, setActiveTray]
  );

  const triggerPlay = useCallback(
    (toy: ToyItem) => {
      wakeCooldownUntilRef.current = Date.now() + 120_000;
      isHeadingToBedRef.current = false;
      playWithItem(toy);
      soundEffects.playHappy();
      addLog(
        "play",
        `Bermain menggunakan ${toy.name}. (+${toy.happinessGain} Bahagia, +${toy.xpReward} XP)`
      );
      setActiveTray("none");
    },
    [playWithItem, addLog, setActiveTray]
  );

  const finishBathRinse = useCallback(() => {
    wakeCooldownUntilRef.current = Date.now() + 120_000;
    isHeadingToBedRef.current = false;
    clean();
    soundEffects.playSparkle();
    soundEffects.playHappy();
    addLog("clean", "Juro selesai disabuni dan dibilas hingga bersih berkilau!");
    hadMeaningfulSoapRef.current = false;
    setSoapBadgePercent(0);
  }, [clean, addLog]);

  // Imperatively start/stop water rinse timer without React re-renders
  const stopRinseLoop = useCallback(() => {
    bathStateRef.current.isRinsing = false;
    if (rinseIntervalRef.current !== null) {
      window.clearInterval(rinseIntervalRef.current);
      rinseIntervalRef.current = null;
    }
  }, []);

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
  }, [finishBathRinse]);

  useEffect(() => {
    return () => {
      stopRinseLoop();
    };
  }, [stopRinseLoop]);

  // Check if viewport-relative pointer coordinate hits Juro
  const checkOverJuro = useCallback((relX: number, relY: number, kind: DragPayload["kind"]) => {
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
  }, []);

  // Begin manual drag for Soap, Bucket, Food, or Toy
  const handleStartItemDrag = (payload: DragPayload, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // Immediately lock camera OrbitControls so background stays completely still
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

    setDragVisual({
      payload,
      moved: false,
      overJuro: false,
    });
  };

  // Sync ghost position right after it mounts on moved=true
  useEffect(() => {
    if (dragVisual?.moved && ghostRef.current && dragMetaRef.current) {
      const { x, y } = dragMetaRef.current;
      ghostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  }, [dragVisual?.moved]);

  // Global pointermove & pointerup listeners while dragging any item
  const isDraggingTool = dragVisual !== null;

  useEffect(() => {
    if (!isDraggingTool) return;

    const handlePointerMove = (e: PointerEvent) => {
      const meta = dragMetaRef.current;
      if (!meta) return;

      // Use cached bounding rect — zero layout reflow!
      const relX = e.clientX - meta.rect.left;
      const relY = e.clientY - meta.rect.top;
      const stepDist = Math.hypot(relX - meta.x, relY - meta.y);
      const totalDist = Math.hypot(relX - meta.startX, relY - meta.startY);
      const nextMoved = meta.moved || totalDist > 8;
      const nextOverJuro = checkOverJuro(relX, relY, meta.payload.kind);

      meta.x = relX;
      meta.y = relY;

      // Move floating ghost directly on GPU compositor (ZERO React re-render!)
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${relX}px, ${relY}px, 0) translate(-50%, -50%)`;
      }

      // Only trigger React state when discrete visual flags actually change
      if (nextMoved !== meta.moved || nextOverJuro !== meta.overJuro) {
        meta.moved = nextMoved;
        meta.overJuro = nextOverJuro;
        setDragVisual({
          payload: meta.payload,
          moved: nextMoved,
          overJuro: nextOverJuro,
        });
      }

      // Real-time scrubbing with Soap over Juro (writes straight to bathStateRef!)
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

      // Real-time water pouring with Bucket over/above Juro
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
    };

    const handlePointerUp = () => {
      const finalMeta = dragMetaRef.current;

      // Unlock camera OrbitControls cleanly
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }

      bathStateRef.current.isScrubbing = false;
      stopRinseLoop();
      setSoapBadgePercent(Math.round(bathStateRef.current.soapLevel * 100));

      dragMetaRef.current = null;
      setDragVisual(null);

      if (!finalMeta) return;

      if (finalMeta.moved && !finalMeta.overJuro) {
        soundEffects.playDrop();
      }

      // Food & Toy support BOTH manual drag-and-drop onto Juro AND quick tap
      if (finalMeta.payload.kind === "food") {
        if (finalMeta.overJuro || !finalMeta.moved) {
          triggerFeed(finalMeta.payload.food);
        }
      } else if (finalMeta.payload.kind === "toy") {
        if (finalMeta.overJuro || !finalMeta.moved) {
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
  }, [isDraggingTool, checkOverJuro, startRinseLoop, stopRinseLoop, triggerFeed, triggerPlay, wakeUp]);

  // Synchronize camera reset triggered globally from Navbar
  const cameraResetNonce = useUIStore((s) => s.cameraResetNonce);
  useEffect(() => {
    if (cameraResetNonce === 0) return;
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [cameraResetNonce]);

  const handleBedArrival = useCallback(() => {
    isHeadingToBedRef.current = false;
    if (usePetStore.getState().currentState !== "sleep") {
      sleep();
      soundEffects.playSleep();
      addLog("sleep", "Juro sampai di sofa tidurnya dan mulai tidur lelap. Zzz...");
    }
  }, [sleep, addLog]);

  const handleBedClick = useCallback(() => {
    soundEffects.playClick();
    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      addLog("interaction", "Juro dibangunkan dari sofa tidurnya.");
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    } else {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_POS.x, z: JURO_BED_POS.z, nonce: Date.now() });
      addLog("sleep", "Juro berjalan menuju sofa untuk tidur lelap.");
      soundEffects.playClick();
    }
  }, [currentState, wakeUp, addLog]);

  const handleToggleSleep = useCallback(() => {
    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      addLog("interaction", "Juro terbangun segar dari tidurnya!");
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    } else {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_POS.x, z: JURO_BED_POS.z, nonce: Date.now() });
      addLog("sleep", "Juro berjalan menuju sofa untuk tidur lelap.");
      soundEffects.playClick();
    }
    setActiveTray("none");
  }, [currentState, wakeUp, addLog]);

  // Circadian rhythm controller: sleep at 19:00 - 06:00, wake at 06:00
  const isNightSleep = isBedtimeHour(now);
  const prevHourRef = useRef<number>(now.getHours());

  useEffect(() => {
    const prevHour = prevHourRef.current;
    const currentHour = now.getHours();
    prevHourRef.current = currentHour;

    // Detect transition crossing into morning (06:00)
    const crossedToMorning =
      (prevHour < 6 || prevHour >= 19) && currentHour >= 6 && currentHour < 10;

    // 1. Daytime / Morning wake-up (ONLY when clock actually crosses into 06:00 morning)
    if (crossedToMorning) {
      if (currentState === "sleep") {
        wakeUp();
        soundEffects.playBoing();
        addLog(
          "interaction",
          "Selamat pagi! Jam 6 pagi telah tiba, Juro bangun dari sofa tidurnya dan siap beraktivitas!"
        );
      }
      isHeadingToBedRef.current = false;
      return;
    }

    // Daytime check: during daytime (06:00 - 18:59), do NOT automatically wake or force sleep.
    // Allow daytime naps initiated by the player!
    if (!isNightSleep) {
      return;
    }

    // 2. Nighttime bedtime (19:00 - 06:00)
    if (currentState === "sleep") {
      isHeadingToBedRef.current = false;
      return;
    }

    // If player interacted or woke Juro recently, grant temporary grace period
    if (Date.now() < wakeCooldownUntilRef.current) {
      return;
    }

    // Don't interrupt feeding, scrubbing or grabbing
    if (currentState === "eating" || currentState === "dragging" || isGrabActive) {
      return;
    }

    // Automatically walk to bed to sleep
    if (!isHeadingToBedRef.current) {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_POS.x, z: JURO_BED_POS.z, nonce: Date.now() });
      addLog(
        "sleep",
        `Waktu malam telah tiba (pukul ${now.getHours()}:00). Juro berjalan menuju sofa tidurnya untuk tidur pulas.`
      );
    }
  }, [isNightSleep, currentState, isGrabActive, now, wakeUp, addLog]);

  const handleMenuAction = (action: "food" | "toy" | "sleep" | "bath" | "grab") => {
    setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
    setShowStatDetails(false);

    switch (action) {
      case "food":
        soundEffects.playPop();
        setActiveTray("food");
        break;
      case "toy":
        soundEffects.playPop();
        setActiveTray("toy");
        break;
      case "sleep":
        handleToggleSleep();
        break;
      case "bath":
        soundEffects.playPop();
        setActiveTray("bath");
        break;
      case "grab":
        setIsGrabActive(true);
        soundEffects.playSquish();
        break;
    }
  };

  const getDraggedIllustrationId = (payload: DragPayload): string => {
    switch (payload.kind) {
      case "soap":
        return "soap-bar";
      case "bucket":
        return "water-bucket";
      case "food":
        return payload.food.id;
      case "toy":
        return payload.toy.id;
    }
  };

  const totalFoodStock = SHOP_FOODS.reduce((acc, f) => acc + (foodInventory[f.id] ?? 0), 0);

  const orbitEnabled = !isGrabActive && !isDraggingPet && !isDraggingTool;

  return (
    <div
      ref={containerRef}
      style={{ background: activeTheme.skyGradient }}
      className={`relative flex-1 min-h-0 w-full overflow-hidden select-none touch-none transition-all duration-700 ${
        isGrabActive || isDraggingPet ? "cursor-grabbing" : "cursor-default"
      }`}
    >
      {/* Top Overlay Bar: Compact Tap-to-Peek Stat Strip */}
      <StatBars
        name={name}
        level={level}
        hunger={hunger}
        energy={energy}
        happiness={happiness}
        cleanliness={cleanliness}
        affection={affection}
        currentState={currentState}
        showStatDetails={showStatDetails}
        onToggleStatDetails={() => setShowStatDetails((prev) => !prev)}
      />

      {/* 3D Canvas (Full Stage — Mobile-Optimized DPR & GPU Settings) */}
      <Canvas
        camera={{ position: [0, 1.95, 6.2], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <Suspense fallback={null}>
          {/* Adaptive Responsive Camera Distance for Desktop & Mobile */}
          <ResponsiveCamera controlsRef={controlsRef} />

          {/* Dynamic Lighting Synced to User's Time of Day */}
          <ambientLight
            color={activeTheme.ambientColor}
            intensity={activeTheme.ambientIntensity}
          />
          <directionalLight
            position={activeTheme.keyLightPos}
            color={activeTheme.keyLightColor}
            intensity={activeTheme.keyLightIntensity}
          />
          {/* Soft Front Face Fill so Juro stays bright & adorable even at night */}
          <directionalLight
            position={[-2.5, 2.0, 3.5]}
            intensity={activeTheme.isNight ? 0.65 : 0.7}
            color="#FFF5EA"
          />
          {/* Rim Backlight */}
          <directionalLight
            position={[-3.5, 4, -3.5]}
            intensity={activeTheme.rimLightIntensity}
            color={activeTheme.rimLightColor}
          />
          {/* Warm Bottom Bounce Glow */}
          <pointLight
            position={[0, -1.6, 1.4]}
            intensity={activeTheme.isNight ? 0.55 : 0.4}
            color={activeTheme.isNight ? "#FDE047" : "#F97316"}
          />

          {/* Outdoor Nature Environment (Memoized, Clickable Map, Interactive Shop & Mine Cave!) */}
          <OutdoorEnvironment
            theme={activeTheme}
            onWalkPointSelect={handleWalkPointSelect}
            onOpenShop={handleOpenShopFromMap}
            onOpenMine={handleOpenMineFromMap}
            onBedClick={handleBedClick}
          />

          {/* Juro Pocket-Sized 3D Slime Model with Crawling, Jumping, Bathing & Pegang */}
          <JuroModel
            onDraggingChange={handleDraggingPetChange}
            bathStateRef={bathStateRef}
            juroScreenPosRef={juroScreenPosRef}
            walkCommand={walkCommand}
            onPetClick={handlePetClick}
            isGrabActive={isGrabActive}
            dragPointerNDC={dragPointerNDC}
            isHeadingToBedRef={isHeadingToBedRef}
            onBedArrival={handleBedArrival}
          />

          {/* Wide Diorama Orbit Controls — automatically paused while grabbing Juro or dragging any item */}
          <OrbitControls
            ref={controlsRef}
            enabled={orbitEnabled}
            enablePan={false}
            enableZoom={true}
            minDistance={2.2}
            maxDistance={12.5}
            minPolarAngle={Math.PI / 5.5}
            maxPolarAngle={Math.PI / 2.08}
            minAzimuthAngle={-Math.PI * 0.78}
            maxAzimuthAngle={Math.PI * 0.78}
          />
        </Suspense>
      </Canvas>

      {/* GPU-Composited Floating Draggable Item Ghost (Moved via DOM Ref — Zero React Re-Renders!) */}
      {dragVisual && dragVisual.moved && (
        <div
          ref={ghostRef}
          className="absolute top-0 left-0 z-40 pointer-events-none select-none will-change-transform"
        >
          <div
            className={`transition-transform duration-150 ${
              dragVisual.payload.kind === "bucket" && dragVisual.overJuro
                ? "-rotate-35 scale-115"
                : dragVisual.payload.kind === "soap" && dragVisual.overJuro
                ? "rotate-12 scale-110"
                : dragVisual.overJuro
                ? "scale-120"
                : "scale-105"
            }`}
          >
            <ItemIllustration
              id={getDraggedIllustrationId(dragVisual.payload)}
              size={60}
              className="drop-shadow-[3px_4px_0px_rgba(23,23,23,0.45)]"
            />
          </div>
        </div>
      )}

      {/* Bottom Floating Trays (Food Pantry, Toy Shelf, Bath Kit) */}
      <ActionTray
        activeTray={activeTray}
        onClose={() => setActiveTray("none")}
        foodInventory={foodInventory}
        ownedToys={ownedToys}
        soapBadgePercent={soapBadgePercent}
        dragVisualMoved={dragVisual?.moved}
        onStartItemDrag={handleStartItemDrag}
      />

      {/* Interactive Contextual Juro Menu (Pops up directly on Juro Tap/Click) */}
      <JuroContextMenu
        open={juroMenu.open}
        x={juroMenu.x}
        y={juroMenu.y}
        isNearTop={juroMenu.isNearTop}
        currentState={currentState}
        totalFoodStock={totalFoodStock}
        onAction={handleMenuAction}
        menuRef={juroMenuRef}
        tailRef={tailRef}
      />

      {/* Floating Grab Guide Pill when Juro is actively held */}
      {isGrabActive && (
        <div className="animate-tray-enter fixed sm:absolute bottom-6 inset-x-0 mx-auto w-fit z-30 flex items-center gap-2 px-3 py-1.5 bg-warm-white/95 dark:bg-neutral-900/95 border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000]">
          <Hand size={14} className="text-juro-orange animate-bounce shrink-0" />
          <span className="pixel-text text-[9px] sm:text-[10px] uppercase font-bold text-charcoal dark:text-white">
            Seret Juro ke Mana Saja
          </span>
          <button
            type="button"
            onClick={handleFinishGrab}
            className="px-2 py-0.5 bg-juro-orange text-white border border-charcoal hover:bg-orange-600 active:translate-x-[1px] active:translate-y-[1px] pixel-text text-[8px] sm:text-[9px] uppercase font-bold cursor-pointer"
          >
            Taruh
          </button>
        </div>
      )}
    </div>
  );
};
