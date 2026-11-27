import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { usePetStore } from "../../../stores/petStore";
import { useCaregiverStore } from "../../../stores/caregiverStore";
import { soundEffects } from "../../../engine/audio/soundEffects";
import { getCognitiveTier, computePetEmotionalState } from "../../../engine/ai/cognitiveCore";
import { isBedtimeHour } from "../../../utils/timeOfDay";
import { isWaterAt } from "../../../engine/world/mapTerrain";
import { isNightWeather, isRainingWeather, type WeatherMode } from "../../../types/ui";
import { useUIStore } from "../../../stores/uiStore";
import {
  chatWithJuro,
  computePetExpression,
  computePetActivity,
  computePetLocation,
  computePetEnvironment,
  getContextualFallbackReply,
  type PetChatContext,
} from "../../../services/geminiService";
import type { BathLiveState } from "../../../features/character/JuroModel";
import type { SpeechInteractionDetail } from "./viewportConstants";

interface UsePetSpeechParams {
  weather: WeatherMode;
  isDraggingPet: boolean;
  isSittingOnBench: boolean;
  isBouncingOnTrampoline: boolean;
  isDizzyRef: React.RefObject<boolean>;
  bathStateRef: React.RefObject<BathLiveState>;
  isChatOpen: boolean;
  isMenuOpen: boolean;
  onCloseChatAndMenu: () => void;
  onDismissBenchMenu: () => void;
}

/**
 * Manages Juro's retro speech bubble, AI conversation, situational interaction
 * reactions, and autonomous spontaneous valley chatter.
 */
