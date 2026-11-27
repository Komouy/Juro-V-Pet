import React, { useState } from "react";
import { Utensils, Gamepad2, Sun, Moon, Droplets, Send } from "lucide-react";
import { soundEffects } from "../../../engine/audio/soundEffects";
import { NotchedSlot } from "../../ui/CartridgeFrame";

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
  const [isFocused, setIsFocused] = useState(false);

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
      <div className="animate-tray-enter relative flex flex-col gap-2 p-2.5 rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_4px_0_#18181B] dark:shadow-[0_4px_0_#09090B] max-w-[calc(100vw-20px)] sm:max-w-none">
        <div
          ref={tailRef}
          style={{ left: "50%" }}
          className={`absolute -translate-x-1/2 w-3 h-3 bg-[#FDFBF7] dark:bg-[#1E2028] rotate-45 pointer-events-none transition-[left] duration-75 ${
            isNearTop
              ? "-top-2 border-l-2 border-t-2 border-charcoal dark:border-[#4A4E5E]"
              : "-bottom-2 border-r-2 border-b-2 border-charcoal dark:border-[#4A4E5E]"
          }`}
          aria-hidden="true"
        />

        {/* Notched Cartridge Chat Input Box */}
        <form onSubmit={handleChatSubmit} className="flex items-center gap-1.5 w-full">
          <NotchedSlot className="flex-1 min-w-0" innerClassName="px-2.5 py-1.5 gap-1.5">
            <span className="font-pixel text-xs font-bold text-juro-orange shrink-0 leading-none">
              &gt;
            </span>
            {isFocused && !isChatLoading && (
              <span
                aria-hidden="true"
                className="animate-console-cursor inline-block w-1.5 h-3.5 bg-juro-orange shrink-0"
              />
            )}
            <input
              type="text"
              value={chatInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                soundEffects.playKeyTap();
                setChatInput(e.target.value);
              }}
              placeholder="Tulis pesan untuk Juro..."
              maxLength={100}
              disabled={isChatLoading}
              className="font-mono-hud text-xs sm:text-sm bg-transparent text-charcoal dark:text-white placeholder:text-neutral-500 caret-juro-orange focus:outline-none flex-1 min-w-0"
            />
          </NotchedSlot>

          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className={`console-btn-bevel h-9 px-2.5 rounded-[4px] border-2 border-charcoal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange inline-flex items-center justify-center shrink-0 ${
              chatInput.trim() && !isChatLoading
                ? "bg-juro-orange text-white shadow-[0_2px_0_#18181B] hover:bg-[#EA580C] cursor-pointer"
                : "bg-[#EFE9DC] dark:bg-[#101114] text-neutral-400 cursor-not-allowed opacity-60"
            }`}
            aria-label="Kirim pesan ke Juro"
            title="Kirim pesan"
          >
            <Send size={13} strokeWidth={2.2} />
          </button>
        </form>

        {/* 4 Bottom Console Keycaps: Makan | Main | Tidur/Bangun | Mandi */}
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => onAction("food")}
            className="console-btn-bevel relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-[4px] min-h-[42px] sm:min-h-[38px] bg-[#EFE9DC] dark:bg-[#101114] text-charcoal dark:text-white border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] hover:border-juro-orange hover:text-juro-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange font-pixel text-[11px] font-bold uppercase cursor-pointer select-none min-w-[54px] sm:min-w-0"
          >
            <Utensils size={14} strokeWidth={2.2} className="shrink-0 text-juro-orange" />
            <span className="leading-none">Makan</span>
            {totalFoodStock === 0 && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-[2px] bg-rose-500 border border-charcoal"
                aria-hidden="true"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => onAction("toy")}
            className="console-btn-bevel relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-[4px] min-h-[42px] sm:min-h-[38px] bg-[#EFE9DC] dark:bg-[#101114] text-charcoal dark:text-white border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] hover:border-rose-500 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 font-pixel text-[11px] font-bold uppercase cursor-pointer select-none min-w-[54px] sm:min-w-0"
          >
            <Gamepad2 size={14} strokeWidth={2.2} className="shrink-0 text-rose-500" />
            <span className="leading-none">Main</span>
          </button>

          <button
            type="button"
            onClick={() => onAction("sleep")}
            className="console-btn-bevel relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-[4px] min-h-[42px] sm:min-h-[38px] bg-[#EFE9DC] dark:bg-[#101114] text-charcoal dark:text-white border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] hover:border-indigo-500 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-pixel text-[11px] font-bold uppercase cursor-pointer select-none min-w-[54px] sm:min-w-0"
          >
            {currentState === "sleep" ? (
              <>
                <Sun size={14} strokeWidth={2.2} className="text-amber-500 shrink-0" />
                <span className="leading-none">Bangun</span>
              </>
            ) : (
              <>
                <Moon size={14} strokeWidth={2.2} className="text-indigo-500 shrink-0" />
                <span className="leading-none">Tidur</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onAction("bath")}
            className="console-btn-bevel relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-[4px] min-h-[42px] sm:min-h-[38px] bg-[#EFE9DC] dark:bg-[#101114] text-charcoal dark:text-white border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] hover:border-sky-500 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 font-pixel text-[11px] font-bold uppercase cursor-pointer select-none min-w-[54px] sm:min-w-0"
          >
            <Droplets size={14} strokeWidth={2.2} className="text-sky-500 shrink-0" />
            <span className="leading-none">Mandi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
