import React, { useState } from "react";
import { Utensils, Gamepad2, Sun, Moon, Droplets, MessageSquare, Send } from "lucide-react";
import { soundEffects } from "../../../engine/audio/soundEffects";

export interface JuroContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  isNearTop: boolean;
  currentState: string;
  totalFoodStock: number;
  onAction: (action: "food" | "toy" | "sleep" | "bath") => void;
  onSendMessage?: (message: string) => void;
  isChatLoading?: boolean;
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
  onSendMessage,
  isChatLoading = false,
  menuRef,
  tailRef,
}) => {
  const [chatInput, setChatInput] = useState("");

  if (!open) return null;

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (trimmed && !isChatLoading) {
      onSendMessage?.(trimmed);
      setChatInput("");
    }
  };

  return (
    <div
      ref={menuRef}
      data-juro-menu="true"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      className={`absolute z-40 pointer-events-auto -translate-x-1/2 ${
        isNearTop ? "translate-y-2" : "-translate-y-full"
      }`}
    >
      <div className="animate-tray-enter relative flex flex-col gap-2 p-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl max-w-[calc(100vw-20px)] sm:max-w-none">
        <div
          ref={tailRef}
          style={{ left: "50%" }}
          className={`absolute -translate-x-1/2 w-3 h-3 bg-white dark:bg-neutral-900 rotate-45 pointer-events-none transition-[left] duration-75 ${
            isNearTop
              ? "-top-1.5 border-l border-t border-neutral-200 dark:border-neutral-700"
              : "-bottom-1.5 border-r border-b border-neutral-200 dark:border-neutral-700"
          }`}
          aria-hidden="true"
        />

        {/* Chat Input Box */}
        <form
          onSubmit={handleChatSubmit}
          className="flex items-center gap-2 w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 focus-within:border-juro-orange focus-within:ring-2 focus-within:ring-juro-orange/20"
        >
          <MessageSquare size={15} className="text-juro-orange shrink-0" />
          <input
            type="text"
            value={chatInput}
            onChange={(e) => {
              soundEffects.playKeyTap();
              setChatInput(e.target.value);
            }}
            placeholder="Tulis pesan untuk Juro..."
            maxLength={100}
            disabled={isChatLoading}
            className="text-xs sm:text-sm bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none flex-1 min-w-0"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className={`p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange ${
              chatInput.trim() && !isChatLoading
                ? "bg-juro-orange text-white hover:bg-orange-600 active:scale-95 cursor-pointer"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60"
            }`}
            aria-label="Kirim pesan ke Juro"
            title="Kirim pesan"
          >
            <Send size={13} strokeWidth={2} />
          </button>
        </form>

        {/* 4 Bottom Action Buttons: Makan | Main | Bangun/Tidur | Mandi */}
        <div className="flex items-center justify-center gap-1.5">
          {/* 1. Makan */}
          <button
            type="button"
            onClick={() => onAction("food")}
            className="relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl min-h-[42px] sm:min-h-0 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:border-juro-orange hover:text-juro-orange active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange text-xs font-medium transition-all cursor-pointer select-none min-w-[54px] sm:min-w-0"
          >
            <Utensils size={15} strokeWidth={2} className="shrink-0 text-juro-orange" />
            <span className="leading-none">Makan</span>
            {totalFoodStock === 0 && (
              <span
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-900"
                aria-hidden="true"
              />
            )}
          </button>

          {/* 2. Main */}
          <button
            type="button"
            onClick={() => onAction("toy")}
            className="relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl min-h-[42px] sm:min-h-0 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:border-rose-400 hover:text-rose-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 text-xs font-medium transition-all cursor-pointer select-none min-w-[54px] sm:min-w-0"
          >
            <Gamepad2 size={15} strokeWidth={2} className="shrink-0 text-rose-500" />
            <span className="leading-none">Main</span>
          </button>

          {/* 3. Tidur / Bangun */}
          <button
            type="button"
            onClick={() => onAction("sleep")}
            className="relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl min-h-[42px] sm:min-h-0 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:border-purple-400 hover:text-purple-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 text-xs font-medium transition-all cursor-pointer select-none min-w-[54px] sm:min-w-0"
          >
            {currentState === "sleep" ? (
              <>
                <Sun size={15} strokeWidth={2} className="text-amber-500 shrink-0" />
                <span className="leading-none">Bangun</span>
              </>
            ) : (
              <>
                <Moon size={15} strokeWidth={2} className="text-purple-500 shrink-0" />
                <span className="leading-none">Tidur</span>
              </>
            )}
          </button>

          {/* 4. Mandi */}
          <button
            type="button"
            onClick={() => onAction("bath")}
            className="relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl min-h-[42px] sm:min-h-0 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:border-sky-400 hover:text-sky-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 text-xs font-medium transition-all cursor-pointer select-none min-w-[54px] sm:min-w-0"
          >
            <Droplets size={15} strokeWidth={2} className="text-sky-500 shrink-0" />
            <span className="leading-none">Mandi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
