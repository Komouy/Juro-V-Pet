import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { usePetStore } from "../../../stores/petStore";
import { useGameStore } from "../../../stores/gameStore";
import { useCaregiverStore } from "../../../stores/caregiverStore";
import { useUIStore } from "../../../stores/uiStore";
import { soundEffects } from "../../../engine/audio/soundEffects";
import {
  JURO_BED_POS,
  JURO_BED_SLOT_1,
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  clampToCircularWorld,
} from "../../../engine/world/mapTerrain";
import type { WalkCommand } from "../../../features/character/JuroModel";
import type { ActiveTray } from "./viewportConstants";

interface UseLandmarkInteractionsParams {
  juroWorldPosRef: React.RefObject<THREE.Vector3>;
  isHeadingToBedRef: React.RefObject<boolean>;
  isHeadingToBenchRef: React.RefObject<boolean>;
  isHeadingToTrampolineRef: React.RefObject<boolean>;
  wakeCooldownUntilRef: React.RefObject<number>;
  isNightSleep: boolean;
  now: Date;
  onPetClick: (screenPos?: { x: number; y: number }) => void;
  setWalkCommand: React.Dispatch<React.SetStateAction<WalkCommand | null>>;
  setActiveTray: React.Dispatch<React.SetStateAction<ActiveTray>>;
  setShowStatDetails: React.Dispatch<React.SetStateAction<boolean>>;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeJuroMenu: () => void;
}

/**
 * Manages interactive 3D valley landmarks (bed, park bench, mushroom trampoline, shop, mine)
 * and automatic circadian sleep/morning wake transitions.
 */
