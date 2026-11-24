import React, { Suspense, useRef, useState, useEffect, useCallback, useMemo } from "react";
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
import { usePetStore } from "../../stores/petStore";
import { useGameStore } from "../../stores/gameStore";
import { useUIStore } from "../../stores/uiStore";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { CaregiverOnboardingModal } from "../caregiver/CaregiverOnboardingModal";
import { SHOP_FOODS } from "../../data/economyCatalog";
import { soundEffects } from "../../engine/audio/soundEffects";
import {
  getTimePhaseFromDate,
  isBedtimeHour,
  TIME_THEMES,
  type TimePhase,
} from "../../utils/timeOfDay";
import {
  JURO_BED_POS,
  JURO_BED_SLOT_1,
  JURO_BED_SLOT_2,
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  isWaterAt,
} from "../../engine/world/mapTerrain";
import {
  normalizeWeather,
  isRainingWeather,
} from "../../types/ui";
import {
  detectSoftwareWebGL,
  readGraphicsEnvironment,
  resolveGraphicsProfile,
} from "../../engine/world/graphicsProfile";
import { getCognitiveTier, computePetEmotionalState } from "../../engine/ai/cognitiveCore";
import type { FoodItem, ToyItem, PetBehaviorState } from "../../types/pet";
import { ResponsiveCamera, type CameraMode } from "./viewport/ResponsiveCamera";
import { StatBars } from "./viewport/StatBars";
import { MiniMap } from "./viewport/MiniMap";
import { StorybookSky } from "./environment/StorybookSky";
import { ActionTray, type DragPayload } from "./viewport/ActionTray";
import { ActionDock } from "./viewport/ActionDock";
import { JuroChatModal } from "./viewport/JuroChatModal";
import { JuroContextMenu } from "./viewport/JuroContextMenu";
import { JuroSpeechBubble } from "./viewport/JuroSpeechBubble";
import {
  chatWithJuro,
  computePetExpression,
  computePetActivity,
  computePetLocation,
  computePetEnvironment,
  getContextualFallbackReply,
  type PetChatContext,
} from "../../services/geminiService";

type ActiveTray = "none" | "food" | "toy" | "bath";

interface WeatherPalette {
  sky: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fillIntensity: number;
  isNight: boolean;
}

