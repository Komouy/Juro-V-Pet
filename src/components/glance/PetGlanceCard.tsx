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
import { PixelInput } from "../ui/PixelInput";
import { Button } from "../ui/Button";

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
          : "rounded-[6px] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[6px_6px_0_#18181B] dark:shadow-[6px_6px_0_#09090B]"
      } bg-[#FDFBF7] dark:bg-[#1E2028] p-4 flex flex-col gap-3 select-none`}
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E]">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-pixel text-xs sm:text-sm font-bold uppercase text-charcoal dark:text-neutral-100 truncate">
            {name} · Lv.{level}
          </h2>
          {activeRoomCode && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-[#FFF1DF] border border-juro-orange font-pixel text-[10px] font-bold text-juro-orange-deep shrink-0">
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
              className="console-btn-bevel p-1 rounded-[4px] border-2 border-transparent hover:border-charcoal hover:bg-[#EFE9DC] dark:hover:bg-[#101114] text-charcoal/70 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Center */}
      <div className="relative flex flex-col items-center justify-center pt-1 pb-1">
        <div className="relative w-full mb-2.5 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] p-2.5">
          <p className="text-xs sm:text-sm leading-relaxed text-charcoal dark:text-neutral-200">
            {isChatLoading ? (
              <span className="font-pixel text-[11px] text-neutral-500">
                Juro sedang berpikir...
              </span>
            ) : (
              speechText
            )}
          </p>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#EFE9DC] dark:bg-[#101114] border-r-2 border-b-2 border-charcoal dark:border-[#3F424E] rotate-45" />
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
        <div className="rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/75 dark:border-[#3F424E] px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Utensils size={13} className="text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-charcoal dark:text-neutral-300">
              Lapar
            </span>
          </div>
          <span className="font-mono-hud text-xs font-bold text-charcoal dark:text-neutral-100">
            {Math.round(hunger)}%
          </span>
        </div>

        <div className="rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/75 dark:border-[#3F424E] px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Moon size={13} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-charcoal dark:text-neutral-300">
              Tidur
            </span>
          </div>
          <span className="font-mono-hud text-xs font-bold text-charcoal dark:text-neutral-100">
            {Math.round(energy)}%
          </span>
        </div>

        <div className="rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/75 dark:border-[#3F424E] px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Droplets size={13} className="text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-semibold text-charcoal dark:text-neutral-300">
              Bersih
            </span>
          </div>
          <span className="font-mono-hud text-xs font-bold text-charcoal dark:text-neutral-100">
            {Math.round(cleanliness)}%
          </span>
        </div>

        <div className="rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal/75 dark:border-[#3F424E] px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Smile size={13} className="text-rose-600 dark:text-rose-400" />
            <span className="text-xs font-semibold text-charcoal dark:text-neutral-300">
              Senang
            </span>
          </div>
          <span className="font-mono-hud text-xs font-bold text-charcoal dark:text-neutral-100">
            {Math.round(happiness)}%
          </span>
        </div>
      </div>

      {/* 4. Partner Status Glance */}
      {partnerPet && (
        <div className="rounded-[4px] bg-[#FFF6EB] dark:bg-orange-500/10 border-2 border-juro-orange/70 px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-[1px] bg-emerald-500 border border-charcoal shrink-0" />
            <span className="text-xs font-semibold text-charcoal dark:text-neutral-200 truncate">
              {partnerPet.name} ({partnerPet.ownerName})
            </span>
          </div>
          <span className="font-pixel text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400 shrink-0">
            {partnerPet.isOnline ? "Online" : "Istirahat"}
          </span>
        </div>
      )}

      {/* 5. Quick Chat Box */}
      <form onSubmit={handleSendQuickChat} className="flex items-center gap-2 pt-0.5">
        <div className="flex-1 min-w-0">
          <PixelInput
            compact
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Sapa Juro..."
            disabled={isChatLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isChatLoading || !messageInput.trim()}
          aria-label="Kirim pesan cepat ke Juro"
          className="console-btn-bevel h-[38px] px-3 rounded-[4px] bg-juro-orange hover:bg-[#EA580C] border-2 border-charcoal shadow-[0_2px_0_#18181B] text-white disabled:opacity-45 disabled:pointer-events-none cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send size={14} />
        </button>
      </form>

      {/* 6. Return to 3D Valley */}
      {onOpenValley3D && (
        <Button
          type="button"
          onClick={() => {
            soundEffects.playPop();
            onOpenValley3D();
          }}
          icon={ExternalLink}
          label="Buka Lembah 3D"
          variant="secondary"
          size="sm"
          className="w-full"
        />
      )}

      {/* 7. Mobile Android Floating PiP */}
      {desktopGlanceService.isNativeAndroid() && !isDetachedWindow && (
        <div className="pt-2 border-t-2 border-dashed border-charcoal/15 dark:border-[#3F424E] flex flex-col gap-1.5">
          <Button
            type="button"
            onClick={() => {
              soundEffects.playPop();
              desktopGlanceService.enterNativePip();
            }}
            icon={ExternalLink}
            label="Mode Mengambang (PiP)"
            variant="accent"
            size="sm"
            className="w-full"
          />
          <p className="text-[11px] text-neutral-500 text-center leading-snug">
            Widget juga tersedia di menu widget layar beranda ponsel.
          </p>
        </div>
      )}
    </div>
  );
};
