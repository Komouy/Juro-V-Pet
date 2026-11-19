import React, { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Canvas, useThree } from "@react-three/fiber";
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
import {
  Utensils,
  Gamepad2,
  Moon,
  Sun,
  Droplets,
  Heart,
  Zap,
  HandHeart,
  Hand,
  Store,
  X,
} from "lucide-react";
import { usePetStore } from "../../stores/petStore";
import { useGameStore } from "../../stores/gameStore";
import { useUIStore } from "../../stores/uiStore";
import { SHOP_FOODS, SHOP_TOYS } from "../../data/economyCatalog";
import { soundEffects } from "../../engine/audio/soundEffects";
import {
  getTimePhaseFromDate,
  isBedtimeHour,
  TIME_THEMES,
  type TimePhase,
} from "../../utils/timeOfDay";
import { JURO_BED_POS } from "../../engine/world/mapTerrain";
import type { FoodItem, ToyItem } from "../../types/pet";

type ActiveTray = "none" | "food" | "toy" | "bath";

type DragPayload =
  | { kind: "soap" }
  | { kind: "bucket" }
  | { kind: "food"; food: FoodItem }
  | { kind: "toy"; toy: ToyItem };

interface DragVisualState {
  payload: DragPayload;
  moved: boolean;
  overJuro: boolean;
}