export function usePetSpeech({
  weather,
  isDraggingPet,
  isSittingOnBench,
  isBouncingOnTrampoline,
  isDizzyRef,
  bathStateRef,
  isChatOpen,
  isMenuOpen,
  onCloseChatAndMenu,
  onDismissBenchMenu,
}: UsePetSpeechParams) {
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
  const chatRequestSeqRef = useRef<number>(0);
  const isChatOpenRef = useRef<boolean>(isChatOpen);
  const lastInteractionSpeechAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current);
    };
  }, []);

  const hideSpeechBubble = useCallback(() => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    setSpeechBubble((prev) => ({ ...prev, visible: false, isLoading: false }));
  }, []);

  const getLiveChatContext = useCallback(
    (isSpontaneous = false): PetChatContext => {
      const petState = usePetStore.getState();
      const autoRaining = useUIStore.getState().autoRaining;
      const now = new Date();
      const isNight = isNightWeather(weather, now);
      const isRaining = isRainingWeather(weather, autoRaining);
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
          isRaining,
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
        isRaining,
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
        isRaining,
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
    [weather, isDraggingPet, isSittingOnBench, isBouncingOnTrampoline, isDizzyRef, bathStateRef]
  );

  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      const trimmed = userMessage.trim();
      if (!trimmed || isChatBusyRef.current) return;

      const keepDockChatOpen = isChatOpenRef.current;
      if (!keepDockChatOpen) {
        onCloseChatAndMenu();
      }

      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }

      const reqId = ++chatRequestSeqRef.current;
      isChatBusyRef.current = true;
      setSpeechBubble({
        text: "",
        isLoading: true,
        visible: !keepDockChatOpen,
      });
      soundEffects.playPop();

      try {
        const context = getLiveChatContext(false);
        const reply = await chatWithJuro(trimmed, context);
        if (chatRequestSeqRef.current !== reqId) return;

        setSpeechBubble({
          text: reply,
          isLoading: false,
          visible: !keepDockChatOpen,
        });
        soundEffects.playHappy();
        if (!keepDockChatOpen) {
          speechTimerRef.current = window.setTimeout(() => {
            setSpeechBubble((prev) => ({ ...prev, visible: false }));
          }, 9500);
        }
      } catch {
        if (chatRequestSeqRef.current !== reqId) return;
        const fallbackContext = getLiveChatContext(false);
        setSpeechBubble({
          text: fallbackContext.isSleeping
            ? "Juro sedang beristirahat dengan tenang di tempat tidurnya."
            : "Juro sedang bersantai di padang rumput lembah.",
          isLoading: false,
          visible: !keepDockChatOpen,
        });
        if (!keepDockChatOpen) {
          speechTimerRef.current = window.setTimeout(() => {
            setSpeechBubble((prev) => ({ ...prev, visible: false }));
          }, 6500);
        }
      } finally {
        if (chatRequestSeqRef.current === reqId) {
          isChatBusyRef.current = false;
        }
      }
    },
    [getLiveChatContext, onCloseChatAndMenu]
  );

  const triggerSpontaneousChatter = useCallback(async () => {
    if (
      isMenuOpen ||
      isChatOpen ||
      speechBubble.visible ||
      speechBubble.isLoading ||
      isDraggingPet ||
      isChatBusyRef.current
    ) {
      return;
    }

    const reqId = ++chatRequestSeqRef.current;
    isChatBusyRef.current = true;
    try {
      const context = getLiveChatContext(true);
      const reply = await chatWithJuro("", context);
      if (chatRequestSeqRef.current !== reqId) return;

      setSpeechBubble({ text: reply, isLoading: false, visible: true });
      soundEffects.playPop();

      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = window.setTimeout(() => {
        setSpeechBubble((prev) => ({ ...prev, visible: false }));
      }, 8000);
    } catch {
      // Ignored for background spontaneous chatter
    } finally {
      if (chatRequestSeqRef.current === reqId) {
        isChatBusyRef.current = false;
      }
    }
  }, [
    isMenuOpen,
    isChatOpen,
    speechBubble.visible,
    speechBubble.isLoading,
    isDraggingPet,
    getLiveChatContext,
  ]);

  const triggerInteractionSpeech = useCallback(
    async (
      interaction: "feed" | "play" | "bath_scrub" | "bath_rinse" | "pet",
      detail?: SpeechInteractionDetail
    ) => {
      onDismissBenchMenu();
      if (isChatBusyRef.current || speechBubble.isLoading || isChatOpenRef.current) return;

      const now = Date.now();
      const lastTrigger = lastInteractionSpeechAtRef.current[interaction] ?? 0;
      const cooldownMs =
        interaction === "feed" || interaction === "play" || interaction === "bath_rinse"
          ? 3500
          : 9000;
      if (now - lastTrigger < cooldownMs) return;
      lastInteractionSpeechAtRef.current[interaction] = now;

      const reqId = ++chatRequestSeqRef.current;
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
          ? `[REAKSI MAKAN]: Kamu baru saja memakan ${detail?.food?.name || "makanan"}. Sampaikan tanggapan yang imut dan berterima kasih di ${context.locationName}.`
          : interaction === "play"
          ? `[REAKSI MAIN]: Kamu baru saja bermain ${detail?.toy?.name || "mainan favorit"}. Sampaikan tanggapan yang ceria dan imut di ${context.locationName}.`
          : interaction === "bath_scrub"
          ? `[REAKSI MANDI SABUN]: Tubuhmu sedang dibersihkan dengan sabun. Sampaikan tanggapan bahwa tubuhmu terasa segar di ${context.locationName}.`
          : interaction === "bath_rinse"
          ? `[REAKSI BILAS AIR]: Kamu selesai dibilas air bersih. Sampaikan tanggapan segar dan senang.`
          : `[REAKSI DIELUS]: Pengguna sedang menyapamu dengan hangat. Sampaikan respons yang imut dan ramah di ${context.locationName}.`;

      try {
        const reply = await chatWithJuro(promptInstruction, context);
        if (chatRequestSeqRef.current !== reqId) return;

        setSpeechBubble({ text: reply, isLoading: false, visible: true });
        soundEffects.playPop();

        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        speechTimerRef.current = window.setTimeout(() => {
          setSpeechBubble((prev) => ({ ...prev, visible: false }));
        }, 8000);
      } catch {
        if (chatRequestSeqRef.current !== reqId) return;
        const fallback = getContextualFallbackReply(context, promptInstruction);
        setSpeechBubble({ text: fallback, isLoading: false, visible: true });
        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        speechTimerRef.current = window.setTimeout(() => {
          setSpeechBubble((prev) => ({ ...prev, visible: false }));
        }, 6500);
      }
    },
    [speechBubble.isLoading, getLiveChatContext, onDismissBenchMenu]
  );

  // Autonomous Spontaneous Chatter Loop (24 - 50s)
  useEffect(() => {
    let isCancelled = false;
    const scheduleNextChatter = () => {
      const delay = 24000 + Math.random() * 26000;
      spontaneousTimerRef.current = window.setTimeout(async () => {
        if (isCancelled) return;
        await triggerSpontaneousChatter();
        if (!isCancelled) scheduleNextChatter();
      }, delay);
    };
    scheduleNextChatter();
    return () => {
      isCancelled = true;
      if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current);
    };
  }, [triggerSpontaneousChatter]);

  // Dismiss speech bubble when tapping outside
  useEffect(() => {
    if (!speechBubble.visible) return;
    const onWindowPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-speech-bubble="true"]')) return;
      hideSpeechBubble();
    };
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", onWindowPointer);
    }, 120);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onWindowPointer);
    };
  }, [speechBubble.visible, hideSpeechBubble]);

  return {
    speechBubble,
    hideSpeechBubble,
    handleSendMessage,
    triggerInteractionSpeech,
  };
}
