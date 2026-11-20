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
import { Heart, CloudRain, Sun, Moon } from "lucide-react";
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
import { JURO_BED_POS, JURO_BENCH_POS, isWaterAt } from "../../engine/world/mapTerrain";
import { getCognitiveTier, computePetEmotionalState } from "../../engine/ai/cognitiveCore";
import type { FoodItem, ToyItem } from "../../types/pet";
import { ResponsiveCamera } from "./viewport/ResponsiveCamera";
import { StatBars } from "./viewport/StatBars";
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
    pendingEvolutionAlert,
    clearEvolutionAlert,
    feedWithItem,
    playWithItem,
    sleep,
    wakeUp,
    recoverSleepEnergy,
    clean,
    strokePet,
  } = usePetStore();
  const { addLog, addCoins, foodInventory, ownedToys, consumeFood } = useGameStore();
  const weather = useUIStore((s) => s.weather);
  const toggleWeather = useUIStore((s) => s.toggleWeather);
  const showToast = useUIStore((s) => s.showToast);
  const actionMenuStyle = useUIStore((s) => s.actionMenuStyle);
  const hasRegisteredName = useCaregiverStore((s) => s.hasRegisteredName);

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

  const [isPettingActive, setIsPettingActive] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; dx: number }[]>([]);
  const [dragBubbles, setDragBubbles] = useState<
    { id: number; x: number; y: number; size: number; dx: number; popped?: boolean }[]
  >([]);
  const lastBubbleSpawnRef = useRef<number>(0);
  const lastBubbleSoundRef = useRef<number>(0);
  const lastInteractionSpeechAtRef = useRef<Record<string, number>>({});
  const petStrokeCountRef = useRef<number>(0);

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

  // Bench sitting interaction state & refs
  const [isBenchMenuOpen, setIsBenchMenuOpen] = useState(false);
  const [isSittingOnBench, setIsSittingOnBench] = useState(false);
  const isHeadingToBenchRef = useRef<boolean>(false);

  // Coarse UI states (only change on discrete state flips — NEVER on pointermove pixels!)
  const [dragVisual, setDragVisual] = useState<DragVisualState | null>(null);
  const [soapBadgePercent, setSoapBadgePercent] = useState(0);
  const [walkCommand, setWalkCommand] = useState<WalkCommand | null>(null);

  const handleWalkPointSelect = useCallback(
    (x: number, z: number) => {
      if (isPettingActive) {
        setIsPettingActive(false);
      }
      if (isSittingOnBench) {
        setIsSittingOnBench(false);
      }
      isHeadingToBenchRef.current = false;
      if (isBenchMenuOpen) {
        setIsBenchMenuOpen(false);
      }
      soundEffects.playGuideTap();
      setIsChatOpen(false);
      setJuroMenu((prev) => ({ ...prev, open: false }));
      setActiveTray("none");
      setShowStatDetails(false);
      setWalkCommand({ x, z, nonce: Date.now() });
    },
    [isPettingActive, isSittingOnBench, isBenchMenuOpen, setActiveTray, setShowStatDetails]
  );

  const handleOpenShopFromMap = useCallback(() => {
    if (isPettingActive) setIsPettingActive(false);
    if (isSittingOnBench) setIsSittingOnBench(false);
    isHeadingToBenchRef.current = false;
    setIsBenchMenuOpen(false);
    setIsChatOpen(false);
    setJuroMenu((prev) => ({ ...prev, open: false }));
    soundEffects.playClick();
    navigate("/shop");
  }, [isPettingActive, isSittingOnBench, navigate]);

  const handleOpenMineFromMap = useCallback(() => {
    if (isPettingActive) setIsPettingActive(false);
    if (isSittingOnBench) setIsSittingOnBench(false);
    isHeadingToBenchRef.current = false;
    setIsBenchMenuOpen(false);
    setIsChatOpen(false);
    setJuroMenu((prev) => ({ ...prev, open: false }));
    soundEffects.playClick();
    navigate("/mine");
  }, [isPettingActive, isSittingOnBench, navigate]);

  // Dismiss open trays / stat popover / bench menu / Petting Mode / Speech Bubble / Chat / Juro Menu on Escape key
  useEffect(() => {
    if (
      activeTray === "none" &&
      !showStatDetails &&
      !isBenchMenuOpen &&
      !isPettingActive &&
      !speechBubble.visible &&
      !isChatOpen &&
      !juroMenu.open
    )
      return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPettingActive) setIsPettingActive(false);
        setActiveTray("none");
        setShowStatDetails(false);
        setIsBenchMenuOpen(false);
        setIsChatOpen(false);
        setJuroMenu((prev) => ({ ...prev, open: false }));
        setSpeechBubble((s) => ({ ...s, visible: false }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTray, showStatDetails, isBenchMenuOpen, isPettingActive, speechBubble.visible, isChatOpen, juroMenu.open]);

  // Dynamically assemble pet context: activities, emotions, sensations & environmental state
  const getLiveChatContext = useCallback(
    (isSpontaneous = false): PetChatContext => {
      const petState = usePetStore.getState();
      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
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
          isPetting: isPettingActive,
          isBathing,
          isEating,
          isPlaying,
          isSittingOnBench,
          isInWater: inWater,
          isRaining: weather === "rain",
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
        isPetting: isPettingActive,
        isPlaying,
        isDragging,
        isDizzy,
        isSittingOnBench,
        isInWater: inWater,
        currentFoodName: petState.currentFoodBeingEaten?.name,
        currentToyName: petState.currentToyBeingPlayed?.name,
      });

      const loc = computePetLocation({
        isSittingOnBench,
        isInWater: inWater,
        isSleeping,
        currentState: petState.currentState,
        position: { x: lastX, z: lastZ },
      });

      const ambient = computePetEnvironment({
        isRaining: weather === "rain",
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
        isPetting: isPettingActive,
        isBathing,
        isEating,
        isPlaying,
        isDragging,
        isDizzy,
        isNight,
        isNightSleepy,
        isRaining: weather === "rain",
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
    [weather, isPettingActive, isDraggingPet, isSittingOnBench]
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
            ? "Hwaaam... Zzz... Bloop? Juro lagi mimpi rebahan di kasur empuk... Zzz..."
            : "Bloop! Juro lagi asyik bergoyang dan agak melamun nih... bloop!",
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
          ? `[REAKSI MAKAN]: Kamu baru saja memakan ${detail?.food?.name || "makanan lezat"}. Bicaralah dengan gembira sambil mengunyah sesuai kesadaran dirimu di ${context.locationName}!`
          : interaction === "play"
          ? `[REAKSI MAIN]: Kamu baru saja bermain ${detail?.toy?.name || "mainan favorit"}. Bicaralah dengan riang gembira sesuai kesadaran dirimu di ${context.locationName}!`
          : interaction === "bath_scrub"
          ? `[REAKSI MANDI SABUN]: Tubuhmu sedang disabuni dengan busa wangi buah. Bicaralah merasa geli dan segar di ${context.locationName}!`
          : interaction === "bath_rinse"
          ? `[REAKSI BILAS AIR]: Kamu selesai dibilas air sejuk lembah dan berkilau bersih. Bicaralah segar dan senang!`
          : `[REAKSI DIELUS]: Pemilikmu sedang mengelus tubuh jelimu dengan hangat. Bicaralah manja dan nyaman di ${context.locationName}!`;

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

  const handleDirectPet = useCallback(() => {
    setActiveTray("none");
    setIsChatOpen(false);
    setShowStatDetails(false);

    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      addLog("interaction", "Juro dibangunkan dengan elusan lembut.");
      useCaregiverStore.getState().recordAction("wake", "Membangunkan Juro dengan elusan lembut.", {});
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
      return;
    }

    soundEffects.playPet();
    soundEffects.playPurr();
    strokePet();
    setIsPettingActive(true);

    petStrokeCountRef.current += 1;
    if (petStrokeCountRef.current >= 3) {
      petStrokeCountRef.current = 0;
      useCaregiverStore.getState().recordAction(
        "pet",
        "Mengelus lembut tubuh jeli Juro dengan hangat.",
        { affection: 6, happiness: 4 }
      );
      triggerInteractionSpeech("pet");
    }

    const juroPos = juroScreenPosRef.current;
    if (juroPos) {
      const heartId = Date.now() + Math.random();
      const spawnX = juroPos.x + (Math.random() - 0.5) * 44;
      const spawnY = (juroPos.headY ?? (juroPos.y - juroPos.radiusPx)) - 14;
      setHearts((prev) => [
        ...prev.slice(-5),
        { id: heartId, x: spawnX, y: spawnY, dx: (Math.random() - 0.5) * 28 },
      ]);
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 850);
    }
  }, [currentState, wakeUp, strokePet, triggerInteractionSpeech, addLog]);

  const handlePetClick = useCallback(
    (screenPos?: { x: number; y: number }) => {
      // Dismiss active speech bubble if already visible
      if (speechBubble.visible) {
        if (speechTimerRef.current) {
          clearTimeout(speechTimerRef.current);
          speechTimerRef.current = null;
        }
        setSpeechBubble((s) => ({ ...s, visible: false }));
      }

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
        // "dock" style: clicking Juro directly pets or wakes Juro
        handleDirectPet();
      }
    },
    [actionMenuStyle, speechBubble.visible, juroMenu.open, handleDirectPet]
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

  // Dismiss Juro menu when tapping/clicking outside
  useEffect(() => {
    if (!juroMenu.open || actionMenuStyle !== "floating") return;
    const onWindowPointer = (e: Event) => {
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

  // Dismiss bench menu & Juro menu when user rotates or zooms camera with OrbitControls
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onOrbitStart = () => {
      setIsBenchMenuOpen(false);
      if (juroMenu.open) {
        setJuroMenu((prev) => ({ ...prev, open: false }));
      }
    };
    controls.addEventListener("start", onOrbitStart);
    return () => controls.removeEventListener("start", onOrbitStart);
  }, [juroMenu.open]);

  // Continuous pointer tracking during Direct Petting Mode
  useEffect(() => {
    if (!isPettingActive) return;
    let lastX = 0;
    let lastY = 0;
    let strokeDist = 0;
    let lastSoundAt = 0;
    let isDown = false;

    const onPointerDown = (e: PointerEvent) => {
      // Check if tap/click is outside Juro's bounding circle on screen -> finish petting!
      const juroPos = juroScreenPosRef.current;
      if (juroPos) {
        const dist = Math.hypot(e.clientX - juroPos.x, e.clientY - (juroPos.headY ?? juroPos.y));
        if (dist > juroPos.radiusPx * 1.5) {
          setIsPettingActive(false);
          return;
        }
      }
      isDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      strokeDist = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const step = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      strokeDist += step;

      if (strokeDist > 26) {
        strokeDist = 0;
        const nowMs = Date.now();
        if (nowMs - lastSoundAt > 220) {
          lastSoundAt = nowMs;
          soundEffects.playPet();
          soundEffects.playPurr();
        }
        strokePet();
        petStrokeCountRef.current += 1;
        if (petStrokeCountRef.current >= 4) {
          petStrokeCountRef.current = 0;
          useCaregiverStore.getState().recordAction(
            "pet",
            "Mengelus lembut tubuh jeli Juro dengan hangat.",
            { affection: 6, happiness: 4 }
          );
          triggerInteractionSpeech("pet");
        }

        const juroPos = juroScreenPosRef.current;
        if (juroPos) {
          const heartId = nowMs + Math.random();
          const spawnX = juroPos.x + (Math.random() - 0.5) * 44;
          const spawnY = (juroPos.headY ?? (juroPos.y - juroPos.radiusPx)) - 14;
          setHearts((prev) => [
            ...prev.slice(-5),
            { id: heartId, x: spawnX, y: spawnY, dx: (Math.random() - 0.5) * 28 },
          ]);
          setTimeout(() => {
            setHearts((prev) => prev.filter((h) => h.id !== heartId));
          }, 850);
        }
      }
    };

    const onPointerUp = () => {
      isDown = false;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isPettingActive, strokePet, triggerInteractionSpeech]);

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
      isHeadingToBenchRef.current = false;
      setIsBenchMenuOpen(false);
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
    addLog("clean", "Juro selesai disabuni dan dibilas hingga bersih berkilau!");
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

  const handleBedArrival = useCallback(() => {
    isHeadingToBedRef.current = false;
    if (usePetStore.getState().currentState !== "sleep") {
      sleep();
      soundEffects.playSleep();
      addLog("sleep", "Juro sampai di sofa tidurnya dan mulai tidur lelap. Zzz...");
      useCaregiverStore.getState().recordAction(
        "sleep",
        "Menidurkan Juro di sofa empuk untuk beristirahat.",
        { energy: 35 }
      );
    }
  }, [sleep, addLog]);

  const handleBenchArrival = useCallback(() => {
    isHeadingToBenchRef.current = false;
    setIsSittingOnBench(true);
    soundEffects.playPlop();
    addLog("interaction", "Juro duduk dengan santai di kursi taman sambil menikmati pemandangan.");
  }, [addLog]);

  const handleBenchClick = useCallback(() => {
    if (isPettingActive) setIsPettingActive(false);
    setShowStatDetails(false);
    setActiveTray("none");
    setIsChatOpen(false);

    if (isBenchMenuOpen) {
      soundEffects.playDismiss();
      setIsBenchMenuOpen(false);
      return;
    }

    soundEffects.playPop();
    setIsBenchMenuOpen(true);
  }, [isBenchMenuOpen, isPettingActive]);

  const handleSitOnBench = useCallback(() => {
    soundEffects.playClick();
    setIsBenchMenuOpen(false);
    isHeadingToBenchRef.current = true;
    setIsSittingOnBench(false);
    setWalkCommand({ x: JURO_BENCH_POS.x, z: JURO_BENCH_POS.z, nonce: Date.now() });
    addLog("interaction", "Juro berjalan menuju kursi taman untuk duduk santai.");
  }, [addLog]);

  const handleStandFromBench = useCallback(() => {
    soundEffects.playClick();
    setIsBenchMenuOpen(false);
    setIsSittingOnBench(false);
    isHeadingToBenchRef.current = false;
    soundEffects.playPlop();
    // Walk to clear ground slightly in front of the bench
    setWalkCommand({ x: 3.15, z: 1.25, nonce: Date.now() });
    addLog("interaction", "Juro berdiri dari kursi taman dan kembali menjelajah.");
  }, [addLog]);

  const handleBedClick = useCallback(() => {
    soundEffects.playClick();
    if (isSittingOnBench) setIsSittingOnBench(false);
    isHeadingToBenchRef.current = false;
    setIsBenchMenuOpen(false);
    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      addLog("interaction", "Juro dibangunkan dari sofa tidurnya.");
      useCaregiverStore.getState().recordAction(
        "wake",
        "Membangunkan Juro dari sofa tidurnya.",
        {}
      );
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    } else {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_POS.x, z: JURO_BED_POS.z, nonce: Date.now() });
      addLog("sleep", "Juro berjalan menuju sofa untuk tidur lelap.");
      useCaregiverStore.getState().recordAction(
        "sleep",
        "Menuntun Juro tidur di sofa empuk.",
        { energy: 35 }
      );
      soundEffects.playClick();
    }
  }, [currentState, wakeUp, addLog, isSittingOnBench]);

  const handleToggleSleep = useCallback(() => {
    if (isSittingOnBench) setIsSittingOnBench(false);
    isHeadingToBenchRef.current = false;
    setIsBenchMenuOpen(false);
    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      addLog("interaction", "Juro terbangun segar dari tidurnya!");
      useCaregiverStore.getState().recordAction(
        "wake",
        "Membangunkan Juro dari tidurnya.",
        {}
      );
      wakeCooldownUntilRef.current = Date.now() + 180_000;
      isHeadingToBedRef.current = false;
    } else {
      isHeadingToBedRef.current = true;
      setWalkCommand({ x: JURO_BED_POS.x, z: JURO_BED_POS.z, nonce: Date.now() });
      addLog("sleep", "Juro berjalan menuju sofa untuk tidur lelap.");
      useCaregiverStore.getState().recordAction(
        "sleep",
        "Menuntun Juro tidur di sofa empuk.",
        { energy: 35 }
      );
      soundEffects.playClick();
    }
    setActiveTray("none");
  }, [currentState, wakeUp, addLog, isSittingOnBench]);

  const handleMenuAction = useCallback(
    (action: "food" | "toy" | "sleep" | "bath" | "pet") => {
      if (isSittingOnBench) setIsSittingOnBench(false);
      isHeadingToBenchRef.current = false;
      setIsBenchMenuOpen(false);
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
        case "pet":
          soundEffects.playHappy();
          setIsPettingActive(true);
          addLog("play", "Mengelus tubuh Juro dengan penuh kasih sayang!");
          break;
      }
    },
    [isSittingOnBench, handleToggleSleep, addLog]
  );

  const handleToggleWeather = useCallback(() => {
    const nextWeather = weather === "clear" ? "rain" : "clear";
    soundEffects.playWeatherChange(nextWeather === "rain");
    toggleWeather();
    if (nextWeather === "rain") {
      addLog(
        "interaction",
        "Langit menurunkan rintik hujan yang menyejukkan. Juro memakai daun kecil sebagai payung!"
      );
    } else {
      addLog("interaction", "Awan hujan berlalu, cuaca kembali cerah dan hangat.");
    }
  }, [weather, toggleWeather, addLog]);

  // Gentle ambient raindrop sound while pixel rain is falling
  useEffect(() => {
    if (weather !== "rain") return;
    const interval = setInterval(() => {
      soundEffects.playRainDrop();
    }, 2800);
    return () => clearInterval(interval);
  }, [weather]);

  // Circadian rhythm controller: sleep at 21:00 - 06:00, wake at 06:00
  const isNightSleep = isBedtimeHour(now);
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

    // If player interacted or woke Juro recently, grant temporary grace period
    if (Date.now() < wakeCooldownUntilRef.current) {
      return;
    }

    // Don't interrupt feeding, scrubbing or petting
    if (currentState === "eating" || isPettingActive) {
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
  }, [isNightSleep, currentState, isPettingActive, now, wakeUp, addLog]);

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

  const orbitEnabled = !isPettingActive && !isDraggingPet && !isDraggingTool;

  return (
    <div
      ref={containerRef}
      style={{ background: activeTheme.skyGradient }}
      className={`relative flex-1 min-h-0 w-full overflow-hidden select-none touch-none transition-all duration-700 ${
        isPettingActive ? "cursor-grab" : isDraggingPet ? "cursor-grabbing" : "cursor-default"
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

      {/* Atmospheric Weather Indicator & Toggle Pill (Clear <-> Pixel Rain) */}
      <div className="absolute top-3 right-3 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleWeather}
          aria-label={`Ganti cuaca (saat ini: ${weather === "rain" ? "Hujan" : "Cerah"})`}
          className="h-10 inline-flex items-center gap-1.5 sm:gap-2 px-3 bg-warm-white/95 dark:bg-neutral-900/90 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange"
        >
          {weather === "rain" ? (
            <>
              <CloudRain size={14} className="text-sky-500 animate-bounce shrink-0" />
              <span className="pixel-text text-[9px] sm:text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">
                Hujan
              </span>
            </>
          ) : activeTheme.isNight ? (
            <>
              <Moon size={14} className="text-amber-300 shrink-0" />
              <span className="pixel-text text-[9px] sm:text-[10px] font-bold text-amber-500 dark:text-amber-300 uppercase">
                Malam
              </span>
            </>
          ) : (
            <>
              <Sun size={14} className="text-amber-500 shrink-0" />
              <span className="pixel-text text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                Cerah
              </span>
            </>
          )}
        </button>
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
          {/* Adaptive Responsive Camera Following Juro Across Valley */}
          <ResponsiveCamera controlsRef={controlsRef} targetPosRef={juroWorldPosRef} />

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
            weather={weather}
            onWalkPointSelect={handleWalkPointSelect}
            walkCommand={walkCommand}
            onOpenShop={handleOpenShopFromMap}
            onOpenMine={handleOpenMineFromMap}
            onBedClick={handleBedClick}
            isBenchMenuOpen={isBenchMenuOpen}
            onBenchClick={handleBenchClick}
            onSitOnBench={handleSitOnBench}
            onStandFromBench={handleStandFromBench}
            onCloseBenchMenu={() => setIsBenchMenuOpen(false)}
            isSittingOnBench={isSittingOnBench}
          />

          {/* Juro Pocket-Sized 3D Slime Model with Crawling, Jumping, Bathing & Elus */}
          <JuroModel
            onDraggingChange={handleDraggingPetChange}
            bathStateRef={bathStateRef}
            juroScreenPosRef={juroScreenPosRef}
            juroWorldPosRef={juroWorldPosRef}
            walkCommand={walkCommand}
            onPetClick={handlePetClick}
            isPettingActive={isPettingActive}
            isHeadingToBedRef={isHeadingToBedRef}
            onBedArrival={handleBedArrival}
            isHeadingToBenchRef={isHeadingToBenchRef}
            onBenchArrival={handleBenchArrival}
            isSittingOnBench={isSittingOnBench}
            isRaining={weather === "rain"}
            isDizzyRef={isDizzyRef}
            level={level}
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

          {/* Wide Diorama Orbit Controls — centered on Juro */}
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
            onPet={handleDirectPet}
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
          open={juroMenu.open && !speechBubble.visible}
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
          <div className="relative w-full h-full rounded-full border border-white/70 shadow-[inset_0_0_8px_rgba(255,255,255,0.7),0_0_12px_rgba(56,189,248,0.4),inset_-3px_-3px_8px_rgba(244,114,182,0.45)] bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.92)_0%,rgba(224,242,254,0.55)_32%,rgba(244,114,182,0.35)_68%,rgba(56,189,248,0.5)_100%)] backdrop-blur-[0.5px]">
            {/* Glossy specular reflection highlights */}
            <div className="absolute top-[16%] left-[20%] w-[26%] h-[26%] rounded-full bg-white/95" />
            <div className="absolute bottom-[20%] right-[22%] w-[14%] h-[14%] rounded-full bg-pink-200/60" />
          </div>
        </div>
      ))}

      {/* Floating Affection Hearts */}
      {hearts.map((h) => (
        <div
          key={h.id}
          style={
            {
              left: `${h.x}px`,
              top: `${h.y}px`,
              "--dx": `${h.dx}px`,
            } as React.CSSProperties
          }
          className="pointer-events-none absolute z-40 animate-pet-heart select-none drop-shadow-[2px_2px_0px_#171717]"
        >
          <Heart size={20} className="fill-rose-500 text-rose-600" strokeWidth={2} />
        </div>
      ))}

      {/* Simple Retro Evolution Alert (Level 5 & Level 10 Milestones) */}
      {pendingEvolutionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-xs p-4">
          <div className="animate-tray-enter w-full max-w-xs bg-warm-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] p-4 text-center space-y-3">
            {/* Crisp Pixel Art Stage Icon */}
            <div className="w-12 h-12 mx-auto bg-neutral-100 dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] flex items-center justify-center">
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

            <div className="space-y-1">
              <h2 className="pixel-text text-xs uppercase font-bold text-charcoal dark:text-white tracking-wider">
                Juro Berevolusi!
              </h2>
              <p className="pixel-text text-[10px] text-neutral-600 dark:text-neutral-300">
                Wujud Baru:{" "}
                <span className="text-juro-orange font-bold uppercase">
                  {pendingEvolutionAlert.stageName}
                </span>{" "}
                (Level {pendingEvolutionAlert.level})
              </p>
              <p className="pixel-text text-[8px] text-neutral-500 dark:text-neutral-400">
                {pendingEvolutionAlert.stageNumber === 3
                  ? "Juro kini berukuran dewasa megah dengan mahkota emas!"
                  : "Tubuh Juro membesar dan makin lincah membal!"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                clearEvolutionAlert();
              }}
              className="w-full py-2 bg-juro-orange text-white border-2 border-charcoal dark:border-neutral-700 shadow-[2px_2px_0px_#171717] hover:bg-orange-600 active:translate-x-[1px] active:translate-y-[1px] pixel-text text-[9px] uppercase font-bold cursor-pointer transition-colors"
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
