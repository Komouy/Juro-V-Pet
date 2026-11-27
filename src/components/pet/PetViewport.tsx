import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type {
  JuroScreenTarget,
  BathLiveState,
  WalkCommand,
} from "../../features/character/JuroModel";
import { ItemIllustration } from "../items/ItemIllustration";
import { usePetStore } from "../../stores/petStore";
import { useGameStore } from "../../stores/gameStore";
import { useUIStore } from "../../stores/uiStore";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { CaregiverOnboardingModal } from "../caregiver/CaregiverOnboardingModal";
import { SHOP_FOODS } from "../../data/economyCatalog";
import { soundEffects } from "../../engine/audio/soundEffects";
import {
  isBedtimeHour,
  TIME_THEMES,
  type TimePhase,
} from "../../utils/timeOfDay";
import {
  getDayTimeWeather,
  isRainingWeather,
  normalizeWeather,
  type DayTimeWeather,
} from "../../types/ui";
import {
  readGraphicsEnvironment,
  resolveGraphicsProfile,
} from "../../engine/world/graphicsProfile";
import { type CameraMode } from "./viewport/ResponsiveCamera";
import { StatBars } from "./viewport/StatBars";
import { MiniMap } from "./viewport/MiniMap";
import { ActionTray } from "./viewport/ActionTray";
import { ActionDock } from "./viewport/ActionDock";
import { JuroChatModal } from "./viewport/JuroChatModal";
import { JuroContextMenu } from "./viewport/JuroContextMenu";
import { JuroSpeechBubble } from "./viewport/JuroSpeechBubble";
import { SceneCanvas } from "./viewport/SceneCanvas";
import { SceneErrorBoundary } from "./viewport/SceneErrorBoundary";
import { EvolutionModal } from "./viewport/EvolutionModal";
import { usePetSpeech } from "./viewport/usePetSpeech";
import { usePetItemDrag } from "./viewport/usePetItemDrag";
import { useLandmarkInteractions } from "./viewport/useLandmarkInteractions";
import {
  getEffectiveWeatherPalette,
  getDraggedIllustrationId,
  type ActiveTray,
} from "./viewport/viewportConstants";

export interface PetViewportProps {
  isPaused?: boolean;
}