// Automatically sets scenic miniature diorama valley framing for desktop widescreen & mobile portrait
const ResponsiveCamera: React.FC<{
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ controlsRef }) => {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fovRad = THREE.MathUtils.degToRad(
      camera instanceof THREE.PerspectiveCamera ? camera.fov : 38
    );

    // Frame the wide miniature valley cleanly on both widescreen & mobile portrait
    const neededZForWidth = 5.4 / (2 * Math.tan(fovRad / 2) * Math.max(0.45, aspect));
    const targetZ = THREE.MathUtils.clamp(Math.max(6.2, neededZForWidth), 6.2, 10.6);
    const targetY = aspect < 0.85 ? 2.45 : 1.95;

    camera.position.set(0, targetY, targetZ);
    camera.lookAt(0, -0.45, -0.35);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(0, -0.45, -0.35);
      controlsRef.current.update();
      controlsRef.current.saveState();
    }
  }, [camera, size.width, size.height, controlsRef]);

  return null;
};

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
    addLog("interaction", "Juro ditaruh kembali dengan aman di tanah.");
  }, [addLog]);

  const handleWalkPointSelect = useCallback(
    (x: number, z: number) => {
      if (isGrabActive) {
        handleFinishGrab();
        return;
      }
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
      soundEffects.playSquish();
      setShowStatDetails(false);
      setActiveTray("none");

      if (juroMenu.open) {
        setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
        return;
      }

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
    soundEffects.playClick();

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
            soundEffects.playSquish();
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
      soundEffects.playSquish();
      addLog("sleep", "Juro sampai di sofa tidurnya dan mulai tidur lelap. Zzz...");
    }
  }, [sleep, addLog]);

  const handleBedClick = useCallback(() => {
    soundEffects.playClick();
    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playBoing();
      addLog("interaction", "Juro dibangunkan dari sofa tidurnya.");
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    } else {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_POS.x, z: JURO_BED_POS.z, nonce: Date.now() });
      addLog("sleep", "Juro berjalan menuju sofa untuk tidur lelap.");
      soundEffects.playSquish();
    }
  }, [currentState, wakeUp, addLog]);

  const handleToggleSleep = useCallback(() => {
    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playBoing();
      addLog("interaction", "Juro terbangun segar dari tidurnya!");
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    } else {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_POS.x, z: JURO_BED_POS.z, nonce: Date.now() });
      addLog("sleep", "Juro berjalan menuju sofa untuk tidur lelap.");
      soundEffects.playSquish();
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
    soundEffects.playClick();
    setJuroMenu({ open: false, x: 0, y: 0, isNearTop: false });
    setShowStatDetails(false);

    switch (action) {
      case "food":
        setActiveTray("food");
        break;
      case "toy":
        setActiveTray("toy");
        break;
      case "sleep":
        handleToggleSleep();
        break;
      case "bath":
        setActiveTray("bath");
        break;
      case "grab":
        setIsGrabActive(true);
        soundEffects.playSquish();
        break;
    }
  };

  const compactStats = [
    { key: "hunger", label: "Lapar", value: Math.round(hunger), icon: Utensils, barColor: "bg-juro-orange", iconColor: "text-juro-orange" },
    { key: "energy", label: "Energi", value: Math.round(energy), icon: Zap, barColor: "bg-amber-400", iconColor: "text-amber-500" },
    { key: "happiness", label: "Senang", value: Math.round(happiness), icon: Heart, barColor: "bg-rose-400", iconColor: "text-rose-500" },
    { key: "cleanliness", label: "Bersih", value: Math.round(cleanliness), icon: Droplets, barColor: "bg-sky-400", iconColor: "text-sky-500" },
    { key: "affection", label: "Sayang", value: Math.round(affection), icon: HandHeart, barColor: "bg-purple-400", iconColor: "text-purple-500" },
  ];

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

  const stateLabel =
    currentState === "sleep"
      ? "Tidur"
      : currentState === "eating"
      ? "Makan"
      : currentState === "play"
      ? "Main"
      : "Aktif";

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
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <div className="relative pointer-events-auto">
          {/* Ultra-Minimal 5-Stat Strip (Consistent Horizontal Alignment Desktop & Mobile) */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              setShowStatDetails((prev) => !prev);
            }}
            aria-expanded={showStatDetails}
            aria-label="Lihat detail status Juro"
            className="h-9 inline-flex items-center gap-2 sm:gap-2.5 px-2.5 bg-warm-white/95 dark:bg-neutral-900/90 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange transition-colors cursor-pointer"
          >
            {compactStats.map((stat) => {
              const Icon = stat.icon;
              const isLow = stat.value < 30;
              return (
                <div
                  key={stat.key}
                  title={`${stat.label}: ${stat.value}%`}
                  className="flex items-center gap-1"
                >
                  <Icon
                    size={12}
                    strokeWidth={2.5}
                    className={`${isLow ? "text-rose-500 animate-pulse" : stat.iconColor} shrink-0`}
                  />
                  <div className="w-5 sm:w-8 h-1.5 bg-neutral-200 dark:bg-neutral-700 border border-charcoal/40 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isLow ? "bg-rose-500" : stat.barColor
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </button>

          {/* Compact Tap-to-Peek Detail Popover */}
          {showStatDetails && (
            <div className="animate-tray-enter absolute top-11 left-0 w-56 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-charcoal/15 dark:border-neutral-700">
                <span className="pixel-text text-[10px] font-bold text-charcoal dark:text-white truncate">
                  {name} · Lv.{level}
                </span>
                <span className="pixel-text text-[8px] uppercase px-1.5 py-0.5 bg-juro-orange text-white border border-charcoal">
                  {stateLabel}
                </span>
              </div>
              <div className="space-y-1.5">
                {compactStats.map((stat) => {
                  const Icon = stat.icon;
                  const isLow = stat.value < 30;
                  return (
                    <div key={stat.key} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 pixel-text text-[9px] text-charcoal dark:text-neutral-200">
                        <Icon
                          size={11}
                          strokeWidth={2.5}
                          className={isLow ? "text-rose-500" : stat.iconColor}
                        />
                        <span>{stat.label}</span>
                      </span>
                      <span
                        className={`pixel-text text-[9px] font-bold ${
                          isLow ? "text-rose-500" : "text-charcoal dark:text-neutral-200"
                        }`}
                      >
                        {stat.value}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

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
      {activeTray !== "none" && (
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-max max-w-[calc(100%-1.5rem)] transition-opacity duration-150 ${
            dragVisual?.moved ? "opacity-30 pointer-events-none" : "opacity-100"
          }`}
        >
        {/* Pop-Up Food Pantry Strip (Real Consumable Stock — Drag onto Juro or Tap) */}
        {activeTray === "food" && (() => {
          const availableFoods = SHOP_FOODS.filter((f) => (foodInventory[f.id] ?? 0) > 0);
          return (
            <div className="animate-tray-enter w-full bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] p-2.5">
              <div className="flex items-center justify-between gap-3 pb-1.5 mb-2 border-b border-charcoal/15 dark:border-neutral-700">
                <span className="pixel-text text-[10px] uppercase text-charcoal dark:text-white font-bold tracking-wider">
                  Stok Makanan
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    to="/shop?tab=food"
                    className="inline-flex items-center gap-1 pixel-text text-[8px] uppercase px-1.5 py-0.5 bg-juro-orange text-white border border-charcoal hover:bg-orange-600"
                  >
                    <Store size={10} strokeWidth={2.5} />
                    <span>Toko</span>
                  </Link>
                  <button
                    onClick={() => setActiveTray("none")}
                    className="p-0.5 text-charcoal dark:text-neutral-300 hover:text-juro-orange cursor-pointer"
                    aria-label="Tutup menu makanan"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {availableFoods.length === 0 ? (
                <div className="py-3 px-2 text-center space-y-2">
                  <p className="pixel-text text-[9px] text-muted uppercase">
                    Stok makanan habis!
                  </p>
                  <Link
                    to="/shop?tab=food"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-juro-orange text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold"
                  >
                    <Store size={12} strokeWidth={2.5} />
                    <span>Beli Makanan di Toko</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-stretch gap-2 overflow-x-auto max-w-[92vw] pb-0.5">
                  {availableFoods.map((food) => {
                    const stock = foodInventory[food.id] ?? 0;
                    return (
                      <button
                        key={food.id}
                        type="button"
                        onPointerDown={(e) => handleStartItemDrag({ kind: "food", food }, e)}
                        className="relative group shrink-0 w-24 p-2 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 shadow-[2px_2px_0px_#171717] hover:border-juro-orange hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1 touch-none"
                      >
                        <span className="absolute top-1 right-1 pixel-text text-[8px] px-1 bg-charcoal text-white">
                          ×{stock}
                        </span>
                        <ItemIllustration id={food.id} size={34} />
                        <span className="pixel-text text-[9px] text-charcoal dark:text-white font-bold leading-tight line-clamp-2">
                          {food.name}
                        </span>
                        <div className="flex items-center gap-1 text-[8px] pixel-text">
                          <span className="text-juro-orange font-bold">+{food.hungerRestore}</span>
                          <span className="text-muted">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +{food.xpReward}XP
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Pop-Up Toy Shelf Strip (Permanent Owned Toys — Drag onto Juro or Tap) */}
        {activeTray === "toy" && (() => {
          const myToys = SHOP_TOYS.filter((t) => ownedToys.includes(t.id));
          return (
            <div className="animate-tray-enter w-full bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] p-2.5">
              <div className="flex items-center justify-between gap-3 pb-1.5 mb-2 border-b border-charcoal/15 dark:border-neutral-700">
                <span className="pixel-text text-[10px] uppercase text-charcoal dark:text-white font-bold tracking-wider">
                  Mainan Dimiliki
                </span>
                <div className="flex items-center gap-2">
                  {myToys.length < SHOP_TOYS.length && (
                    <Link
                      to="/shop?tab=toy"
                      className="inline-flex items-center gap-1 pixel-text text-[8px] uppercase px-1.5 py-0.5 bg-juro-orange text-white border border-charcoal hover:bg-orange-600"
                    >
                      <Store size={10} strokeWidth={2.5} />
                      <span>Toko</span>
                    </Link>
                  )}
                  <button
                    onClick={() => setActiveTray("none")}
                    className="p-0.5 text-charcoal dark:text-neutral-300 hover:text-juro-orange cursor-pointer"
                    aria-label="Tutup menu mainan"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <div
                className={`grid gap-2 ${
                  myToys.length === 1
                    ? "grid-cols-1"
                    : myToys.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
                }`}
              >
                {myToys.map((toy) => (
                  <button
                    key={toy.id}
                    type="button"
                    onPointerDown={(e) => handleStartItemDrag({ kind: "toy", toy }, e)}
                    className="group min-w-0 p-2 bg-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-700 shadow-[2px_2px_0px_#171717] hover:border-juro-orange hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none"
                  >
                    <ItemIllustration id={toy.id} size={36} />
                    <span className="pixel-text text-[9px] text-charcoal dark:text-white font-bold leading-tight">
                      {toy.name}
                    </span>
                    <div className="flex items-center gap-1 text-[8px] pixel-text">
                      <span className="text-rose-500 font-bold">+{toy.happinessGain}</span>
                      <span className="text-muted">·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        +{toy.xpReward}XP
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Pop-Up Interactive Bath Kit Strip: 1. Sabun Busa + 2. Ember Air */}
        {activeTray === "bath" && (
          <div className="animate-tray-enter w-full bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] p-2.5">
            <div className="flex items-center justify-between gap-4 pb-1.5 mb-2 border-b border-charcoal/15 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <span className="pixel-text text-[10px] uppercase text-charcoal dark:text-white font-bold tracking-wider">
                  Alat Mandi
                </span>
              </div>
              <button
                onClick={() => setActiveTray("none")}
                className="p-0.5 text-charcoal dark:text-neutral-300 hover:text-juro-orange cursor-pointer"
                aria-label="Tutup alat mandi"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Tool 1: Sabun Busa */}
              <button
                type="button"
                onPointerDown={(e) => handleStartItemDrag({ kind: "soap" }, e)}
                className={`group min-w-0 p-2 bg-white dark:bg-neutral-800 border-2 shadow-[2px_2px_0px_#171717] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none`}
              >
                <ItemIllustration id="soap-bar" size={38} />
                <span className="pixel-text text-[9px] text-charcoal dark:text-white font-bold">
                  Sabun Busa
                </span>
              </button>

              {/* Tool 2: Ember Air */}
              <button
                type="button"
                onPointerDown={(e) => handleStartItemDrag({ kind: "bucket" }, e)}
                className={`group min-w-0 p-2 bg-white dark:bg-neutral-800 border-2 shadow-[2px_2px_0px_#171717] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-grab active:cursor-grabbing flex flex-col items-center text-center gap-1.5 touch-none ${
                  soapBadgePercent >= 40
                    ? "border-sky-400 ring-2 ring-sky-400/40"
                    : "border-charcoal dark:border-neutral-700 hover:border-sky-400"
                }`}
              >
                <ItemIllustration id="water-bucket" size={38} />
                <span className="pixel-text text-[9px] text-charcoal dark:text-white font-bold">
                  Ember Air
                </span>
              </button>
            </div>
          </div>
        )}

        </div>
      )}

      {/* Interactive Contextual Juro Menu (Pops up directly on Juro Tap/Click) */}
      {juroMenu.open && (
        <div
          ref={juroMenuRef}
          style={{
            left: `${juroMenu.x}px`,
            top: `${juroMenu.y}px`,
          }}
          className={`absolute z-30 pointer-events-auto -translate-x-1/2 ${
            juroMenu.isNearTop ? "translate-y-2" : "-translate-y-full"
          }`}
        >
          <div className="animate-tray-enter relative inline-flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000]">
            <div
              ref={tailRef}
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-warm-white dark:bg-neutral-900 rotate-45 ${
                juroMenu.isNearTop
                  ? "-top-1.5 border-l-2 border-t-2 border-charcoal dark:border-neutral-600"
                  : "-bottom-1.5 border-r-2 border-b-2 border-charcoal dark:border-neutral-600"
              }`}
              aria-hidden="true"
            />

            {/* 1. Makan */}
            <button
              type="button"
              onClick={() => handleMenuAction("food")}
              className="relative inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
            >
              <Utensils size={13} strokeWidth={2.5} className="shrink-0 text-juro-orange" />
              <span>Makan</span>
              {totalFoodStock === 0 && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 border border-charcoal"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* 2. Main */}
            <button
              type="button"
              onClick={() => handleMenuAction("toy")}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
            >
              <Gamepad2 size={13} strokeWidth={2.5} className="shrink-0 text-rose-500" />
              <span>Main</span>
            </button>

            {/* 3. Tidur / Bangun */}
            <button
              type="button"
              onClick={() => handleMenuAction("sleep")}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
            >
              {currentState === "sleep" ? (
                <>
                  <Sun size={13} strokeWidth={2.5} className="text-amber-500 shrink-0" />
                  <span>Bangun</span>
                </>
              ) : (
                <>
                  <Moon size={13} strokeWidth={2.5} className="text-purple-500 shrink-0" />
                  <span>Tidur</span>
                </>
              )}
            </button>

            {/* 4. Mandi */}
            <button
              type="button"
              onClick={() => handleMenuAction("bath")}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-sky-400 hover:text-sky-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
            >
              <Droplets size={13} strokeWidth={2.5} className="text-sky-500 shrink-0" />
              <span>Mandi</span>
            </button>

            {/* 5. Pegang */}
            <button
              type="button"
              onClick={() => handleMenuAction("grab")}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
            >
              <Hand size={13} strokeWidth={2.5} className="text-juro-orange shrink-0" />
              <span>Pegang</span>
            </button>
          </div>
        </div>
      )}

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