const WEATHER_PALETTES: Record<"cerah" | "hujan" | "senja" | "malam", WeatherPalette> = {
  cerah: {
    sky: "#b6dff2",
    fogDensity: 0.0055,
    sunColor: "#fff1d4",
    sunIntensity: 1.35,
    hemiSky: "#dff2ff",
    hemiGround: "#7aa85c",
    hemiIntensity: 0.68,
    fillIntensity: 0.22,
    isNight: false,
  },
  hujan: {
    sky: "#83a3b8",
    fogDensity: 0.011,
    sunColor: "#cfe0ed",
    sunIntensity: 0.82,
    hemiSky: "#acc7d9",
    hemiGround: "#527058",
    hemiIntensity: 0.62,
    fillIntensity: 0.18,
    isNight: false,
  },
  senja: {
    sky: "#e89e76",
    fogDensity: 0.0085,
    sunColor: "#ffa866",
    sunIntensity: 1.25,
    hemiSky: "#ffd0a6",
    hemiGround: "#6b5254",
    hemiIntensity: 0.56,
    fillIntensity: 0.18,
    isNight: false,
  },
  malam: {
    sky: "#131f33",
    fogDensity: 0.0135,
    sunColor: "#7ca3eb",
    sunIntensity: 0.45,
    hemiSky: "#2d446e",
    hemiGround: "#16241f",
    hemiIntensity: 0.34,
    fillIntensity: 0.1,
    isNight: true,
  },
};

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
  const isCameraDraggingRef = useRef(false);
  const cameraDragEndTimeRef = useRef(0);
  const isUserOrbitGestureRef = useRef(false);
  const didOrbitMoveRef = useRef(false);
  const orbitStartCamDistRef = useRef(0);
  const pointerGestureRef = useRef<{
    x: number;
    y: number;
    maxDist: number;
    isTouch: boolean;
    dragged: boolean;
  } | null>(null);
  const lastJuroPointerDownAtRef = useRef(0);
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
    pendingEvolutionAlert,
    clearEvolutionAlert,
    feedWithItem,
    playWithItem,
    sleep,
    wakeUp,
    recoverSleepEnergy,
    decayNightSleep,
    clean,
    lastPosition,
  } = usePetStore();
  const { addLog, addCoins, foodInventory, ownedToys, consumeFood } = useGameStore();
  const weather = useUIStore((s) => s.weather);
  const graphicsQuality = useUIStore((s) => s.graphicsQuality);
  const showToast = useUIStore((s) => s.showToast);
  const actionMenuStyle = useUIStore((s) => s.actionMenuStyle);
  const hasRegisteredName = useCaregiverStore((s) => s.hasRegisteredName);
  const partnerPet = useCaregiverStore((s) => s.partnerPet);

  const juroYawRef = useRef<number>(0);
  const [activeTray, setActiveTray] = useState<ActiveTray>("none");
  const [showStatDetails, setShowStatDetails] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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

  const juroMenuRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  const [speechBubble, setSpeechBubble] = useState<{
    text: string;
    isLoading: boolean;
    visible: boolean;
  }>({
    text: "",
    isLoading: false,
    visible: false,
  });
  const speechTimerRef = useRef<number | null>(null);
  const spontaneousTimerRef = useRef<number | null>(null);
  const isChatBusyRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
      }
      if (spontaneousTimerRef.current) {
        clearTimeout(spontaneousTimerRef.current);
      }
    };
  }, []);

  const [dragBubbles, setDragBubbles] = useState<
    { id: number; x: number; y: number; size: number; dx: number; popped?: boolean }[]
  >([]);
  const lastBubbleSpawnRef = useRef<number>(0);
  const lastBubbleSoundRef = useRef<number>(0);
  const lastInteractionSpeechAtRef = useRef<Record<string, number>>({});

  const handlePopBubble = useCallback((bubbleId: number) => {
    soundEffects.playPop();
    setDragBubbles((prev) =>
      prev.map((b) => (b.id === bubbleId ? { ...b, popped: true } : b))
    );
    setTimeout(() => {
      setDragBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 180);
  }, []);
  const savedInitialPos = usePetStore.getState().lastPosition;
  const juroWorldPosRef = useRef<THREE.Vector3>(
    savedInitialPos
      ? new THREE.Vector3(savedInitialPos.x, savedInitialPos.y, savedInitialPos.z)
      : new THREE.Vector3(0, -0.45, -0.35)
  );
  const [isDraggingPet, setIsDraggingPet] = useState(false);
  const isHeadingToBedRef = useRef<boolean>(false);
  const wakeCooldownUntilRef = useRef<number>(0);
  const isDizzyRef = useRef<boolean>(false);
  const [cameraMode] = useState<CameraMode>("follow");

  // Bench sitting interaction state & refs
  const [isBenchMenuOpen, setIsBenchMenuOpen] = useState(false);
  const [isSittingOnBench, setIsSittingOnBench] = useState(false);
  const isHeadingToBenchRef = useRef<boolean>(false);

  // Trampoline interaction state & refs
  const [isTrampolineMenuOpen, setIsTrampolineMenuOpen] = useState(false);
  const [isBouncingOnTrampoline, setIsBouncingOnTrampoline] = useState(false);
  const isHeadingToTrampolineRef = useRef<boolean>(false);

  // Coarse UI states (only change on discrete state flips — NEVER on pointermove pixels!)
  const [dragVisual, setDragVisual] = useState<DragVisualState | null>(null);
  const [soapBadgePercent, setSoapBadgePercent] = useState(0);
  const [walkCommand, setWalkCommand] = useState<WalkCommand | null>(null);

  const [isSoftwareGl, setIsSoftwareGl] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const graphicsProfile = useMemo(
    () =>
      resolveGraphicsProfile(
        graphicsQuality,
        readGraphicsEnvironment({
          isSoftwareRenderer: isSoftwareGl,
          viewportWidth,
        })
      ),
    [graphicsQuality, isSoftwareGl, viewportWidth]
  );

  // Real-time local clock tracking for automatic day/night nature atmosphere
  const [now, setNow] = useState(() => new Date());
  const isNightSleep = isBedtimeHour(now);

  const handleBedArrival = useCallback(() => {
    isHeadingToBedRef.current = false;
    if (usePetStore.getState().currentState !== "sleep") {
      sleep();
      soundEffects.playSleep();
      addLog("sleep", "Juro sampai di sofa tidurnya dan mulai tidur lelap.");
      useCaregiverStore.getState().recordAction(
        "sleep",
        "Menidurkan Juro di sofa empuk untuk beristirahat.",
        { energy: 35 }
      );
    }
  }, [sleep, addLog]);

  const handlePetPointerDown = useCallback(() => {
    lastJuroPointerDownAtRef.current = Date.now();
  }, []);

  const handlePetClick = useCallback(
    (screenPos?: { x: number; y: number }) => {
      // Guard: Ignore only if user genuinely dragged/zoomed the camera beyond tap threshold
      if (isCameraDraggingRef.current || Date.now() - cameraDragEndTimeRef.current < 160) {
        return;
      }

      // Stop any active walking so Juro pauses and interacts with player
      isHeadingToBedRef.current = false;
      isHeadingToBenchRef.current = false;
      isHeadingToTrampolineRef.current = false;
      setWalkCommand(null);

      // Dismiss active speech bubble immediately so menu takes priority
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }
      setSpeechBubble({ visible: false, text: "", isLoading: false });

      if (actionMenuStyle === "floating") {
        setShowStatDetails(false);
        setActiveTray("none");

        if (juroMenu.open) {
          soundEffects.playDismiss();
          setJuroMenu((prev) => ({ ...prev, open: false }));
          return;
        }

        soundEffects.playPop();

        const contRect = containerRef.current?.getBoundingClientRect();
        const contW = contRect?.width || window.innerWidth;
        const contH = contRect?.height || window.innerHeight;

        const rawX = screenPos?.x ?? (juroScreenPosRef.current?.x ?? contW / 2);
        const rawY = screenPos?.y ?? (juroScreenPosRef.current?.headY ?? contH / 2);

        const menuEl = juroMenuRef.current;
        const menuW = menuEl?.offsetWidth || Math.min(280, contW - 24);
        const menuH = menuEl?.offsetHeight || 52;
        const halfMenuW = menuW / 2;
        const pad = 12;
        const clampedX = Math.max(halfMenuW + pad, Math.min(contW - halfMenuW - pad, rawX));

        const isNearTop = rawY < menuH + 30;
        let targetY: number;
        let clampedY: number;
        if (isNearTop) {
          targetY = rawY + 45;
          clampedY = Math.max(10, Math.min(contH - menuH - 20, targetY));
        } else {
          targetY = rawY - 14;
          clampedY = Math.max(menuH + 10, Math.min(contH - 20, targetY));
        }

        setJuroMenu({
          open: true,
          x: clampedX,
          y: clampedY,
          isNearTop,
        });
      } else {
        // "dock" style: clicking Juro directly opens chat modal cleanly
        setShowStatDetails(false);
        setActiveTray("none");
        setIsChatOpen(true);
        soundEffects.playPop();
      }
    },
    [actionMenuStyle, juroMenu.open]
  );

  const handleToggleSleep = useCallback(() => {
    if (isSittingOnBench) setIsSittingOnBench(false);
    if (isBouncingOnTrampoline) setIsBouncingOnTrampoline(false);
    isHeadingToBenchRef.current = false;
    isHeadingToTrampolineRef.current = false;
    setIsBenchMenuOpen(false);
    setIsTrampolineMenuOpen(false);
    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      if (isNightSleep && energy < 35) {
        showToast("Juro masih mengantuk dan butuh tidur penuh", "info");
      }
      addLog("interaction", "Juro bangun dari waktu istirahatnya.");
      useCaregiverStore.getState().recordAction(
        "wake",
        "Membangunkan Juro dari tidurnya.",
        {}
      );
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    } else {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_SLOT_1.x, z: JURO_BED_SLOT_1.z, nonce: Date.now() });
      addLog("sleep", "Juro berjalan menuju sofa untuk tidur lelap.");
      useCaregiverStore.getState().recordAction(
        "sleep",
        "Menuntun Juro tidur di sofa empuk.",
        { energy: 35 }
      );
      soundEffects.playClick();
      // If Juro is already resting or near the sofa bed (<0.85m), immediately trigger sleep!
      if (juroWorldPosRef.current) {
        const distToSlot = Math.hypot(
          juroWorldPosRef.current.x - JURO_BED_SLOT_1.x,
          juroWorldPosRef.current.z - JURO_BED_SLOT_1.z
        );
        const distToCenter = Math.hypot(
          juroWorldPosRef.current.x - JURO_BED_POS.x,
          juroWorldPosRef.current.z - JURO_BED_POS.z
        );
        if (distToSlot < 0.85 || distToCenter < 0.85) {
          handleBedArrival();
        }
      }
    }
    setActiveTray("none");
  }, [currentState, wakeUp, addLog, isSittingOnBench, isBouncingOnTrampoline, handleBedArrival, isNightSleep, energy, showToast]);

  const handleBedClick = useCallback(() => {
    if (currentState === "sleep") {
      handlePetClick();
    } else {
      handleToggleSleep();
    }
  }, [currentState, handlePetClick, handleToggleSleep]);

  const handleOpenShopFromMap = useCallback(() => {
    if (isSittingOnBench) setIsSittingOnBench(false);
    if (isBouncingOnTrampoline) setIsBouncingOnTrampoline(false);
    isHeadingToBenchRef.current = false;
    isHeadingToTrampolineRef.current = false;
    setIsBenchMenuOpen(false);
    setIsTrampolineMenuOpen(false);
    setIsChatOpen(false);
    setJuroMenu((prev) => ({ ...prev, open: false }));
    soundEffects.playClick();
    navigate("/shop");
  }, [isSittingOnBench, isBouncingOnTrampoline, navigate]);

  const handleOpenMineFromMap = useCallback(() => {
    if (isSittingOnBench) setIsSittingOnBench(false);
    if (isBouncingOnTrampoline) setIsBouncingOnTrampoline(false);
    isHeadingToBenchRef.current = false;
    isHeadingToTrampolineRef.current = false;
    setIsBenchMenuOpen(false);
    setIsTrampolineMenuOpen(false);
    setIsChatOpen(false);
    setJuroMenu((prev) => ({ ...prev, open: false }));
    soundEffects.playClick();
    navigate("/mine");
  }, [isSittingOnBench, isBouncingOnTrampoline, navigate]);

  // Dismiss open trays / stat popover / bench menu / trampoline menu / Speech Bubble / Chat / Juro Menu on Escape key
  useEffect(() => {
    if (
      activeTray === "none" &&
      !showStatDetails &&
      !isBenchMenuOpen &&
      !isTrampolineMenuOpen &&
      !speechBubble.visible &&
      !isChatOpen &&
      !juroMenu.open
    )
      return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTray("none");
        setShowStatDetails(false);
        setIsBenchMenuOpen(false);
        setIsTrampolineMenuOpen(false);
        setIsChatOpen(false);
        setJuroMenu((prev) => ({ ...prev, open: false }));
        setSpeechBubble((s) => ({ ...s, visible: false }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTray, showStatDetails, isBenchMenuOpen, isTrampolineMenuOpen, speechBubble.visible, isChatOpen, juroMenu.open]);

  // Dynamically assemble pet context: activities, emotions, sensations & environmental state
  const getLiveChatContext = useCallback(
    (isSpontaneous = false): PetChatContext => {
      const petState = usePetStore.getState();
      const currentHour = new Date().getHours();
      const normW = normalizeWeather(weather);
      const isNight =
        normW === "malam" ||
        (normW === "cerah"
          ? false
          : normW === "senja"
          ? false
          : currentHour >= 19 || currentHour < 6);
      const isNightSleepy = isBedtimeHour();
      const isDizzy = isDizzyRef.current;
      const isSleeping = petState.currentState === "sleep";
      const isBathing =
        bathStateRef.current.isScrubbing ||
        bathStateRef.current.isRinsing ||
        bathStateRef.current.soapLevel > 0;
      const isEating = petState.currentState === "eating";
      const isPlaying = petState.currentState === "play";
      const isDragging = isDraggingPet || petState.currentState === "dragging";

      const lastX = petState.lastPosition?.x ?? 0;
      const lastZ = petState.lastPosition?.z ?? 0;
      const inWater = isWaterAt(lastX, lastZ);

      const cognitiveTier = getCognitiveTier(petState.level);
      const emotionalState = computePetEmotionalState(
        {
          hunger: petState.hunger,
          energy: petState.energy,
          cleanliness: petState.cleanliness,
          happiness: petState.happiness,
          affection: petState.affection,
        },
        {
          currentState: petState.currentState,
          isDizzy,
          isSleeping,
          isBathing,
          isEating,
          isPlaying,
          isSittingOnBench,
          isInWater: inWater,
          isRaining: isRainingWeather(weather),
          isNight,
          isNightSleepy,
          level: petState.level,
        }
      );

      const expression = computePetExpression({
        hunger: petState.hunger,
        energy: petState.energy,
        cleanliness: petState.cleanliness,
        happiness: petState.happiness,
        affection: petState.affection,
        isDizzy,
        isSleeping,
        isNightSleepy,
      });

      const currentActivity = computePetActivity({
        currentState: petState.currentState,
        isSleeping,
        isEating,
        isBathing,
        isPlaying,
        isDragging,
        isDizzy,
        isSittingOnBench,
        isBouncingOnTrampoline,
        isInWater: inWater,
        currentFoodName: petState.currentFoodBeingEaten?.name,
        currentToyName: petState.currentToyBeingPlayed?.name,
      });

      const loc = computePetLocation({
        isSittingOnBench,
        isBouncingOnTrampoline,
        isInWater: inWater,
        isSleeping,
        currentState: petState.currentState,
        position: { x: lastX, z: lastZ },
      });

      const ambient = computePetEnvironment({
        isRaining: isRainingWeather(weather),
        isNight,
        isNightSleepy,
      });

      return {
        name: petState.name,
        hunger: petState.hunger,
        energy: petState.energy,
        cleanliness: petState.cleanliness,
        happiness: petState.happiness,
        affection: petState.affection,
        currentState: petState.currentState,
        level: petState.level,
        expression,
        currentActivity,
        currentFoodName: petState.currentFoodBeingEaten?.name,
        currentToyName: petState.currentToyBeingPlayed?.name,
        isSleeping,
        isBathing,
        isEating,
        isPlaying,
        isDragging,
        isDizzy,
        isNight,
        isNightSleepy,
        isRaining: isRainingWeather(weather),
        isSittingOnBench,
        isInWater: inWater,
        isSpontaneous,
        cognitiveTier,
        emotionalState,
        caregiverRelationship: useCaregiverStore.getState().getCaregiverRelationship(),
        locationName: loc.locationName,
        locationDescription: loc.locationDescription,
        ambientDescription: ambient,
      };
    },
    [weather, isDraggingPet, isSittingOnBench, isBouncingOnTrampoline]
  );

  // AI Pet Chat message handler (triggers Gemini API or fallback & shows speech bubble)
  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      setIsChatOpen(false);
      setJuroMenu((prev) => ({ ...prev, open: false }));

      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }

      setSpeechBubble({
        text: "",
        isLoading: true,
        visible: true,
      });

      soundEffects.playPop();

      try {
        const context = getLiveChatContext(false);
        const reply = await chatWithJuro(userMessage, context);

        setSpeechBubble({
          text: reply,
          isLoading: false,
          visible: true,
        });

        soundEffects.playHappy();

        speechTimerRef.current = window.setTimeout(() => {
          setSpeechBubble((prev) => ({ ...prev, visible: false }));
        }, 8000);
      } catch {
        const fallbackContext = getLiveChatContext(false);
        setSpeechBubble({
          text: fallbackContext.isSleeping
            ? "Juro sedang beristirahat dengan tenang di tempat tidurnya."
            : "Juro sedang bersantai di padang rumput lembah.",
          isLoading: false,
          visible: true,
        });
        speechTimerRef.current = window.setTimeout(() => {
          setSpeechBubble((prev) => ({ ...prev, visible: false }));
        }, 6000);
      }
    },
    [getLiveChatContext]
  );

  // Autonomous spontaneous chatter (Juro randomly blurts out cute thoughts based on his activity)
  const triggerSpontaneousChatter = useCallback(async () => {
    if (
      juroMenu.open ||
      isChatOpen ||
      speechBubble.visible ||
      speechBubble.isLoading ||
      isDraggingPet ||
      isChatBusyRef.current
    ) {
      return;
    }

    isChatBusyRef.current = true;
    try {
      const context = getLiveChatContext(true);
      const reply = await chatWithJuro("", context);

      setSpeechBubble({
        text: reply,
        isLoading: false,
        visible: true,
      });
      soundEffects.playPop();

      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = window.setTimeout(() => {
        setSpeechBubble((prev) => ({ ...prev, visible: false }));
      }, 7500);
    } catch {
      // Ignored for background spontaneous chatter
    } finally {
      isChatBusyRef.current = false;
    }
  }, [
    juroMenu.open,
    isChatOpen,
    speechBubble.visible,
    speechBubble.isLoading,
    isDraggingPet,
    getLiveChatContext,
  ]);

  // Dynamic situational interaction speech (when fed, played with, bathed, or petted)
  const triggerInteractionSpeech = useCallback(
    async (
      interaction: "feed" | "play" | "bath_scrub" | "bath_rinse" | "pet",
      detail?: { food?: FoodItem; toy?: ToyItem }
    ) => {
      setIsBenchMenuOpen(false);

      // Don't interrupt if user is actively in chat or if busy
      if (speechBubble.isLoading) return;

      // Throttle rapid repeated triggers of the same interaction type
      const now = Date.now();
      const lastTrigger = lastInteractionSpeechAtRef.current[interaction] ?? 0;
      const cooldownMs =
        interaction === "feed" || interaction === "play" || interaction === "bath_rinse"
          ? 3500
          : 9000;
      if (now - lastTrigger < cooldownMs) return;
      lastInteractionSpeechAtRef.current[interaction] = now;

      const baseContext = getLiveChatContext(true);
      const context: PetChatContext = {
        ...baseContext,
        isEating: interaction === "feed",
        isPlaying: interaction === "play",
        isBathing: interaction === "bath_scrub" || interaction === "bath_rinse",
        isPetting: interaction === "pet",
        currentFoodName: detail?.food?.name ?? baseContext.currentFoodName,
        currentToyName: detail?.toy?.name ?? baseContext.currentToyName,
        interactionType: interaction,
      };

      const promptInstruction =
        interaction === "feed"
          ? `[REAKSI MAKAN]: Kamu baru saja memakan ${detail?.food?.name || "makanan"}. Sampaikan tanggapan yang sopan dan bersyukur di ${context.locationName}.`
          : interaction === "play"
          ? `[REAKSI MAIN]: Kamu baru saja bermain ${detail?.toy?.name || "mainan favorit"}. Sampaikan tanggapan yang ramah dan menyenangkan di ${context.locationName}.`
          : interaction === "bath_scrub"
          ? `[REAKSI MANDI SABUN]: Tubuhmu sedang dibersihkan dengan sabun. Sampaikan tanggapan bahwa tubuhmu terasa bersih dan segar di ${context.locationName}.`
          : interaction === "bath_rinse"
          ? `[REAKSI BILAS AIR]: Kamu selesai dibilas air bersih. Sampaikan tanggapan segar dan siap melanjutkan aktivitas.`
          : `[REAKSI DIELUS]: Pengguna sedang menyapamu dengan ramah. Sampaikan respons yang sopan, hangat, dan bersahabat di ${context.locationName}.`;

      try {
        const reply = await chatWithJuro(promptInstruction, context);
        setSpeechBubble({
          text: reply,
          isLoading: false,
          visible: true,
        });
        soundEffects.playPop();

        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        speechTimerRef.current = window.setTimeout(() => {
          setSpeechBubble((prev) => ({ ...prev, visible: false }));
        }, 7500);
      } catch {
        const fallback = getContextualFallbackReply(context, promptInstruction);
        setSpeechBubble({
          text: fallback,
          isLoading: false,
          visible: true,
        });
        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        speechTimerRef.current = window.setTimeout(() => {
          setSpeechBubble((prev) => ({ ...prev, visible: false }));
        }, 6500);
      }
    },
    [speechBubble.isLoading, getLiveChatContext]
  );

  // Keep Juro Context Menu smoothly anchored above Juro's head during animations/walking
  useEffect(() => {
    if (!juroMenu.open || actionMenuStyle !== "floating") return;
    let animId: number;
    const update = () => {
      if (juroMenuRef.current && juroScreenPosRef.current && containerRef.current) {
        const contRect = containerRef.current.getBoundingClientRect();
        const pos = juroScreenPosRef.current;
        const contW = contRect.width || window.innerWidth;
        const contH = contRect.height || window.innerHeight;

        const menuEl = juroMenuRef.current;
        const menuW = menuEl.offsetWidth || Math.min(280, contW - 24);
        const menuH = menuEl.offsetHeight || 52;
        const halfMenuW = menuW / 2;
        const pad = 12;
        const clampedX = Math.max(halfMenuW + pad, Math.min(contW - halfMenuW - pad, pos.x));

        const crownY = pos.headY ?? (pos.y - pos.radiusPx);
        const isNearTop = crownY < menuH + 30;
        let targetY: number;
        let clampedY: number;
        if (isNearTop) {
          targetY = crownY + 45;
          clampedY = Math.max(10, Math.min(contH - menuH - 20, targetY));
        } else {
          targetY = crownY - 14;
          clampedY = Math.max(menuH + 10, Math.min(contH - 20, targetY));
        }

        juroMenuRef.current.style.left = `${clampedX}px`;
        juroMenuRef.current.style.top = `${clampedY}px`;

        if (tailRef.current) {
          const menuLeft = clampedX - halfMenuW;
          const tailOffset = pos.x - menuLeft;
          const clampedTailOffset = Math.max(20, Math.min(menuW - 20, tailOffset));
          tailRef.current.style.left = `${clampedTailOffset}px`;
        }
      }
      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, [juroMenu.open, actionMenuStyle]);

  // Dismiss Juro menu when tapping/clicking outside (skip if pointerdown landed on Juro so click toggles cleanly)
  useEffect(() => {
    if (!juroMenu.open || actionMenuStyle !== "floating") return;
    const onWindowPointer = (e: Event) => {
      if (Date.now() - lastJuroPointerDownAtRef.current < 80) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-juro-menu="true"]') || juroMenuRef.current?.contains(target)) {
        return;
      }
      setJuroMenu((prev) => ({ ...prev, open: false }));
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", onWindowPointer);
    }, 80);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onWindowPointer);
    };
  }, [juroMenu.open, actionMenuStyle]);

  // Autonomous Spontaneous Chatter Loop (every 24 - 50 seconds randomly)
  useEffect(() => {
    let isCancelled = false;

    const scheduleNextChatter = () => {
      const delay = 24000 + Math.random() * 26000;
      spontaneousTimerRef.current = setTimeout(async () => {
        if (isCancelled) return;
        await triggerSpontaneousChatter();
        if (!isCancelled) {
          scheduleNextChatter();
        }
      }, delay);
    };

    scheduleNextChatter();

    return () => {
      isCancelled = true;
      if (spontaneousTimerRef.current) {
        clearTimeout(spontaneousTimerRef.current);
      }
    };
  }, [triggerSpontaneousChatter]);

  // Dismiss bench menu when tapping/clicking outside (supporting both mouse and touch)
  useEffect(() => {
    if (!isBenchMenuOpen) return;
    const onWindowPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-bench-menu="true"]')) {
        return;
      }
      setIsBenchMenuOpen(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", onWindowPointer);
    }, 80);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onWindowPointer);
    };
  }, [isBenchMenuOpen]);

  // Dismiss trampoline menu when tapping/clicking outside (supporting both mouse and touch)
  useEffect(() => {
    if (!isTrampolineMenuOpen) return;
    const onWindowPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-trampoline-menu="true"]')) {
        return;
      }
      setIsTrampolineMenuOpen(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", onWindowPointer);
    }, 80);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onWindowPointer);
    };
  }, [isTrampolineMenuOpen]);

  // Dismiss speech bubble when tapping/clicking outside (matching behavior of other menus)
  useEffect(() => {
    if (!speechBubble.visible) return;
    const onWindowPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-speech-bubble="true"]')) {
        return;
      }
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }
      setSpeechBubble((s) => ({ ...s, visible: false }));
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", onWindowPointer);
    }, 120);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onWindowPointer);
    };
  }, [speechBubble.visible]);

  // Track genuine screen-pixel pointer drags so micro tap tremor never blocks clicking Juro
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      pointerGestureRef.current = {
        x: e.clientX,
        y: e.clientY,
        maxDist: 0,
        isTouch: e.pointerType === "touch",
        dragged: false,
      };
      isCameraDraggingRef.current = false;
    };

    const onMove = (e: PointerEvent) => {
      const g = pointerGestureRef.current;
      if (!g) return;
      const dist = Math.hypot(e.clientX - g.x, e.clientY - g.y);
      if (dist > g.maxDist) g.maxDist = dist;
      const threshold = g.isTouch ? 22 : 12;
      if (!g.dragged && g.maxDist > threshold) {
        g.dragged = true;
        didOrbitMoveRef.current = true;
        isCameraDraggingRef.current = true;
        cameraDragEndTimeRef.current = Date.now();
        setIsBenchMenuOpen(false);
        setIsTrampolineMenuOpen(false);
        setJuroMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
      }
    };

    const onUp = () => {
      if (pointerGestureRef.current?.dragged || didOrbitMoveRef.current) {
        cameraDragEndTimeRef.current = Date.now();
      }
      pointerGestureRef.current = null;
      isCameraDraggingRef.current = false;
    };

    el.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // Track genuine user OrbitControls pinch/zoom or confirmed drag gestures only
  const handleOrbitStart = useCallback(() => {
    const controls = controlsRef.current;
    isUserOrbitGestureRef.current = true;
    didOrbitMoveRef.current = false;
    if (controls) {
      orbitStartCamDistRef.current = controls.object.position.distanceTo(controls.target);
    }
  }, []);

  const handleOrbitChange = useCallback(() => {
    if (!isUserOrbitGestureRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const currDist = controls.object.position.distanceTo(controls.target);
    const zoomChanged = Math.abs(currDist - orbitStartCamDistRef.current) > 0.45;
    const pointerDragged = pointerGestureRef.current?.dragged ?? false;

    if (pointerDragged || zoomChanged) {
      didOrbitMoveRef.current = true;
      isCameraDraggingRef.current = true;
      cameraDragEndTimeRef.current = Date.now();
      setIsBenchMenuOpen(false);
      setIsTrampolineMenuOpen(false);
      setJuroMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
    }
  }, []);

  const handleOrbitEnd = useCallback(() => {
    if (didOrbitMoveRef.current) {
      cameraDragEndTimeRef.current = Date.now();
    }
    isUserOrbitGestureRef.current = false;
    isCameraDraggingRef.current = false;
    didOrbitMoveRef.current = false;
  }, []);

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
    if (dragging) {
      setIsSittingOnBench(false);
      setIsBouncingOnTrampoline(false);
      isHeadingToBenchRef.current = false;
      isHeadingToTrampolineRef.current = false;
      setIsBenchMenuOpen(false);
      setIsTrampolineMenuOpen(false);
    }
    setIsDraggingPet(dragging);
  }, []);

  // Auto-grant level-up coin bonus and show compact toast for standard levels
  useEffect(() => {
    if (recentlyLeveledUp) {
      clearLevelUpAlert();
      addCoins(25);
      addLog("interaction", `Juro mencapai Level ${level}! Bonus +25 koin otomatis ditambahkan.`);
      useCaregiverStore.getState().recordAction(
        "interaction",
        `Juro mencapai Level ${level}! (+25 Koin Bonus)`,
        { coins: 25 }
      );
      if (!pendingEvolutionAlert) {
        showToast(`Level Up! Juro mencapai Level ${level} (+25 Koin)`, "success");
      }
    }
  }, [recentlyLeveledUp, clearLevelUpAlert, addCoins, addLog, level, pendingEvolutionAlert, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Gentle ongoing sleep recovery while Juro stays asleep (fills up to 100% full sleep)
  useEffect(() => {
    if (currentState !== "sleep") return;
    const timer = setInterval(() => {
      recoverSleepEnergy(3);
    }, 2500);
    return () => clearInterval(timer);
  }, [currentState, recoverSleepEnergy]);

  // Nighttime sleep depletion: if awake at night (21:00 - 06:00), sleep stat steadily decreases
  useEffect(() => {
    if (!isNightSleep || currentState === "sleep") return;
    const timer = setInterval(() => {
      decayNightSleep(2);
    }, 7000);
    return () => clearInterval(timer);
  }, [isNightSleep, currentState, decayNightSleep]);

  const normalizedWeather = normalizeWeather(weather);
  const activePhase: TimePhase = useMemo(() => {
    if (normalizedWeather === "malam") return "night";
    if (normalizedWeather === "senja") return "sunset";
    return getTimePhaseFromDate(now);
  }, [normalizedWeather, now]);
  const activeTheme = TIME_THEMES[activePhase];
  const activePalette = WEATHER_PALETTES[normalizedWeather];

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
    [consumeFood, feedWithItem, addLog, setActiveTray, triggerInteractionSpeech]
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
    [playWithItem, addLog, setActiveTray, triggerInteractionSpeech]
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
      "Memandikan dan membilas Juro hingga bersih berkilau dan wangi!",
      { cleanliness: 35, happiness: 8 }
    );
    hadMeaningfulSoapRef.current = false;
    setSoapBadgePercent(0);
    triggerInteractionSpeech("bath_rinse");
  }, [clean, addLog, triggerInteractionSpeech]);

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

      // Real-time bubble blowing while dragging Bubble Wand!
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

          // Wand tip offset (near top-right of 60px dragged ghost)
          const wandTipX = relX + 24;
          const wandTipY = relY - 22;

          setDragBubbles((prev) => [
            ...prev.slice(-20),
            { id: bubbleId, x: wandTipX, y: wandTipY, size, dx },
          ]);

          if (now - lastBubbleSoundRef.current > 150) {
            lastBubbleSoundRef.current = now;
            soundEffects.playBubble();
          }

          setTimeout(() => {
            setDragBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
          }, 1900);
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

      const totalDist = Math.hypot(finalMeta.x - finalMeta.startX, finalMeta.y - finalMeta.startY);
      const isTap = totalDist < 28 || !finalMeta.moved;

      if (finalMeta.moved && !finalMeta.overJuro && !isTap && finalMeta.payload.kind !== "toy") {
        soundEffects.playDrop();
      }

      // Food & Toy support BOTH manual drag-and-drop onto Juro AND quick tap (or throwing toy anywhere)
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
  ]);

  // Synchronize camera reset triggered globally from Navbar
  const cameraResetNonce = useUIStore((s) => s.cameraResetNonce);
  useEffect(() => {
    if (cameraResetNonce === 0) return;
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [cameraResetNonce]);

  const handleBenchArrival = useCallback(() => {
    isHeadingToBenchRef.current = false;
    setIsSittingOnBench(true);
    soundEffects.playPlop();
    addLog("interaction", "Juro duduk dengan santai di kursi taman sambil menikmati pemandangan.");
    usePetStore.setState((s) => ({
      energy: Math.min(100, s.energy + 10),
      affection: Math.min(100, s.affection + 5),
    }));
    useCaregiverStore.getState().recordAction(
      "interaction",
      "Duduk santai di bangku taman menikmati pemandangan bukit.",
      { energy: 10, affection: 5 },
      "Bangku Taman"
    );
  }, [addLog]);

  const handleBenchClick = useCallback(() => {
    setShowStatDetails(false);
    setActiveTray("none");
    setIsChatOpen(false);
    setIsTrampolineMenuOpen(false);

    if (isBenchMenuOpen) {
      soundEffects.playDismiss();
      setIsBenchMenuOpen(false);
      return;
    }

    soundEffects.playPop();
    setIsBenchMenuOpen(true);
  }, [isBenchMenuOpen]);

  const handleSitOnBench = useCallback(() => {
    soundEffects.playClick();
    setIsBenchMenuOpen(false);
    setIsTrampolineMenuOpen(false);
    isHeadingToBenchRef.current = true;
    setIsSittingOnBench(false);
    setIsBouncingOnTrampoline(false);
    isHeadingToTrampolineRef.current = false;

    if (usePetStore.getState().currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      addLog("interaction", "Juro terbangun untuk duduk santai di kursi taman.");
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    }

    setWalkCommand({ x: JURO_BENCH_POS.x, z: JURO_BENCH_POS.z, nonce: Date.now() });
    addLog("interaction", "Juro berjalan menuju kursi taman untuk duduk santai.");
  }, [addLog, wakeUp]);

  const handleStandFromBench = useCallback(() => {
    soundEffects.playClick();
    setIsBenchMenuOpen(false);
    setIsSittingOnBench(false);
    isHeadingToBenchRef.current = false;
    soundEffects.playPlop();
    // Walk to clear terrace ground directly in front of the bench
    setWalkCommand({ x: 6.0, z: 18.2, nonce: Date.now() });
    addLog("interaction", "Juro berdiri dari kursi taman dan kembali menjelajah.");
  }, [addLog]);

  const handleTrampolineArrival = useCallback(() => {
    setIsBouncingOnTrampoline(true);
    soundEffects.playBoing();
    addLog("play", "Juro sampai di trampolin jamur dan mulai melatih ketangkasannya.");
    usePetStore.setState((s) => ({
      happiness: Math.min(100, s.happiness + 15),
      affection: Math.min(100, s.affection + 6),
    }));
    useCaregiverStore.getState().recordAction(
      "play",
      "Bermain di atas trampolin jamur.",
      { happiness: 15, affection: 6 },
      "Trampolin Jamur"
    );
  }, [addLog]);

  // Keep refs active until the respective React state renders true to prevent 1-frame race conditions
  useEffect(() => {
    if (isBouncingOnTrampoline) {
      isHeadingToTrampolineRef.current = false;
    }
  }, [isBouncingOnTrampoline]);

  useEffect(() => {
    if (isSittingOnBench) {
      isHeadingToBenchRef.current = false;
    }
  }, [isSittingOnBench]);

  useEffect(() => {
    if (currentState === "sleep") {
      isHeadingToBedRef.current = false;
    }
  }, [currentState]);

  const handleTrampolineClick = useCallback(() => {
    setShowStatDetails(false);
    setActiveTray("none");
    setIsChatOpen(false);
    setIsBenchMenuOpen(false);

    if (isTrampolineMenuOpen) {
      soundEffects.playDismiss();
      setIsTrampolineMenuOpen(false);
      return;
    }

    soundEffects.playPop();
    setIsTrampolineMenuOpen(true);
  }, [isTrampolineMenuOpen]);

  const handleStartBounce = useCallback(() => {
    soundEffects.playClick();
    setIsTrampolineMenuOpen(false);
    setIsBenchMenuOpen(false);
    if (isSittingOnBench) setIsSittingOnBench(false);
    isHeadingToBenchRef.current = false;
    isHeadingToTrampolineRef.current = true;
    setIsBouncingOnTrampoline(false);

    if (usePetStore.getState().currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      addLog("interaction", "Juro bangun dan bersiap menuju trampolin jamur.");
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    }

    setWalkCommand({ x: JURO_TRAMPOLINE_POS.x, z: JURO_TRAMPOLINE_POS.z, nonce: Date.now() });
    addLog("play", "Juro berjalan menuju trampolin jamur untuk bermain.");
  }, [addLog, isSittingOnBench, wakeUp]);

  const handleStopBounce = useCallback(() => {
    soundEffects.playClick();
    setIsTrampolineMenuOpen(false);
    setIsBouncingOnTrampoline(false);
    isHeadingToTrampolineRef.current = false;
    soundEffects.playPlop();
    // Walk to clear open meadow trail safely in front of the trampoline
    setWalkCommand({ x: JURO_TRAMPOLINE_POS.x, z: JURO_TRAMPOLINE_POS.z + 1.35, nonce: Date.now() });
    addLog("interaction", "Juro selesai bermain trampolin dan melangkah kembali ke padang rumput.");
  }, [addLog]);

  const handleMenuAction = useCallback(
    (action: "food" | "toy" | "sleep" | "bath") => {
      if (isSittingOnBench) setIsSittingOnBench(false);
      if (isBouncingOnTrampoline) setIsBouncingOnTrampoline(false);
      isHeadingToBenchRef.current = false;
      isHeadingToTrampolineRef.current = false;
      setIsBenchMenuOpen(false);
      setIsTrampolineMenuOpen(false);
      setJuroMenu((prev) => ({ ...prev, open: false }));
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
      }
    },
    [isSittingOnBench, isBouncingOnTrampoline, handleToggleSleep]
  );

  // Gentle ambient raindrop sound while pixel rain is falling
  useEffect(() => {
    if (!isRainingWeather(weather)) return;
    const interval = setInterval(() => {
      soundEffects.playRainDrop();
    }, 2800);
    return () => clearInterval(interval);
  }, [weather]);

  // Circadian rhythm controller: sleep at 21:00 - 06:00, wake at 06:00
  const prevHourRef = useRef<number>(now.getHours());

  useEffect(() => {
    const prevHour = prevHourRef.current;
    const currentHour = now.getHours();
    prevHourRef.current = currentHour;

    // Detect transition crossing into morning (06:00)
    const crossedToMorning =
      (prevHour < 6 || prevHour >= 21) && currentHour >= 6 && currentHour < 10;

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

    // Daytime check: during daytime (06:00 - 20:59), do NOT automatically wake or force sleep.
    // Allow daytime naps initiated by the player!
    if (!isNightSleep) {
      return;
    }

    // 2. Nighttime bedtime (21:00 - 06:00)
    if (currentState === "sleep") {
      isHeadingToBedRef.current = false;
      return;
    }

    // If awake at night and sleep stat drops low (<= 25), Juro is exhausted and must sleep full
    if (energy <= 25) {
      wakeCooldownUntilRef.current = 0;
    }

    // If player interacted or woke Juro recently, grant temporary grace period
    if (Date.now() < wakeCooldownUntilRef.current) {
      return;
    }

    // Don't interrupt feeding or scrubbing
    if (currentState === "eating") {
      return;
    }

    // Automatically walk to bed to sleep
    if (!isHeadingToBedRef.current) {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_SLOT_1.x, z: JURO_BED_SLOT_1.z, nonce: Date.now() });
      addLog(
        "sleep",
        energy <= 25
          ? `Stat tidur Juro hampir habis (${Math.round(energy)}%). Juro butuh tidur penuh dan kembali ke kasur.`
          : `Waktu malam telah tiba (pukul ${now.getHours()}:00). Juro berjalan menuju sofa tidurnya untuk tidur pulas.`
      );
      if (juroWorldPosRef.current) {
        const distToSlot = Math.hypot(
          juroWorldPosRef.current.x - JURO_BED_SLOT_1.x,
          juroWorldPosRef.current.z - JURO_BED_SLOT_1.z
        );
        const distToCenter = Math.hypot(
          juroWorldPosRef.current.x - JURO_BED_POS.x,
          juroWorldPosRef.current.z - JURO_BED_POS.z
        );
        if (distToSlot < 0.85 || distToCenter < 0.85) {
          handleBedArrival();
        }
      }
    }
  }, [isNightSleep, currentState, now, wakeUp, addLog, handleBedArrival, energy]);

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

  const orbitEnabled = !isDraggingPet && !isDraggingTool;

  return (
    <div
      ref={containerRef}
      style={{ background: activePalette.sky }}
      className={`relative flex-1 min-h-0 w-full overflow-hidden select-none touch-none transition-all duration-700 ${
        isDraggingPet ? "cursor-grabbing" : "cursor-default"
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

      {/* Floating Radar MiniMap Widget (Top-Right, docked neatly below navbar) */}
      <div className="absolute top-3 right-3 z-30 pointer-events-auto">
        <MiniMap
          playerX={lastPosition?.x ?? 0}
          playerZ={lastPosition?.z ?? 0}
          juroWorldPosRef={juroWorldPosRef}
          juroYawRef={juroYawRef}
        />
      </div>

      {/* Partner Pet Presence Indicator in 2-Player Shared Meadow */}
      {partnerPet && (
        <div className="absolute top-[98px] sm:top-[110px] right-3 z-20 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              partnerPet.isOnline ? "bg-emerald-500" : "bg-neutral-400"
            }`}
          />
          <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200 tabular-nums">
            {partnerPet.name} · Lv.{partnerPet.level}
          </span>
        </div>
      )}

      {/* 3D Canvas with Sharp HiDPI Support, Atmospheric Sky & Adaptive Lighting */}
      <Canvas
        shadows={graphicsProfile.shadowsEnabled ? { type: THREE.PCFShadowMap } : false}
        camera={{ position: [11.5, 13.5, 13.5], fov: 42, near: 0.5, far: 180 }}
        dpr={graphicsProfile.dpr}
        onCreated={({ gl }) => {
          if (detectSoftwareWebGL(gl)) {
            setIsSoftwareGl(true);
          }
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.88,
          stencil: false,
          depth: true,
        }}
      >
        <Suspense fallback={null}>
          {/* Seamless Atmospheric Sky & Horizon Fog */}
          <color attach="background" args={[activePalette.sky]} />
          <fogExp2 attach="fog" args={[activePalette.sky, activePalette.fogDensity]} />

          {/* Living Storybook Sky: Sun, Moon, Twinkling Stars & Drifting Fluffy Clouds */}
          <StorybookSky weather={normalizedWeather} isNight={activePalette.isNight} />

          {/* Adaptive Responsive Camera Following Juro Across Valley */}
          <ResponsiveCamera
            controlsRef={controlsRef}
            targetPosRef={juroWorldPosRef}
            cameraMode={cameraMode}
          />

          {/* 3-Point Warm/Cool Storybook Lighting Rig */}
          <hemisphereLight
            args={[activePalette.hemiSky, activePalette.hemiGround, activePalette.hemiIntensity]}
          />
          <directionalLight
            position={[22, 30, 14]}
            color={activePalette.sunColor}
            intensity={activePalette.sunIntensity}
            castShadow={graphicsProfile.shadowsEnabled}
            shadow-mapSize={[graphicsProfile.shadowMapSize || 512, graphicsProfile.shadowMapSize || 512]}
            shadow-camera-near={4}
            shadow-camera-far={80}
            shadow-camera-left={-28}
            shadow-camera-right={28}
            shadow-camera-top={28}
            shadow-camera-bottom={-28}
            shadow-bias={-0.0005}
            shadow-normalBias={0.02}
          />
          <directionalLight
            position={[-20, 14, -18]}
            color="#9ec8ff"
            intensity={activePalette.fillIntensity}
          />
          {/* Soft Front Face Fill so Juro stays bright & adorable */}
          <directionalLight
            position={[-2.5, 2.0, 3.5]}
            intensity={activePalette.isNight ? 0.35 : 0.45}
            color="#FFF5EA"
          />

          {/* Outdoor Nature Environment (Interactive Landmarks: Shop, Mine Cave, Bed, Bench, Trampoline) */}
          <OutdoorEnvironment
            theme={activeTheme}
            weather={normalizedWeather}
            graphicsProfile={graphicsProfile}
            onOpenShop={handleOpenShopFromMap}
            onOpenMine={handleOpenMineFromMap}
            onBedClick={handleBedClick}
            isBenchMenuOpen={isBenchMenuOpen}
            onBenchClick={handleBenchClick}
            onSitOnBench={handleSitOnBench}
            onStandFromBench={handleStandFromBench}
            onCloseBenchMenu={() => setIsBenchMenuOpen(false)}
            isSittingOnBench={isSittingOnBench}
            isTrampolineMenuOpen={isTrampolineMenuOpen}
            onTrampolineClick={handleTrampolineClick}
            onStartBounce={handleStartBounce}
            onStopBounce={handleStopBounce}
            onCloseTrampolineMenu={() => setIsTrampolineMenuOpen(false)}
            isBouncingOnTrampoline={isBouncingOnTrampoline}
          />

          {/* Juro Pocket-Sized 3D Slime Model with Crawling, Jumping, Bathing & Elus */}
          <JuroModel
            onDraggingChange={handleDraggingPetChange}
            bathStateRef={bathStateRef}
            juroScreenPosRef={juroScreenPosRef}
            juroWorldPosRef={juroWorldPosRef}
            juroYawRef={juroYawRef}
            walkCommand={walkCommand}
            onPetClick={handlePetClick}
            onPetPointerDown={handlePetPointerDown}
            isHeadingToBedRef={isHeadingToBedRef}
            onBedArrival={handleBedArrival}
            isHeadingToBenchRef={isHeadingToBenchRef}
            onBenchArrival={handleBenchArrival}
            isSittingOnBench={isSittingOnBench}
            isHeadingToTrampolineRef={isHeadingToTrampolineRef}
            onTrampolineArrival={handleTrampolineArrival}
            isBouncingOnTrampoline={isBouncingOnTrampoline}
            isRaining={isRainingWeather(weather)}
            isDizzyRef={isDizzyRef}
            level={level}
            sphereSegments={graphicsProfile.juroSphereSegs}
            usePhysicalMaterial={graphicsProfile.usePhysicalJuroBody}
            shadowsEnabled={graphicsProfile.shadowsEnabled}
            isBlowingBubbles={
              dragVisual !== null &&
              dragVisual.moved &&
              dragVisual.payload.kind === "toy" &&
              dragVisual.payload.toy.id === "bubble-blower"
            }
            isDraggingFood={
              dragVisual !== null &&
              dragVisual.moved &&
              dragVisual.payload.kind === "food"
            }
          />

          {/* Partner's Juro 3D Slime Model in 2-Player Shared Meadow */}
          {partnerPet && (
            <JuroModel
              isPartner={true}
              customSkin={partnerPet.activeSkin}
              customHat={partnerPet.activeHat}
              level={partnerPet.level}
              partnerState={partnerPet.currentState as PetBehaviorState}
              isPartnerOnline={partnerPet.isOnline}
              initialPosition={JURO_BED_SLOT_2}
              partnerName={partnerPet.name}
              isRaining={isRainingWeather(weather)}
              sphereSegments={graphicsProfile.juroSphereSegs}
              usePhysicalMaterial={graphicsProfile.usePhysicalJuroBody}
              shadowsEnabled={graphicsProfile.shadowsEnabled}
              onPetClick={() => {
                soundEffects.playPop();
                showToast(`Menyapa ${partnerPet.name} milik ${partnerPet.ownerName}!`, "info");
                useCaregiverStore.getState().recordAction(
                  "interaction",
                  `Menyapa ${partnerPet.name} milik ${partnerPet.ownerName} yang sedang berkunjung di lembah.`,
                  { affection: 5, happiness: 5 }
                );
              }}
            />
          )}

          {/* Wide Diorama Orbit Controls — centered on Juro with cameraMode integration */}
          <OrbitControls
            ref={controlsRef}
            enabled={orbitEnabled}
            enablePan={cameraMode === "free"}
            enableZoom={true}
            enableRotate={cameraMode !== "isometric"}
            onStart={handleOrbitStart}
            onChange={handleOrbitChange}
            onEnd={handleOrbitEnd}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: cameraMode === "free" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
            }}
            minDistance={4.0}
            maxDistance={45.0}
            minPolarAngle={Math.PI * 0.12}
            maxPolarAngle={Math.PI * 0.44}
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
        isDockMode={actionMenuStyle === "dock"}
        onStartItemDrag={handleStartItemDrag}
        onDirectUse={(payload) => {
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
        }}
      />

      {/* Mode Bilah Bawah (Dock): Menu aksi & obrolan di bawah */}
      {actionMenuStyle === "dock" && (
        <>
          <ActionDock
            activeTray={activeTray}
            onSelectTray={(tray) => {
              setIsChatOpen(false);
              setActiveTray((prev) => (prev === tray ? "none" : tray));
            }}
            onToggleSleep={handleToggleSleep}
            onToggleChat={() => {
              setActiveTray("none");
              setIsChatOpen((prev) => !prev);
            }}
            isChatOpen={isChatOpen}
            currentState={currentState}
            hunger={hunger}
            energy={energy}
            happiness={happiness}
            cleanliness={cleanliness}
            totalFoodStock={totalFoodStock}
          />

          <JuroChatModal
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            onSendMessage={handleSendMessage}
            isLoading={speechBubble.isLoading}
            petName={name}
            hunger={hunger}
            energy={energy}
            cleanliness={cleanliness}
            happiness={happiness}
            isSleeping={currentState === "sleep"}
          />
        </>
      )}

      {/* Mode Melayang di Juro (Klasik): Balon menu aksi & obrolan muncul di atas tubuh Juro saat diklik */}
      {actionMenuStyle === "floating" && (
        <JuroContextMenu
          open={juroMenu.open}
          x={juroMenu.x}
          y={juroMenu.y}
          isNearTop={juroMenu.isNearTop}
          currentState={currentState}
          totalFoodStock={totalFoodStock}
          onAction={handleMenuAction}
          onSendMessage={handleSendMessage}
          isChatLoading={speechBubble.isLoading}
          menuRef={juroMenuRef}
          tailRef={tailRef}
        />
      )}

      {/* Juro's Floating Retro Speech Bubble */}
      <JuroSpeechBubble
        open={speechBubble.visible}
        text={speechBubble.text}
        isLoading={speechBubble.isLoading}
        targetPosRef={juroScreenPosRef}
        containerRef={containerRef}
        onClose={() => {
          if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
          setSpeechBubble((s) => ({ ...s, visible: false }));
        }}
        petName={name}
      />


      {/* Floating Iridescent Soap Bubbles from dragging Bubble Wand */}
      {dragBubbles.map((b) => (
        <div
          key={b.id}
          onClick={() => handlePopBubble(b.id)}
          style={
            {
              left: `${b.x}px`,
              top: `${b.y}px`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              "--bubble-dx": `${b.dx}px`,
            } as React.CSSProperties
          }
          className={`cursor-pointer absolute z-40 select-none will-change-transform ${
            b.popped ? "animate-soap-pop" : "animate-soap-bubble"
          }`}
        >
          <div className="relative w-full h-full rounded-full border border-white/70 shadow-[inset_0_0_8px_rgba(255,255,255,0.7),0_0_12px_rgba(56,189,248,0.4),inset_-3px_-3px_8px_rgba(244,114,182,0.45)] bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.92)_0%,rgba(224,242,254,0.55)_32%,rgba(244,114,182,0.35)_68%,rgba(56,189,248,0.5)_100%)]">
            {/* Glossy specular reflection highlights */}
            <div className="absolute top-[16%] left-[20%] w-[26%] h-[26%] rounded-full bg-white/95" />
            <div className="absolute bottom-[20%] right-[22%] w-[14%] h-[14%] rounded-full bg-pink-200/60" />
          </div>
        </div>
      ))}

      {/* Evolution Alert (Level 5 & Level 10 Milestones) */}
      {pendingEvolutionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-4">
          <div className="animate-tray-enter w-full max-w-xs rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl p-5 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-orange-50 dark:bg-neutral-800 border border-orange-200 dark:border-neutral-700 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 16 16" shapeRendering="crispEdges">
                {pendingEvolutionAlert.stageNumber === 2 && (
                  <>
                    <rect x="4" y="4" width="8" height="8" fill="#F97316" />
                    <rect x="3" y="6" width="10" height="5" fill="#F97316" />
                    <rect x="5" y="3" width="6" height="1" fill="#F97316" />
                    <rect x="5" y="5" width="2" height="2" fill="#FDBA74" />
                    <rect x="5" y="8" width="2" height="2" fill="#171717" />
                    <rect x="9" y="8" width="2" height="2" fill="#171717" />
                    <rect x="5" y="8" width="1" height="1" fill="#FFFFFF" />
                    <rect x="9" y="8" width="1" height="1" fill="#FFFFFF" />
                  </>
                )}
                {pendingEvolutionAlert.stageNumber === 3 && (
                  <>
                    <rect x="5" y="1" width="1" height="2" fill="#FACC15" />
                    <rect x="7" y="1" width="2" height="2" fill="#FACC15" />
                    <rect x="10" y="1" width="1" height="2" fill="#FACC15" />
                    <rect x="5" y="3" width="6" height="1" fill="#EAB308" />
                    <rect x="3" y="5" width="10" height="8" fill="#F97316" />
                    <rect x="2" y="7" width="12" height="5" fill="#F97316" />
                    <rect x="4" y="6" width="3" height="2" fill="#FDBA74" />
                    <rect x="5" y="9" width="2" height="2" fill="#171717" />
                    <rect x="9" y="9" width="2" height="2" fill="#171717" />
                    <rect x="5" y="9" width="1" height="1" fill="#FFFFFF" />
                    <rect x="9" y="9" width="1" height="1" fill="#FFFFFF" />
                  </>
                )}
              </svg>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Juro Berevolusi!
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Wujud baru:{" "}
                <span className="text-juro-orange font-semibold">
                  {pendingEvolutionAlert.stageName}
                </span>{" "}
                (Level {pendingEvolutionAlert.level})
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {pendingEvolutionAlert.stageNumber === 3
                  ? "Juro kini berukuran dewasa megah dengan mahkota emas."
                  : "Tubuh Juro membesar dan makin lincah membal."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                clearEvolutionAlert();
              }}
              className="w-full py-2.5 rounded-xl bg-juro-orange text-white text-sm font-semibold hover:bg-orange-600 active:scale-[0.98] cursor-pointer transition-all"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}
      {/* Mandatory Onboarding Name Modal for New Caregiver */}
      {!hasRegisteredName && <CaregiverOnboardingModal />}
    </div>
  );
};
