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
      className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1.5 p-1.5 rounded-[6px] bg-[#EFE9DC] dark:bg-[#141519] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_4px_0_#18181B] dark:shadow-[0_4px_0_#09090B] max-w-[calc(100vw-1rem)] select-none"
    >
      {/* 1. Makan */}
      <button
        type="button"
        onClick={() => handleTrayClick("food")}
        className={`console-btn-bevel relative flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] h-11 sm:h-12 px-2 rounded-[4px] border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange ${
          activeTray === "food"
            ? "bg-juro-orange text-white border-charcoal shadow-[0_1px_0_#18181B] translate-y-[1px]"
            : "bg-[#FDFBF7] text-charcoal border-charcoal shadow-[0_2px_0_#18181B] hover:border-juro-orange hover:text-juro-orange dark:bg-[#1E2028] dark:text-neutral-100 dark:border-[#3F424E] dark:shadow-[0_2px_0_#09090B]"
        }`}
        aria-label="Beri Makan Juro"
        title="Beri Makan"
      >
        <Utensils size={15} strokeWidth={2.2} className="shrink-0" />
        <span className="font-pixel text-[10px] font-bold uppercase mt-1 leading-none">
          Makan
        </span>
        {hunger < 35 && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-[2px] bg-rose-500 border border-charcoal"
            aria-label="Juro lapar"
          />
        )}
        {totalFoodStock > 0 && activeTray !== "food" && hunger >= 35 && (
          <span className="font-mono-hud absolute top-0.5 right-1 text-[10px] font-bold text-juro-orange leading-none">
            {totalFoodStock}
          </span>
        )}
      </button>

      {/* 2. Main */}
      <button
        type="button"
        onClick={() => handleTrayClick("toy")}
        className={`console-btn-bevel relative flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] h-11 sm:h-12 px-2 rounded-[4px] border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
          activeTray === "toy"
            ? "bg-rose-600 text-white border-charcoal shadow-[0_1px_0_#18181B] translate-y-[1px]"
            : "bg-[#FDFBF7] text-charcoal border-charcoal shadow-[0_2px_0_#18181B] hover:border-rose-500 hover:text-rose-600 dark:bg-[#1E2028] dark:text-neutral-100 dark:border-[#3F424E] dark:shadow-[0_2px_0_#09090B]"
        }`}
        aria-label="Ajak Juro Main"
        title="Main Bersama"
      >
        <Gamepad2 size={15} strokeWidth={2.2} className="shrink-0" />
        <span className="font-pixel text-[10px] font-bold uppercase mt-1 leading-none">
          Main
        </span>
        {happiness < 35 && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-[2px] bg-rose-500 border border-charcoal"
            aria-label="Juro bosan"
          />
        )}
      </button>

      {/* 3. Mandi */}
      <button
        type="button"
        onClick={() => handleTrayClick("bath")}
        className={`console-btn-bevel relative flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] h-11 sm:h-12 px-2 rounded-[4px] border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          activeTray === "bath"
            ? "bg-sky-600 text-white border-charcoal shadow-[0_1px_0_#18181B] translate-y-[1px]"
            : "bg-[#FDFBF7] text-charcoal border-charcoal shadow-[0_2px_0_#18181B] hover:border-sky-500 hover:text-sky-600 dark:bg-[#1E2028] dark:text-neutral-100 dark:border-[#3F424E] dark:shadow-[0_2px_0_#09090B]"
        }`}
        aria-label="Mandikan Juro"
        title="Mandikan"
      >
        <Droplets size={15} strokeWidth={2.2} className="shrink-0" />
        <span className="font-pixel text-[10px] font-bold uppercase mt-1 leading-none">
          Mandi
        </span>
        {cleanliness < 35 && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-[2px] bg-sky-500 border border-charcoal"
            aria-label="Juro kotor"
          />
        )}
      </button>

      {/* 4. Tidur / Bangun */}
      <button
        type="button"
        onClick={onToggleSleep}
        className={`console-btn-bevel relative flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] h-11 sm:h-12 px-2 rounded-[4px] border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isSleeping
            ? "bg-indigo-600 text-white border-charcoal shadow-[0_1px_0_#18181B] translate-y-[1px]"
            : "bg-[#FDFBF7] text-charcoal border-charcoal shadow-[0_2px_0_#18181B] hover:border-indigo-500 hover:text-indigo-600 dark:bg-[#1E2028] dark:text-neutral-100 dark:border-[#3F424E] dark:shadow-[0_2px_0_#09090B]"
        }`}
        aria-label={isSleeping ? "Bangunkan Juro" : "Tidurkan Juro"}
        title={isSleeping ? "Bangunkan Juro" : "Tidurkan Juro"}
      >
        {isSleeping ? (
          <>
            <Sun size={15} strokeWidth={2.2} className="shrink-0 text-amber-300" />
            <span className="font-pixel text-[10px] font-bold uppercase mt-1 leading-none">
              Bangun
            </span>
          </>
        ) : (
          <>
            <Moon size={15} strokeWidth={2.2} className="shrink-0 text-indigo-500 dark:text-indigo-400" />
            <span className="font-pixel text-[10px] font-bold uppercase mt-1 leading-none">
              Tidur
            </span>
          </>
        )}
        {energy < 30 && !isSleeping && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-[2px] bg-amber-400 border border-charcoal"
            aria-label="Juro mengantuk"
          />
        )}
      </button>

      {/* 5. Bicara */}
      <button
        type="button"
        onClick={onToggleChat}
        className={`console-btn-bevel relative flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] h-11 sm:h-12 px-2 rounded-[4px] border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange ${
          isChatOpen
            ? "bg-amber-500 text-charcoal border-charcoal shadow-[0_1px_0_#18181B] translate-y-[1px]"
            : "bg-[#FDFBF7] text-charcoal border-charcoal shadow-[0_2px_0_#18181B] hover:border-juro-orange hover:text-juro-orange dark:bg-[#1E2028] dark:text-neutral-100 dark:border-[#3F424E] dark:shadow-[0_2px_0_#09090B]"
        }`}
        aria-label="Bicara dengan Juro"
        title="Ngobrol dengan Juro"
      >
        <MessageSquare size={15} strokeWidth={2.2} className="shrink-0" />
        <span className="font-pixel text-[10px] font-bold uppercase mt-1 leading-none">
          Bicara
        </span>
      </button>
    </nav>
  );
};
