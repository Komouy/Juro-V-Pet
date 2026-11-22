import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Send,
  Moon,
  Utensils,
  Droplets,
  Smile,
  ExternalLink,
  X,
  Users,
} from "lucide-react";
import { usePetStore } from "../../stores/petStore";
import { useGameStore } from "../../stores/gameStore";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { soundEffects } from "../../engine/audio/soundEffects";
import { chatWithJuro, type PetChatContext } from "../../services/geminiService";
import { getCognitiveTier, computePetEmotionalState } from "../../engine/ai/cognitiveCore";
import { JuroAvatar2D } from "./JuroAvatar2D";

export interface PetGlanceCardProps {
  onClose?: () => void;
  onOpenValley3D?: () => void;
  isDetachedWindow?: boolean;
}

export const PetGlanceCard: React.FC<PetGlanceCardProps> = ({
  onClose,
  onOpenValley3D,
  isDetachedWindow = false,
}) => {
  const {
    name,
    level,
    hunger,
    energy,
    cleanliness,
    happiness,
    affection,
    currentState,
  } = usePetStore();

  const { activeSkin, activeHat } = useGameStore();
  const { partnerPet, activeRoomCode } = useCaregiverStore();

  const [messageInput, setMessageInput] = useState("");
  const [speechText, setSpeechText] = useState<string>(() => {
    if (currentState === "sleep") {
      return "Zzz... Juro sedang tidur lelap di kasur empuk.";
    }
    if (hunger < 30) {
      return "Perut jeli Juro berbunyi... Juro agak lapar.";
    }
    return `Halo! Senang bisa menyapamu hari ini.`;
  });
  const [isChatLoading, setIsChatLoading] = useState(false);
  const speechTimerRef = useRef<number | null>(null);

  // Update default speech when state changes if user is not actively chatting
  useEffect(() => {
    if (currentState === "sleep") {
      setSpeechText("Zzz... Juro sedang beristirahat di kasur empuk.");
    }
  }, [currentState]);

  const handleSendQuickChat = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = messageInput.trim();
      if (!text || isChatLoading) return;

      setMessageInput("");
      setIsChatLoading(true);
      soundEffects.playPop();

      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }

      try {
        const tier = getCognitiveTier(level);
        const emotionalState = computePetEmotionalState(
          { hunger, energy, cleanliness, happiness, affection },
          { currentState, level }
        );

        const chatContext: PetChatContext = {
          name,
          level,
          hunger,
          energy,
          cleanliness,
          happiness,
          affection,
          currentState,
          isSleeping: currentState === "sleep",
          cognitiveTier: tier,
          emotionalState,
          caregiverRelationship: useCaregiverStore.getState().getCaregiverRelationship(),
        };

        const reply = await chatWithJuro(text, chatContext);
        setSpeechText(reply);
        soundEffects.playHappy();

        speechTimerRef.current = window.setTimeout(() => {
          if (currentState === "sleep") {
            setSpeechText("Zzz... Juro kembali tidur lelap.");
          }
        }, 12000);
      } catch {
        setSpeechText("Senang bisa mengobrol denganmu!");
      } finally {
        setIsChatLoading(false);
      }
    },
    [messageInput, isChatLoading, name, level, hunger, energy, cleanliness, happiness, affection, currentState]
  );

  return (
    <div
      className={`w-full max-w-[340px] ${
        isDetachedWindow
          ? "h-full border-0 shadow-none"
          : "border-2 shadow-[3px_3px_0px_#18181B] dark:shadow-[3px_3px_0px_#000000]"
      } bg-warm-white dark:bg-neutral-900 border-charcoal dark:border-neutral-600 p-3.5 flex flex-col gap-3 font-sans select-none`}
    >
      {/* 1. Header Bar: Identity & Window Controls */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-charcoal/15 dark:border-neutral-700">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          <h2 className="pixel-text text-xs font-bold text-charcoal dark:text-neutral-100 tracking-wide truncate">
            {name} · Lv.{level}
          </h2>
          {activeRoomCode && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-juro-orange/15 border border-charcoal text-[8px] font-bold text-juro-orange dark:text-orange-400">
              <Users size={9} />
              2P
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup jendela pet glance"
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-charcoal/30 text-charcoal dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Center: 2D Juro Avatar + Dynamic Speech Bubble */}
      <div className="relative flex flex-col items-center justify-center pt-2 pb-1">
        {/* Retro Dialogue Bubble */}
        <div className="relative w-full mb-2 bg-warm-white dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 p-2 shadow-[2px_2px_0px_#18181B] dark:shadow-[2px_2px_0px_#000000]">
          <p className="text-xs leading-relaxed text-charcoal dark:text-neutral-200 font-medium">
            {isChatLoading ? (
              <span className="pixel-text text-[10px] text-muted animate-pulse">
                Juro sedang berpikir...
              </span>
            ) : (
              speechText
            )}
          </p>
          {/* Dialogue Arrow Pointer */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-warm-white dark:bg-neutral-800 border-r-2 border-b-2 border-charcoal dark:border-neutral-600 rotate-45" />
        </div>

        {/* 2D Responsive Pixel Slime Avatar */}
        <div className="relative flex items-center justify-center py-1">
          <JuroAvatar2D
            skinId={activeSkin}
            hatId={activeHat}
            isSleeping={currentState === "sleep"}
            isHungry={hunger < 30}
            size={92}
            className="transition-transform duration-300 hover:scale-105"
          />
        </div>
      </div>

      {/* 3. Vital Stat Grid (Lapar, Tidur, Bersih, Senang) */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {/* Lapar */}
        <div className="bg-neutral-100 dark:bg-neutral-800/80 border border-charcoal/40 dark:border-neutral-700 px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Utensils size={11} className="text-amber-600 dark:text-amber-400" />
            <span className="pixel-text text-[8.5px] uppercase font-bold text-charcoal dark:text-neutral-300">
              Lapar
            </span>
          </div>
          <span className="pixel-text text-[8.5px] font-bold text-charcoal dark:text-neutral-200">
            {Math.round(hunger)}%
          </span>
        </div>

        {/* Tidur */}
        <div className="bg-neutral-100 dark:bg-neutral-800/80 border border-charcoal/40 dark:border-neutral-700 px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Moon size={11} className="text-indigo-600 dark:text-indigo-400" />
            <span className="pixel-text text-[8.5px] uppercase font-bold text-charcoal dark:text-neutral-300">
              Tidur
            </span>
          </div>
          <span className="pixel-text text-[8.5px] font-bold text-charcoal dark:text-neutral-200">
            {Math.round(energy)}%
          </span>
        </div>

        {/* Bersih */}
        <div className="bg-neutral-100 dark:bg-neutral-800/80 border border-charcoal/40 dark:border-neutral-700 px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Droplets size={11} className="text-sky-600 dark:text-sky-400" />
            <span className="pixel-text text-[8.5px] uppercase font-bold text-charcoal dark:text-neutral-300">
              Bersih
            </span>
          </div>
          <span className="pixel-text text-[8.5px] font-bold text-charcoal dark:text-neutral-200">
            {Math.round(cleanliness)}%
          </span>
        </div>

        {/* Senang */}
        <div className="bg-neutral-100 dark:bg-neutral-800/80 border border-charcoal/40 dark:border-neutral-700 px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Smile size={11} className="text-rose-600 dark:text-rose-400" />
            <span className="pixel-text text-[8.5px] uppercase font-bold text-charcoal dark:text-neutral-300">
              Senang
            </span>
          </div>
          <span className="pixel-text text-[8.5px] font-bold text-charcoal dark:text-neutral-200">
            {Math.round(happiness)}%
          </span>
        </div>
      </div>

      {/* 4. Partner Status Glance (If in 2-Player Room) */}
      {partnerPet && (
        <div className="bg-juro-orange/10 dark:bg-juro-orange/5 border border-juro-orange/30 p-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="pixel-text text-[8.5px] font-bold text-charcoal dark:text-neutral-200 truncate">
              {partnerPet.name} ({partnerPet.ownerName})
            </span>
          </div>
          <span className="pixel-text text-[8px] text-muted shrink-0">
            {partnerPet.isOnline ? "Online" : "Tidur"}
          </span>
        </div>
      )}

      {/* 5. Quick Chat Box (Direct Chat from Homescreen/Desktop) */}
      <form onSubmit={handleSendQuickChat} className="flex items-center gap-1.5 pt-1">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Sapa Juro..."
          disabled={isChatLoading}
          className="flex-1 h-8 px-2.5 bg-neutral-100 dark:bg-neutral-800 border-2 border-charcoal dark:border-neutral-600 text-xs text-charcoal dark:text-white placeholder:text-muted focus:outline-none focus:border-juro-orange"
        />
        <button
          type="submit"
          disabled={isChatLoading || !messageInput.trim()}
          aria-label="Kirim pesan cepat ke Juro"
          className="h-8 px-2.5 bg-juro-orange hover:bg-orange-600 active:translate-x-[1px] active:translate-y-[1px] text-white border-2 border-charcoal shadow-[2px_2px_0px_#18181B] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center transition-all"
        >
          <Send size={12} />
        </button>
      </form>

      {/* 6. Jump to 3D Valley Button (Care actions stay inside the 3D app) */}
      <div className="pt-1 flex flex-col gap-1">
        <button
          type="button"
          onClick={onOpenValley3D}
          className="w-full h-9 bg-warm-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#18181B] dark:shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-1.5 text-xs font-bold text-charcoal dark:text-white cursor-pointer transition-all"
        >
          <ExternalLink size={13} className="text-juro-orange" />
          <span className="pixel-text text-[9.5px] uppercase">
            Buka Lembah 3D
          </span>
        </button>
        <span className="text-[8.5px] text-center text-muted">
          Makan, mandi, main, dan tidur dilakukan di dalam lembah 3D.
        </span>
      </div>
    </div>
  );
};
