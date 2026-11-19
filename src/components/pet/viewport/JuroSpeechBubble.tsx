import React from "react";
import { X } from "lucide-react";

export interface JuroSpeechBubbleProps {
  open: boolean;
  text: string;
  isLoading: boolean;
  screenX: number;
  headY: number;
  containerWidth: number;
  containerHeight: number;
  onClose: () => void;
  petName?: string;
}

/**
 * Juro's Floating Retro Speech Bubble
 * Dynamically positions to the left or right of Juro on screen, with a directional triangular pointer tail.
 */
export const JuroSpeechBubble: React.FC<JuroSpeechBubbleProps> = ({
  open,
  text,
  isLoading,
  screenX,
  headY,
  containerWidth,
  containerHeight,
  onClose,
  petName = "JURO",
}) => {
  if (!open) return null;

  const contW = containerWidth || (typeof window !== "undefined" ? window.innerWidth : 800);
  const contH = containerHeight || (typeof window !== "undefined" ? window.innerHeight : 600);

  // Determine whether to place speech bubble on Juro's Left or Right side
  const placeOnLeft = screenX >= contW / 2;

  // Max width of the retro bubble
  const bubbleW = Math.min(260, contW - 48);

  // Horizontal position calculation
  let bubbleX: number;
  if (placeOnLeft) {
    // Bubble sits on the left of Juro
    const targetLeft = screenX - bubbleW - 28;
    bubbleX = Math.max(12, targetLeft);
  } else {
    // Bubble sits on the right of Juro
    const targetLeft = screenX + 28;
    bubbleX = Math.min(contW - bubbleW - 12, targetLeft);
  }

  // Vertical position centered around Juro's head
  const bubbleY = Math.max(24, Math.min(contH - 120, headY - 45));

  return (
    <div
      style={{
        left: `${bubbleX}px`,
        top: `${bubbleY}px`,
        maxWidth: `${bubbleW}px`,
      }}
      className="absolute z-35 pointer-events-auto transition-transform duration-100 ease-out select-none"
    >
      <div className="relative animate-tray-enter p-2 sm:p-2.5 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000]">
        {/* Directional Pointer Tail */}
        {placeOnLeft ? (
          // Tail on the right side pointing right towards Juro
          <div
            style={{ top: "18px" }}
            className="absolute -right-2 w-3.5 h-3.5 bg-warm-white dark:bg-neutral-900 rotate-45 border-t-2 border-r-2 border-charcoal dark:border-neutral-600 pointer-events-none"
            aria-hidden="true"
          />
        ) : (
          // Tail on the left side pointing left towards Juro
          <div
            style={{ top: "18px" }}
            className="absolute -left-2 w-3.5 h-3.5 bg-warm-white dark:bg-neutral-900 rotate-45 border-b-2 border-l-2 border-charcoal dark:border-neutral-600 pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Header Bar: Pet Name Badge + Close Icon */}
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-charcoal/20 dark:border-neutral-700/60 mb-1.5">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-juro-orange inline-block" />
            <span className="pixel-text text-[7.5px] sm:text-[8.5px] font-bold text-juro-orange uppercase tracking-wider">
              {petName}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-charcoal dark:hover:text-white p-0.5 transition-colors cursor-pointer"
            aria-label="Tutup pesan"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content: Loading Dots or Juro's Reply */}
        {isLoading ? (
          <div className="flex items-center gap-1.5 py-1 text-charcoal dark:text-neutral-200">
            <span className="pixel-text text-[8.5px] sm:text-[9.5px] text-neutral-500 dark:text-neutral-400">
              Juro berpikir
            </span>
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 bg-juro-orange rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 bg-juro-orange rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 bg-juro-orange rounded-full animate-bounce" />
            </span>
          </div>
        ) : (
          <div className="relative">
            <p className="pixel-text text-[8px] sm:text-[9.5px] leading-relaxed text-charcoal dark:text-neutral-100 font-medium">
              {text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
