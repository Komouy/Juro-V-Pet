import React from "react";
import { Utensils, Gamepad2, Sun, Moon, Droplets, Hand } from "lucide-react";

export interface JuroContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  isNearTop: boolean;
  currentState: string;
  totalFoodStock: number;
  onAction: (action: "food" | "toy" | "sleep" | "bath" | "grab") => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  tailRef?: React.RefObject<HTMLDivElement | null>;
}

export const JuroContextMenu: React.FC<JuroContextMenuProps> = ({
  open,
  x,
  y,
  isNearTop,
  currentState,
  totalFoodStock,
  onAction,
  menuRef,
  tailRef,
}) => {
  if (!open) return null;

  return (
    <div
      ref={menuRef}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      className={`absolute z-30 pointer-events-auto -translate-x-1/2 ${
        isNearTop ? "translate-y-2" : "-translate-y-full"
      }`}
    >
      <div className="animate-tray-enter relative inline-flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000]">
        <div
          ref={tailRef}
          className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-warm-white dark:bg-neutral-900 rotate-45 ${
            isNearTop
              ? "-top-1.5 border-l-2 border-t-2 border-charcoal dark:border-neutral-600"
              : "-bottom-1.5 border-r-2 border-b-2 border-charcoal dark:border-neutral-600"
          }`}
          aria-hidden="true"
        />

        {/* 1. Makan */}
        <button
          type="button"
          onClick={() => onAction("food")}
          className="relative inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
        >
          <Utensils size={13} strokeWidth={2.5} className="shrink-0 text-juro-orange" />
          <span>Makan</span>
          {totalFoodStock === 0 && (
            <span
              className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 border border-charcoal"
              aria-hidden="true"
            />
          )}
        </button>

        {/* 2. Main */}
        <button
          type="button"
          onClick={() => onAction("toy")}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
        >
          <Gamepad2 size={13} strokeWidth={2.5} className="shrink-0 text-rose-500" />
          <span>Main</span>
        </button>

        {/* 3. Tidur / Bangun */}
        <button
          type="button"
          onClick={() => onAction("sleep")}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
        >
          {currentState === "sleep" ? (
            <>
              <Sun size={13} strokeWidth={2.5} className="text-amber-500 shrink-0" />
              <span>Bangun</span>
            </>
          ) : (
            <>
              <Moon size={13} strokeWidth={2.5} className="text-purple-500 shrink-0" />
              <span>Tidur</span>
            </>
          )}
        </button>

        {/* 4. Mandi */}
        <button
          type="button"
          onClick={() => onAction("bath")}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-sky-400 hover:text-sky-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
        >
          <Droplets size={13} strokeWidth={2.5} className="text-sky-500 shrink-0" />
          <span>Mandi</span>
        </button>

        {/* 5. Pegang */}
        <button
          type="button"
          onClick={() => onAction("grab")}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[9px] sm:text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
        >
          <Hand size={13} strokeWidth={2.5} className="text-juro-orange shrink-0" />
          <span>Pegang</span>
        </button>
      </div>
    </div>
  );
};
