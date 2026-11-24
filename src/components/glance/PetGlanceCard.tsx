import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { desktopGlanceService } from "../../services/desktopGlanceService";
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
  const [customReply, setCustomReply] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const speechTimerRef = useRef<number | null>(null);

  const defaultSpeech = useMemo(() => {
    if (currentState === "sleep") {
      return "Zzz... Juro sedang beristirahat di kasur empuk.";
    }
    if (hunger < 30) {
      return "Perut jeli Juro berbunyi... Juro agak lapar.";
    }
    return `Halo! Senang bisa menyapamu hari ini.`;
  }, [currentState, hunger]);

  const speechText = customReply ?? defaultSpeech;

  // Synchronize state with Android Native AppWidget if running on Android
  useEffect(() => {
    desktopGlanceService.updateAndroidWidget(
      name,
      speechText,
      Math.round(hunger),
      Math.round(energy)
    );
  }, [name, speechText, hunger, energy]);

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
        setCustomReply(reply);
        soundEffects.playHappy();

        speechTimerRef.current = window.setTimeout(() => {
          setCustomReply(null);
        }, 12000);
      } catch {
        setCustomReply("Senang bisa mengobrol denganmu!");
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
          : "rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl"
      } bg-white dark:bg-neutral-900 p-4 flex flex-col gap-3 select-none`}
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate tabular-nums">
            {name} · Lv.{level}
          </h2>
          {activeRoomCode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/20 text-[11px] font-semibold text-juro-orange dark:text-orange-300 shrink-0">
              <Users size={11} />
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
              className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Center */}
      <div className="relative flex flex-col items-center justify-center pt-1 pb-1">
        <div className="relative w-full mb-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-2.5 shadow-xs">
          <p className="text-xs sm:text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
            {isChatLoading ? (
              <span className="text-xs text-neutral-500">
                Juro sedang berpikir...
              </span>
            ) : (
              speechText
            )}
          </p>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-neutral-50 dark:bg-neutral-800 border-r border-b border-neutral-200 dark:border-neutral-700 rotate-45" />
        </div>

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

      {/* 3. Vital Stat Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Utensils size={13} className="text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Lapar
            </span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {Math.round(hunger)}%
          </span>
        </div>

        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Moon size={13} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Tidur
            </span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {Math.round(energy)}%
          </span>
        </div>

        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Droplets size={13} className="text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Bersih
            </span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {Math.round(cleanliness)}%
          </span>
        </div>

        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Smile size={13} className="text-rose-600 dark:text-rose-400" />
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Senang
            </span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {Math.round(happiness)}%
          </span>
        </div>
      </div>

      {/* 4. Partner Status Glance */}
      {partnerPet && (
        <div className="rounded-xl bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200/80 dark:border-orange-500/20 px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
              {partnerPet.name} ({partnerPet.ownerName})
            </span>
          </div>
          <span className="text-xs text-neutral-500 shrink-0">
            {partnerPet.isOnline ? "Online" : "Istirahat"}
          </span>
        </div>
      )}

      {/* 5. Quick Chat Box */}
      <form onSubmit={handleSendQuickChat} className="flex items-center gap-2 pt-0.5">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Sapa Juro..."
          disabled={isChatLoading}
          className="flex-1 h-9 px-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-juro-orange focus:ring-2 focus:ring-juro-orange/20"
        />
        <button
          type="submit"
          disabled={isChatLoading || !messageInput.trim()}
          aria-label="Kirim pesan cepat ke Juro"
          className="h-9 px-3 rounded-xl bg-juro-orange hover:bg-orange-600 active:scale-95 text-white disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center transition-all"
        >
          <Send size={14} />
        </button>
      </form>

      {/* 6. Return to 3D Valley */}
      {onOpenValley3D && (
        <button
          type="button"
          onClick={() => {
            soundEffects.playPop();
            onOpenValley3D();
          }}
          className="w-full py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <ExternalLink size={13} />
          <span>Buka Lembah 3D</span>
        </button>
      )}

      {/* 7. Mobile Android Floating PiP */}
      {desktopGlanceService.isNativeAndroid() && !isDetachedWindow && (
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              soundEffects.playPop();
              desktopGlanceService.enterNativePip();
            }}
            className="w-full py-2 rounded-xl bg-juro-orange hover:bg-orange-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer transition-all"
          >
            <ExternalLink size={13} />
            <span>Mode Mengambang (PiP)</span>
          </button>
          <p className="text-[11px] text-neutral-500 text-center leading-snug">
            Widget juga tersedia di menu widget layar beranda ponsel.
          </p>
        </div>
      )}
    </div>
  );
};
