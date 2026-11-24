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
      className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1 p-1 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/80 dark:border-neutral-800 shadow-lg max-w-[calc(100vw-1rem)] select-none"
    >
      {/* 1. Makan */}
      <button
        type="button"
        onClick={() => handleTrayClick("food")}
        className={`relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[58px] h-11 sm:h-12 px-2 rounded-xl active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange ${
          activeTray === "food"
            ? "bg-juro-orange text-white shadow-xs"
            : "text-neutral-700 dark:text-neutral-200 hover:bg-orange-50 hover:text-juro-orange dark:hover:bg-neutral-800"
        }`}
        aria-label="Beri Makan Juro"
        title="Beri Makan"
      >
        <Utensils size={16} strokeWidth={2} className="shrink-0" />
        <span className="text-[11px] font-medium mt-0.5 leading-none">
          Makan
        </span>
        {hunger < 35 && (
          <span
            className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-900"
            aria-label="Juro lapar"
          />
        )}
        {totalFoodStock > 0 && activeTray !== "food" && hunger >= 35 && (
          <span className="absolute top-1 right-1.5 text-[10px] font-semibold tabular-nums text-juro-orange leading-none">
            {totalFoodStock}
          </span>
        )}
      </button>

      {/* 2. Main */}
      <button
        type="button"
        onClick={() => handleTrayClick("toy")}
        className={`relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[58px] h-11 sm:h-12 px-2 rounded-xl active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
          activeTray === "toy"
            ? "bg-rose-500 text-white shadow-xs"
            : "text-neutral-700 dark:text-neutral-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-neutral-800"
        }`}
        aria-label="Ajak Juro Main"
        title="Main Bersama"
      >
        <Gamepad2 size={16} strokeWidth={2} className="shrink-0" />
        <span className="text-[11px] font-medium mt-0.5 leading-none">
          Main
        </span>
        {happiness < 35 && (
          <span
            className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-900"
            aria-label="Juro bosan"
          />
        )}
      </button>

      {/* 3. Mandi */}
      <button
        type="button"
        onClick={() => handleTrayClick("bath")}
        className={`relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[58px] h-11 sm:h-12 px-2 rounded-xl active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          activeTray === "bath"
            ? "bg-sky-500 text-white shadow-xs"
            : "text-neutral-700 dark:text-neutral-200 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-neutral-800"
        }`}
        aria-label="Mandikan Juro"
        title="Mandikan"
      >
        <Droplets size={16} strokeWidth={2} className="shrink-0" />
        <span className="text-[11px] font-medium mt-0.5 leading-none">
          Mandi
        </span>
        {cleanliness < 35 && (
          <span
            className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-neutral-900"
            aria-label="Juro kotor"
          />
        )}
      </button>

      {/* 4. Tidur / Bangun */}
      <button
        type="button"
        onClick={onToggleSleep}
        className={`relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[58px] h-11 sm:h-12 px-2 rounded-xl active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
          isSleeping
            ? "bg-purple-600 text-white shadow-xs"
            : "text-neutral-700 dark:text-neutral-200 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-neutral-800"
        }`}
        aria-label={isSleeping ? "Bangunkan Juro" : "Tidurkan Juro"}
        title={isSleeping ? "Bangunkan Juro" : "Tidurkan Juro"}
      >
        {isSleeping ? (
          <>
            <Sun size={16} strokeWidth={2} className="shrink-0 text-amber-300" />
            <span className="text-[11px] font-medium mt-0.5 leading-none">
              Bangun
            </span>
          </>
        ) : (
          <>
            <Moon size={16} strokeWidth={2} className="shrink-0 text-purple-500" />
            <span className="text-[11px] font-medium mt-0.5 leading-none">
              Tidur
            </span>
          </>
        )}
        {energy < 30 && !isSleeping && (
          <span
            className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-neutral-900"
            aria-label="Juro mengantuk"
          />
        )}
      </button>

      {/* 5. Bicara */}
      <button
        type="button"
        onClick={onToggleChat}
        className={`relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[58px] h-11 sm:h-12 px-2 rounded-xl active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange ${
          isChatOpen
            ? "bg-amber-500 text-white shadow-xs"
            : "text-neutral-700 dark:text-neutral-200 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-neutral-800"
        }`}
        aria-label="Bicara dengan Juro"
        title="Ngobrol dengan Juro"
      >
        <MessageSquare size={16} strokeWidth={2} className="shrink-0" />
        <span className="text-[11px] font-medium mt-0.5 leading-none">
          Bicara
        </span>
      </button>
    </nav>
  );
};
