import React from "react";
import {
  Utensils,
  Gamepad2,
  Droplets,
  Moon,
  Sun,
  MessageSquare,
} from "lucide-react";
import { soundEffects } from "../../../engine/audio/soundEffects";

export interface ActionDockProps {
  activeTray: "none" | "food" | "toy" | "bath";
  onSelectTray: (tray: "food" | "toy" | "bath") => void;
  onToggleSleep: () => void;
  onPet?: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  currentState: string;
  hunger: number;
  energy: number;
  happiness: number;
  cleanliness: number;
  totalFoodStock: number;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  activeTray,
  onSelectTray,
  onToggleSleep,
  onToggleChat,
  isChatOpen,
  currentState,
  hunger,
  energy,
  happiness,
  cleanliness,
  totalFoodStock,
}) => {
  const isSleeping = currentState === "sleep";

  const handleTrayClick = (tray: "food" | "toy" | "bath") => {
    soundEffects.playPop();
    onSelectTray(tray);
  };

  return (
    <nav
      aria-label="Aksi Perawatan Juro"
      className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] max-w-[calc(100vw-1rem)] select-none"
    >
      {/* 1. Makan */}
      <button
        type="button"
        onClick={() => handleTrayClick("food")}
        className={`relative flex flex-col items-center justify-center min-w-[46px] sm:min-w-[54px] h-11 sm:h-12 px-1.5 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange ${
          activeTray === "food"
            ? "bg-juro-orange text-white"
            : "bg-white dark:bg-neutral-800 text-charcoal dark:text-white hover:text-juro-orange"
        }`}
        aria-label="Beri Makan Juro"
        title="Beri Makan"
      >
        <Utensils size={15} strokeWidth={2.5} className="shrink-0" />
        <span className="pixel-text text-[8px] uppercase font-bold mt-0.5 leading-none">
          Makan
        </span>
        {hunger < 35 && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-charcoal animate-pulse"
            aria-label="Juro lapar"
          />
        )}
        {totalFoodStock > 0 && activeTray !== "food" && (
          <span className="absolute -bottom-1 -right-1 pixel-text text-[7px] font-bold px-1 bg-charcoal text-white leading-none py-0.5">
            {totalFoodStock}
          </span>
        )}
      </button>

      {/* 2. Main */}
      <button
        type="button"
        onClick={() => handleTrayClick("toy")}
        className={`relative flex flex-col items-center justify-center min-w-[46px] sm:min-w-[54px] h-11 sm:h-12 px-1.5 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
          activeTray === "toy"
            ? "bg-rose-500 text-white"
            : "bg-white dark:bg-neutral-800 text-charcoal dark:text-white hover:text-rose-500"
        }`}
        aria-label="Ajak Juro Main"
        title="Main Bersama"
      >
        <Gamepad2 size={15} strokeWidth={2.5} className="shrink-0" />
        <span className="pixel-text text-[8px] uppercase font-bold mt-0.5 leading-none">
          Main
        </span>
        {happiness < 35 && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-charcoal animate-pulse"
            aria-label="Juro bosan"
          />
        )}
      </button>

      {/* 3. Mandi */}
      <button
        type="button"
        onClick={() => handleTrayClick("bath")}
        className={`relative flex flex-col items-center justify-center min-w-[46px] sm:min-w-[54px] h-11 sm:h-12 px-1.5 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          activeTray === "bath"
            ? "bg-sky-500 text-white"
            : "bg-white dark:bg-neutral-800 text-charcoal dark:text-white hover:text-sky-500"
        }`}
        aria-label="Mandikan Juro"
        title="Mandikan"
      >
        <Droplets size={15} strokeWidth={2.5} className="shrink-0" />
        <span className="pixel-text text-[8px] uppercase font-bold mt-0.5 leading-none">
          Mandi
        </span>
        {cleanliness < 35 && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-400 border border-charcoal animate-pulse"
            aria-label="Juro kotor"
          />
        )}
      </button>

      {/* 4. Tidur / Bangun */}
      <button
        type="button"
        onClick={onToggleSleep}
        className={`relative flex flex-col items-center justify-center min-w-[46px] sm:min-w-[54px] h-11 sm:h-12 px-1.5 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
          isSleeping
            ? "bg-purple-600 text-white"
            : "bg-white dark:bg-neutral-800 text-charcoal dark:text-white hover:text-purple-500"
        }`}
        aria-label={isSleeping ? "Bangunkan Juro" : "Tidurkan Juro"}
        title={isSleeping ? "Bangunkan Juro" : "Tidurkan Juro"}
      >
        {isSleeping ? (
          <>
            <Sun size={15} strokeWidth={2.5} className="shrink-0 text-amber-300" />
            <span className="pixel-text text-[8px] uppercase font-bold mt-0.5 leading-none">
              Bangun
            </span>
          </>
        ) : (
          <>
            <Moon size={15} strokeWidth={2.5} className="shrink-0 text-purple-500" />
            <span className="pixel-text text-[8px] uppercase font-bold mt-0.5 leading-none">
              Tidur
            </span>
          </>
        )}
        {energy < 30 && !isSleeping && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 border border-charcoal animate-pulse"
            aria-label="Juro mengantuk"
          />
        )}
      </button>

      {/* 5. Bicara (AI Gemini Chat) */}
      <button
        type="button"
        onClick={onToggleChat}
        className={`relative flex flex-col items-center justify-center min-w-[46px] sm:min-w-[54px] h-11 sm:h-12 px-1.5 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange ${
          isChatOpen
            ? "bg-amber-500 text-white"
            : "bg-white dark:bg-neutral-800 text-charcoal dark:text-white hover:text-amber-500"
        }`}
        aria-label="Bicara dengan Juro"
        title="Ngobrol dengan Juro"
      >
        <MessageSquare size={15} strokeWidth={2.5} className="shrink-0" />
        <span className="pixel-text text-[8px] uppercase font-bold mt-0.5 leading-none">
          Bicara
        </span>
      </button>
    </nav>
  );
};