export const PetViewport: React.FC<PetViewportProps> = ({ isPaused = false }) => {
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
    recoverSleepEnergy,
    decayNightSleep,
    lastPosition,
  } = usePetStore();
  const { addLog, addCoins, foodInventory, ownedToys } = useGameStore();
  const weather = useUIStore((s) => s.weather);
  const autoRaining = useUIStore((s) => s.autoRaining);
  const syncAutoWeather = useUIStore((s) => s.syncAutoWeather);
  const showToast = useUIStore((s) => s.showToast);
  const actionMenuStyle = useUIStore((s) => s.actionMenuStyle);
  const cameraResetNonce = useUIStore((s) => s.cameraResetNonce);
  const hasRegisteredName = useCaregiverStore((s) => s.hasRegisteredName);
  const partnerPet = useCaregiverStore((s) => s.partnerPet);

  const savedInitialPos = usePetStore.getState().lastPosition;
  const juroWorldPosRef = useRef<THREE.Vector3>(
    savedInitialPos
      ? new THREE.Vector3(savedInitialPos.x, savedInitialPos.y, savedInitialPos.z)
      : new THREE.Vector3(0, -0.45, -0.35)
  );
  const juroYawRef = useRef<number>(0);
  const [isDraggingPet, setIsDraggingPet] = useState(false);
  const isHeadingToBedRef = useRef<boolean>(false);
  const isHeadingToBenchRef = useRef<boolean>(false);
  const isHeadingToTrampolineRef = useRef<boolean>(false);
  const wakeCooldownUntilRef = useRef<number>(0);
  const isDizzyRef = useRef<boolean>(false);
  const [cameraMode] = useState<CameraMode>("follow");

  const [activeTray, setActiveTray] = useState<ActiveTray>("none");
  const [showStatDetails, setShowStatDetails] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [juroMenu, setJuroMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    isNearTop: boolean;
  }>({ open: false, x: 0, y: 0, isNearTop: false });
  const juroMenuRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const [walkCommand, setWalkCommand] = useState<WalkCommand | null>(null);
  const [isSoftwareGl, setIsSoftwareGl] = useState(false);
  const [adaptiveDowngrade, setAdaptiveDowngrade] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(() =>
    typeof document !== "undefined" ? document.visibilityState === "hidden" : false
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [now, setNow] = useState(() => new Date());
  const isNightSleep = isBedtimeHour(now);

  const hideSpeechRef = useRef<() => void>(() => {});
  const closeJuroMenu = useCallback(() => {
    setJuroMenu((prev) => ({ ...prev, open: false }));
  }, []);

  const handlePetPointerDown = useCallback(() => {
    lastJuroPointerDownAtRef.current = Date.now();
  }, []);

  const handlePetClick = useCallback(
    (screenPos?: { x: number; y: number }) => {
      if (isCameraDraggingRef.current || Date.now() - cameraDragEndTimeRef.current < 160) {
        return;
      }

      isHeadingToBedRef.current = false;
      isHeadingToBenchRef.current = false;
      isHeadingToTrampolineRef.current = false;
      setWalkCommand(null);
      hideSpeechRef.current();

      if (actionMenuStyle === "floating") {
        setShowStatDetails(false);
        setActiveTray("none");

        if (juroMenu.open) {
          soundEffects.playDismiss();
          closeJuroMenu();
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
        const clampedY = isNearTop
          ? Math.max(10, Math.min(contH - menuH - 20, rawY + 45))
          : Math.max(menuH + 10, Math.min(contH - 20, rawY - 14));

        setJuroMenu({ open: true, x: clampedX, y: clampedY, isNearTop });
      } else {
        setShowStatDetails(false);
        setActiveTray("none");
        setIsChatOpen(true);
        soundEffects.playPop();
      }
    },
    [actionMenuStyle, juroMenu.open, closeJuroMenu]
  );

  const landmarks = useLandmarkInteractions({
    juroWorldPosRef,
    isHeadingToBedRef,
    isHeadingToBenchRef,
    isHeadingToTrampolineRef,
    wakeCooldownUntilRef,
    isNightSleep,
    now,
    onPetClick: handlePetClick,
    setWalkCommand,
    setActiveTray,
    setShowStatDetails,
    setIsChatOpen,
    closeJuroMenu,
  });

  const handleCloseChatAndMenu = useCallback(() => {
    setIsChatOpen(false);
    closeJuroMenu();
  }, [closeJuroMenu]);

  const handleDismissBenchMenu = useCallback(() => {
    landmarks.setIsBenchMenuOpen(false);
  }, [landmarks]);

  const speech = usePetSpeech({
    weather,
    isDraggingPet,
    isSittingOnBench: landmarks.isSittingOnBench,
    isBouncingOnTrampoline: landmarks.isBouncingOnTrampoline,
    isDizzyRef,
    bathStateRef,
    isChatOpen,
    isMenuOpen: juroMenu.open,
    onCloseChatAndMenu: handleCloseChatAndMenu,
    onDismissBenchMenu: handleDismissBenchMenu,
  });
  hideSpeechRef.current = speech.hideSpeechBubble;

  const dragSystem = usePetItemDrag({
    containerRef,
    ghostRef,
    controlsRef,
    bathStateRef,
    juroScreenPosRef,
    wakeCooldownUntilRef,
    isHeadingToBedRef,
    setActiveTray,
    triggerInteractionSpeech: speech.triggerInteractionSpeech,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportWidth(window.innerWidth);
    const onVisibilityChange = () => setIsTabHidden(document.visibilityState === "hidden");
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const graphicsProfile = useMemo(
    () =>
      resolveGraphicsProfile(
        adaptiveDowngrade ? "low" : "auto",
        readGraphicsEnvironment({ isSoftwareRenderer: isSoftwareGl, viewportWidth })
      ),
    [adaptiveDowngrade, isSoftwareGl, viewportWidth]
  );

  const handleAdaptiveDowngrade = useCallback(() => {
    setAdaptiveDowngrade(true);
  }, []);

  // Dismiss open popups on Escape
  useEffect(() => {
    if (
      activeTray === "none" &&
      !showStatDetails &&
      !landmarks.isBenchMenuOpen &&
      !landmarks.isTrampolineMenuOpen &&
      !speech.speechBubble.visible &&
      !isChatOpen &&
      !juroMenu.open
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTray("none");
        setShowStatDetails(false);
        landmarks.setIsBenchMenuOpen(false);
        landmarks.setIsTrampolineMenuOpen(false);
        setIsChatOpen(false);
        closeJuroMenu();
        speech.hideSpeechBubble();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTray, showStatDetails, landmarks, speech, isChatOpen, juroMenu.open, closeJuroMenu]);

  // Keep Juro Context Menu anchored above Juro's head
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
        const clampedY = isNearTop
          ? Math.max(10, Math.min(contH - menuH - 20, crownY + 45))
          : Math.max(menuH + 10, Math.min(contH - 20, crownY - 14));

        juroMenuRef.current.style.left = `${clampedX}px`;
        juroMenuRef.current.style.top = `${clampedY}px`;

        if (tailRef.current) {
          const menuLeft = clampedX - halfMenuW;
          const clampedTailOffset = Math.max(20, Math.min(menuW - 20, pos.x - menuLeft));
          tailRef.current.style.left = `${clampedTailOffset}px`;
        }
      }
      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, [juroMenu.open, actionMenuStyle]);

  // Dismiss Juro menu when tapping outside
  useEffect(() => {
    if (!juroMenu.open || actionMenuStyle !== "floating") return;
    const onWindowPointer = (e: Event) => {
      if (Date.now() - lastJuroPointerDownAtRef.current < 80) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-juro-menu="true"]') || juroMenuRef.current?.contains(target)) {
        return;
      }
      closeJuroMenu();
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", onWindowPointer);
    }, 80);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onWindowPointer);
    };
  }, [juroMenu.open, actionMenuStyle, closeJuroMenu]);

  // Pointer drag vs tap tracking for camera orbit
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
        landmarks.setIsBenchMenuOpen(false);
        landmarks.setIsTrampolineMenuOpen(false);
        closeJuroMenu();
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
  }, [closeJuroMenu, landmarks]);

  const handleOrbitStart = useCallback(() => {
    const controls = controlsRef.current;
    isUserOrbitGestureRef.current = true;
    didOrbitMoveRef.current = false;
    if (controls && controls.object && controls.target) {
      orbitStartCamDistRef.current = controls.object.position.distanceTo(controls.target);
    }
  }, []);

  const handleOrbitChange = useCallback(() => {
    if (!isUserOrbitGestureRef.current) return;
    const controls = controlsRef.current;
    if (!controls || !controls.object || !controls.target) return;

    const currDist = controls.object.position.distanceTo(controls.target);
    const zoomChanged = Math.abs(currDist - orbitStartCamDistRef.current) > 0.45;
    const pointerDragged = pointerGestureRef.current?.dragged ?? false;

    if (pointerDragged || zoomChanged) {
      didOrbitMoveRef.current = true;
      isCameraDraggingRef.current = true;
      cameraDragEndTimeRef.current = Date.now();
      landmarks.setIsBenchMenuOpen(false);
      landmarks.setIsTrampolineMenuOpen(false);
      closeJuroMenu();
    }
  }, [closeJuroMenu, landmarks]);

  const handleOrbitEnd = useCallback(() => {
    if (didOrbitMoveRef.current) {
      cameraDragEndTimeRef.current = Date.now();
    }
    isUserOrbitGestureRef.current = false;
    isCameraDraggingRef.current = false;
    didOrbitMoveRef.current = false;
  }, []);

  const handleDraggingPetChange = useCallback(
    (dragging: boolean) => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !dragging;
      }
      if (dragging) {
        landmarks.setIsSittingOnBench(false);
        landmarks.setIsBouncingOnTrampoline(false);
        isHeadingToBenchRef.current = false;
        isHeadingToTrampolineRef.current = false;
        landmarks.setIsBenchMenuOpen(false);
        landmarks.setIsTrampolineMenuOpen(false);
      }
      setIsDraggingPet(dragging);
    },
    [landmarks]
  );

  // Level-up reward toast
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
    syncAutoWeather();
    const interval = setInterval(() => {
      const curr = new Date();
      setNow(curr);
      syncAutoWeather(curr.getTime());
    }, 15000);
    return () => clearInterval(interval);
  }, [syncAutoWeather]);

  useEffect(() => {
    if (currentState !== "sleep") return;
    const timer = setInterval(() => recoverSleepEnergy(3), 2500);
    return () => clearInterval(timer);
  }, [currentState, recoverSleepEnergy]);

  useEffect(() => {
    if (!isNightSleep || currentState === "sleep") return;
    const timer = setInterval(() => decayNightSleep(2), 7000);
    return () => clearInterval(timer);
  }, [isNightSleep, currentState, decayNightSleep]);

  useEffect(() => {
    if (cameraResetNonce === 0) return;
    controlsRef.current?.reset();
  }, [cameraResetNonce]);

  const isRaining = isRainingWeather(weather, autoRaining);

  useEffect(() => {
    if (!isRaining) return;
    const interval = setInterval(() => soundEffects.playRainDrop(), 2800);
    return () => clearInterval(interval);
  }, [isRaining]);

  const handleMenuAction = useCallback(
    (action: "food" | "toy" | "sleep" | "bath") => {
      if (landmarks.isSittingOnBench) landmarks.setIsSittingOnBench(false);
      if (landmarks.isBouncingOnTrampoline) landmarks.setIsBouncingOnTrampoline(false);
      isHeadingToBenchRef.current = false;
      isHeadingToTrampolineRef.current = false;
      landmarks.setIsBenchMenuOpen(false);
      landmarks.setIsTrampolineMenuOpen(false);
      closeJuroMenu();
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
          landmarks.handleToggleSleep();
          break;
        case "bath":
          soundEffects.playPop();
          setActiveTray("bath");
          break;
      }
    },
    [landmarks, closeJuroMenu]
  );

  const dayTimeWeather: DayTimeWeather =
    weather === "hujan" || weather === "rain"
      ? getDayTimeWeather(now)
      : (normalizeWeather(weather, now) as DayTimeWeather);

  const activePhase: TimePhase = useMemo(() => {
    if (dayTimeWeather === "pagi") return "morning";
    if (dayTimeWeather === "cerah") return "day";
    if (dayTimeWeather === "senja") return "sunset";
    return "night";
  }, [dayTimeWeather]);
  const activeTheme = TIME_THEMES[activePhase];
  const activePalette = getEffectiveWeatherPalette(dayTimeWeather, isRaining);
  const totalFoodStock = SHOP_FOODS.reduce((acc, f) => acc + (foodInventory[f.id] ?? 0), 0);
  const orbitEnabled = !isDraggingPet && !dragSystem.isDraggingTool;

  return (
    <div
      ref={containerRef}
      style={{ background: activePalette.sky }}
      className={`relative flex-1 min-h-0 w-full overflow-hidden select-none touch-none transition-all duration-700 ${
        isDraggingPet ? "cursor-grabbing" : "cursor-default"
      }`}
    >
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

      <div className="absolute top-3 right-3 z-30 pointer-events-auto">
        <MiniMap
          playerX={lastPosition?.x ?? 0}
          playerZ={lastPosition?.z ?? 0}
          juroWorldPosRef={juroWorldPosRef}
          juroYawRef={juroYawRef}
        />
      </div>

      {partnerPet && (
        <div className="absolute top-[98px] sm:top-[110px] right-3 z-20 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_2px_0_#18181B]">
          <span
            className={`w-2 h-2 rounded-[1px] border border-charcoal shrink-0 ${
              partnerPet.isOnline ? "bg-emerald-500" : "bg-neutral-400"
            }`}
          />
          <span className="font-mono-hud text-[11px] font-bold text-charcoal dark:text-neutral-200">
            {partnerPet.name} · Lv.{partnerPet.level}
          </span>
        </div>
      )}

      <SceneErrorBoundary>
        <SceneCanvas
          graphicsProfile={graphicsProfile}
          isPaused={isPaused || isTabHidden}
          onAdaptiveDowngrade={handleAdaptiveDowngrade}
          setIsSoftwareGl={setIsSoftwareGl}
          activePalette={activePalette}
          normalizedWeather={dayTimeWeather}
          activeTheme={activeTheme}
          isRaining={isRaining}
          controlsRef={controlsRef}
          juroWorldPosRef={juroWorldPosRef}
          juroScreenPosRef={juroScreenPosRef}
          juroYawRef={juroYawRef}
          bathStateRef={bathStateRef}
          isHeadingToBedRef={isHeadingToBedRef}
          isHeadingToBenchRef={isHeadingToBenchRef}
          isHeadingToTrampolineRef={isHeadingToTrampolineRef}
          isDizzyRef={isDizzyRef}
          cameraMode={cameraMode}
          orbitEnabled={orbitEnabled}
          onOrbitStart={handleOrbitStart}
          onOrbitChange={handleOrbitChange}
          onOrbitEnd={handleOrbitEnd}
          walkCommand={walkCommand}
          level={level}
          dragVisual={dragSystem.dragVisual}
          partnerPet={partnerPet}
          showToast={showToast}
          onOpenShop={landmarks.handleOpenShopFromMap}
          onOpenMine={landmarks.handleOpenMineFromMap}
          onBedClick={landmarks.handleBedClick}
          onBedArrival={landmarks.handleBedArrival}
          isBenchMenuOpen={landmarks.isBenchMenuOpen}
          onBenchClick={landmarks.handleBenchClick}
          onSitOnBench={landmarks.handleSitOnBench}
          onStandFromBench={landmarks.handleStandFromBench}
          onCloseBenchMenu={() => landmarks.setIsBenchMenuOpen(false)}
          onBenchArrival={landmarks.handleBenchArrival}
          isSittingOnBench={landmarks.isSittingOnBench}
          isTrampolineMenuOpen={landmarks.isTrampolineMenuOpen}
          onTrampolineClick={landmarks.handleTrampolineClick}
          onStartBounce={landmarks.handleStartBounce}
          onStopBounce={landmarks.handleStopBounce}
          onCloseTrampolineMenu={() => landmarks.setIsTrampolineMenuOpen(false)}
          onTrampolineArrival={landmarks.handleTrampolineArrival}
          isBouncingOnTrampoline={landmarks.isBouncingOnTrampoline}
          onGroundClick={landmarks.handleGroundClick}
          onDraggingPetChange={handleDraggingPetChange}
          onPetClick={handlePetClick}
          onPetPointerDown={handlePetPointerDown}
        />
      </SceneErrorBoundary>

      {dragSystem.dragVisual && dragSystem.dragVisual.moved && (
        <div
          ref={ghostRef}
          className="absolute top-0 left-0 z-40 pointer-events-none select-none will-change-transform"
        >
          <div
            className={`transition-transform duration-150 ${
              dragSystem.dragVisual.payload.kind === "bucket" && dragSystem.dragVisual.overJuro
                ? "-rotate-35 scale-115"
                : dragSystem.dragVisual.payload.kind === "soap" && dragSystem.dragVisual.overJuro
                ? "rotate-12 scale-110"
                : dragSystem.dragVisual.overJuro
                ? "scale-120"
                : "scale-105"
            }`}
          >
            <ItemIllustration
              id={getDraggedIllustrationId(dragSystem.dragVisual.payload)}
              size={60}
              className="drop-shadow-[3px_4px_0px_rgba(23,23,23,0.45)]"
            />
          </div>
        </div>
      )}

      <ActionTray
        activeTray={activeTray}
        onClose={() => setActiveTray("none")}
        foodInventory={foodInventory}
        ownedToys={ownedToys}
        soapBadgePercent={dragSystem.soapBadgePercent}
        dragVisualMoved={dragSystem.dragVisual?.moved}
        isDockMode={actionMenuStyle === "dock"}
        onStartItemDrag={dragSystem.handleStartItemDrag}
        onDirectUse={dragSystem.handleDirectUse}
      />

      {actionMenuStyle === "dock" && (
        <>
          <ActionDock
            activeTray={activeTray}
            onSelectTray={(tray) => {
              setIsChatOpen(false);
              setActiveTray((prev) => (prev === tray ? "none" : tray));
            }}
            onToggleSleep={landmarks.handleToggleSleep}
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
            onSendMessage={speech.handleSendMessage}
            isLoading={speech.speechBubble.isLoading}
            petName={name}
            hunger={hunger}
            energy={energy}
            cleanliness={cleanliness}
            happiness={happiness}
            isSleeping={currentState === "sleep"}
          />
        </>
      )}

      {actionMenuStyle === "floating" && (
        <JuroContextMenu
          open={juroMenu.open}
          x={juroMenu.x}
          y={juroMenu.y}
          isNearTop={juroMenu.isNearTop}
          currentState={currentState}
          totalFoodStock={totalFoodStock}
          onAction={handleMenuAction}
          onSendMessage={speech.handleSendMessage}
          isChatLoading={speech.speechBubble.isLoading}
          menuRef={juroMenuRef}
          tailRef={tailRef}
        />
      )}

      <JuroSpeechBubble
        open={speech.speechBubble.visible}
        text={speech.speechBubble.text}
        isLoading={speech.speechBubble.isLoading}
        targetPosRef={juroScreenPosRef}
        containerRef={containerRef}
        isDockMode={actionMenuStyle === "dock"}
        onClose={speech.hideSpeechBubble}
        petName={name}
      />

      {dragSystem.dragBubbles.map((b) => (
        <div
          key={b.id}
          onClick={() => dragSystem.handlePopBubble(b.id)}
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
            <div className="absolute top-[16%] left-[20%] w-[26%] h-[26%] rounded-full bg-white/95" />
            <div className="absolute bottom-[20%] right-[22%] w-[14%] h-[14%] rounded-full bg-pink-200/60" />
          </div>
        </div>
      ))}

      <EvolutionModal pendingEvolutionAlert={pendingEvolutionAlert} onClear={clearEvolutionAlert} />
      {!hasRegisteredName && <CaregiverOnboardingModal />}
    </div>
  );
};