export function useLandmarkInteractions({
  juroWorldPosRef,
  isHeadingToBedRef,
  isHeadingToBenchRef,
  isHeadingToTrampolineRef,
  wakeCooldownUntilRef,
  isNightSleep,
  now,
  onPetClick,
  setWalkCommand,
  setActiveTray,
  setShowStatDetails,
  setIsChatOpen,
  closeJuroMenu,
}: UseLandmarkInteractionsParams) {
  const navigate = useNavigate();
  const { currentState, energy, sleep, wakeUp } = usePetStore();
  const { addLog } = useGameStore();
  const showToast = useUIStore((s) => s.showToast);

  const [isBenchMenuOpen, setIsBenchMenuOpen] = useState(false);
  const [isSittingOnBench, setIsSittingOnBench] = useState(false);
  const [isTrampolineMenuOpen, setIsTrampolineMenuOpen] = useState(false);
  const [isBouncingOnTrampoline, setIsBouncingOnTrampoline] = useState(false);

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
  }, [sleep, addLog, isHeadingToBedRef]);

  const clearLandmarkStates = useCallback(() => {
    if (isSittingOnBench) setIsSittingOnBench(false);
    if (isBouncingOnTrampoline) setIsBouncingOnTrampoline(false);
    isHeadingToBenchRef.current = false;
    isHeadingToTrampolineRef.current = false;
    setIsBenchMenuOpen(false);
    setIsTrampolineMenuOpen(false);
  }, [isSittingOnBench, isBouncingOnTrampoline, isHeadingToBenchRef, isHeadingToTrampolineRef]);

  const handleToggleSleep = useCallback(() => {
    clearLandmarkStates();
    if (currentState === "sleep") {
      wakeUp();
      soundEffects.playWakeUp();
      if (isNightSleep && energy < 35) {
        showToast("Juro masih mengantuk dan butuh tidur penuh", "info");
      }
      addLog("interaction", "Juro bangun dari waktu istirahatnya.");
      useCaregiverStore.getState().recordAction("wake", "Membangunkan Juro dari tidurnya.", {});
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
  }, [
    clearLandmarkStates,
    currentState,
    wakeUp,
    isNightSleep,
    energy,
    showToast,
    addLog,
    wakeCooldownUntilRef,
    isHeadingToBedRef,
    setWalkCommand,
    juroWorldPosRef,
    handleBedArrival,
    setActiveTray,
  ]);

  const handleBedClick = useCallback(() => {
    if (currentState === "sleep") {
      onPetClick();
    } else {
      handleToggleSleep();
    }
  }, [currentState, onPetClick, handleToggleSleep]);

  const handleOpenShopFromMap = useCallback(() => {
    clearLandmarkStates();
    setIsChatOpen(false);
    closeJuroMenu();
    soundEffects.playClick();
    navigate("/shop");
  }, [clearLandmarkStates, setIsChatOpen, closeJuroMenu, navigate]);

  const handleOpenMineFromMap = useCallback(() => {
    clearLandmarkStates();
    setIsChatOpen(false);
    closeJuroMenu();
    soundEffects.playClick();
    navigate("/mine");
  }, [clearLandmarkStates, setIsChatOpen, closeJuroMenu, navigate]);

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
  }, [addLog, isHeadingToBenchRef]);

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
  }, [isBenchMenuOpen, setShowStatDetails, setActiveTray, setIsChatOpen]);

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
  }, [
    addLog,
    wakeUp,
    isHeadingToBenchRef,
    isHeadingToTrampolineRef,
    wakeCooldownUntilRef,
    isHeadingToBedRef,
    setWalkCommand,
  ]);

  const handleStandFromBench = useCallback(() => {
    soundEffects.playClick();
    setIsBenchMenuOpen(false);
    setIsSittingOnBench(false);
    isHeadingToBenchRef.current = false;
    soundEffects.playPlop();
    setWalkCommand({ x: 6.0, z: 18.2, nonce: Date.now() });
    addLog("interaction", "Juro berdiri dari kursi taman dan kembali menjelajah.");
  }, [addLog, isHeadingToBenchRef, setWalkCommand]);

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
  }, [isTrampolineMenuOpen, setShowStatDetails, setActiveTray, setIsChatOpen]);

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
  }, [
    addLog,
    isSittingOnBench,
    wakeUp,
    isHeadingToBenchRef,
    isHeadingToTrampolineRef,
    wakeCooldownUntilRef,
    isHeadingToBedRef,
    setWalkCommand,
  ]);

  const handleStopBounce = useCallback(() => {
    soundEffects.playClick();
    setIsTrampolineMenuOpen(false);
    setIsBouncingOnTrampoline(false);
    isHeadingToTrampolineRef.current = false;
    soundEffects.playPlop();
    setWalkCommand({
      x: JURO_TRAMPOLINE_POS.x + 1.55,
      z: JURO_TRAMPOLINE_POS.z + 0.85,
      nonce: Date.now(),
    });
    addLog("interaction", "Juro selesai bermain trampolin dan melangkah kembali ke padang rumput.");
  }, [addLog, isHeadingToTrampolineRef, setWalkCommand]);

  const handleGroundClick = useCallback(
    (point: { x: number; z: number }) => {
      setShowStatDetails(false);
      setActiveTray("none");
      setIsChatOpen(false);
      closeJuroMenu();
      setIsBenchMenuOpen(false);
      setIsTrampolineMenuOpen(false);

      if (usePetStore.getState().currentState === "sleep") {
        return;
      }

      isHeadingToBedRef.current = false;
      isHeadingToBenchRef.current = false;
      isHeadingToTrampolineRef.current = false;
      if (isSittingOnBench) setIsSittingOnBench(false);
      if (isBouncingOnTrampoline) setIsBouncingOnTrampoline(false);

      const { x, z } = clampToCircularWorld(point.x, point.z);
      soundEffects.playHop();
      setWalkCommand({ x, z, nonce: Date.now() });
    },
    [
      setShowStatDetails,
      setActiveTray,
      setIsChatOpen,
      closeJuroMenu,
      isHeadingToBedRef,
      isHeadingToBenchRef,
      isHeadingToTrampolineRef,
      isSittingOnBench,
      isBouncingOnTrampoline,
      setWalkCommand,
    ]
  );

  // Keep heading refs synchronized until React state settles
  useEffect(() => {
    if (isBouncingOnTrampoline) isHeadingToTrampolineRef.current = false;
  }, [isBouncingOnTrampoline, isHeadingToTrampolineRef]);

  useEffect(() => {
    if (isSittingOnBench) isHeadingToBenchRef.current = false;
  }, [isSittingOnBench, isHeadingToBenchRef]);

  useEffect(() => {
    if (currentState === "sleep") isHeadingToBedRef.current = false;
  }, [currentState, isHeadingToBedRef]);

  // Dismiss bench & trampoline menus when tapping outside
  useEffect(() => {
    if (!isBenchMenuOpen) return;
    const onWindowPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-bench-menu="true"]')) return;
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

  useEffect(() => {
    if (!isTrampolineMenuOpen) return;
    const onWindowPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-trampoline-menu="true"]')) return;
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

  // Circadian rhythm controller: sleep at 21:00 - 06:00, wake at 06:00
  const prevHourRef = useRef<number>(now.getHours());
  useEffect(() => {
    const prevHour = prevHourRef.current;
    const currentHour = now.getHours();
    prevHourRef.current = currentHour;

    const crossedToMorning = (prevHour < 6 || prevHour >= 21) && currentHour >= 6 && currentHour < 10;

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

    if (!isNightSleep) return;

    if (currentState === "sleep") {
      isHeadingToBedRef.current = false;
      return;
    }

    if (energy <= 25) {
      wakeCooldownUntilRef.current = 0;
    }

    if (Date.now() < wakeCooldownUntilRef.current) return;
    if (currentState === "eating") return;

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
  }, [
    isNightSleep,
    currentState,
    now,
    wakeUp,
    addLog,
    handleBedArrival,
    energy,
    isHeadingToBedRef,
    wakeCooldownUntilRef,
    setWalkCommand,
    juroWorldPosRef,
  ]);

  return {
    isBenchMenuOpen,
    setIsBenchMenuOpen,
    isSittingOnBench,
    setIsSittingOnBench,
    isTrampolineMenuOpen,
    setIsTrampolineMenuOpen,
    isBouncingOnTrampoline,
    setIsBouncingOnTrampoline,
    handleBedArrival,
    handleToggleSleep,
    handleBedClick,
    handleOpenShopFromMap,
    handleOpenMineFromMap,
    handleBenchArrival,
    handleBenchClick,
    handleSitOnBench,
    handleStandFromBench,
    handleTrampolineArrival,
    handleTrampolineClick,
    handleStartBounce,
    handleStopBounce,
    handleGroundClick,
  };
}
