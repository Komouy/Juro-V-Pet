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
      <div className="animate-tray-enter relative flex items-center justify-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] max-w-[calc(100vw-20px)] sm:max-w-none">
        <div
          ref={tailRef}
          style={{ left: "50%" }}
          className={`absolute -translate-x-1/2 w-3 h-3 bg-warm-white dark:bg-neutral-900 rotate-45 pointer-events-none transition-[left] duration-75 ${
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
          className="relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[7.5px] sm:text-[9.5px] uppercase font-bold tracking-tight sm:tracking-wider transition-all cursor-pointer select-none min-w-[48px] sm:min-w-0"
        >
          <Utensils size={14} strokeWidth={2.5} className="shrink-0 text-juro-orange" />
          <span className="leading-none">Makan</span>
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
          className="relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-rose-500 hover:text-rose-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[7.5px] sm:text-[9.5px] uppercase font-bold tracking-tight sm:tracking-wider transition-all cursor-pointer select-none min-w-[48px] sm:min-w-0"
        >
          <Gamepad2 size={14} strokeWidth={2.5} className="shrink-0 text-rose-500" />
          <span className="leading-none">Main</span>
        </button>

        {/* 3. Tidur / Bangun */}
        <button
          type="button"
          onClick={() => onAction("sleep")}
          className="relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-purple-500 hover:text-purple-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[7.5px] sm:text-[9.5px] uppercase font-bold tracking-tight sm:tracking-wider transition-all cursor-pointer select-none min-w-[48px] sm:min-w-0"
        >
          {currentState === "sleep" ? (
            <>
              <Sun size={14} strokeWidth={2.5} className="text-amber-500 shrink-0" />
              <span className="leading-none">Bangun</span>
            </>
          ) : (
            <>
              <Moon size={14} strokeWidth={2.5} className="text-purple-500 shrink-0" />
              <span className="leading-none">Tidur</span>
            </>
          )}
        </button>

        {/* 4. Mandi */}
        <button
          type="button"
          onClick={() => onAction("bath")}
          className="relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-sky-400 hover:text-sky-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[7.5px] sm:text-[9.5px] uppercase font-bold tracking-tight sm:tracking-wider transition-all cursor-pointer select-none min-w-[48px] sm:min-w-0"
        >
          <Droplets size={14} strokeWidth={2.5} className="text-sky-500 shrink-0" />
          <span className="leading-none">Mandi</span>
        </button>

        {/* 5. Pegang */}
        <button
          type="button"
          onClick={() => onAction("grab")}
          className="relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-charcoal dark:text-white border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange hover:text-juro-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none pixel-text text-[7.5px] sm:text-[9.5px] uppercase font-bold tracking-tight sm:tracking-wider transition-all cursor-pointer select-none min-w-[48px] sm:min-w-0"
        >
          <Hand size={14} strokeWidth={2.5} className="text-juro-orange shrink-0" />
          <span className="leading-none">Pegang</span>
        </button>
      </div>
    </div>
  );
};
