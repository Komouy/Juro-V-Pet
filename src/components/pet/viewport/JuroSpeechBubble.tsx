import React, { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import type { JuroScreenTarget } from "../../../features/character/JuroModel";

export interface JuroSpeechBubbleProps {
  open: boolean;
  text: string;
  isLoading: boolean;
  targetPosRef?: React.RefObject<JuroScreenTarget>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  screenX?: number;
  headY?: number;
  containerWidth?: number;
  containerHeight?: number;
  onClose: () => void;
  petName?: string;
}

/**
 * Juro's Floating Retro Speech Bubble
 * Dynamically positions to the left or right of Juro on screen, with a directional triangular pointer tail.
 * Follows Juro at 60fps via RAF if targetPosRef and containerRef are provided.
 */
export const JuroSpeechBubble: React.FC<JuroSpeechBubbleProps> = ({
  open,
  text,
  isLoading,
  targetPosRef,
  containerRef,
  screenX,
  headY,
  containerWidth,
  containerHeight,
  onClose,
  petName = "JURO",
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [placeOnLeft, setPlaceOnLeft] = useState<boolean>(() => {
    const initX = screenX ?? 400;
    const initW = containerWidth ?? 800;
    return initX >= initW / 2;
  });

  // Dynamic 60fps position tracking attached to Juro's screen coordinates
  useEffect(() => {
    if (!open) return;
    let animId: number;

    const updatePosition = () => {
      if (rootRef.current && targetPosRef?.current && containerRef?.current) {
        const contRect = containerRef.current.getBoundingClientRect();
        const pos = targetPosRef.current;
        const contW = contRect.width || window.innerWidth;
        const contH = contRect.height || window.innerHeight;

        const bubbleEl = rootRef.current;
        const bubbleW = bubbleEl.offsetWidth || 240;
        const shouldPlaceLeft = pos.x >= contW / 2;

        setPlaceOnLeft((prev) => (prev !== shouldPlaceLeft ? shouldPlaceLeft : prev));

        let bubbleX: number;
        if (shouldPlaceLeft) {
          bubbleX = Math.max(12, pos.x - bubbleW - 28);
        } else {
          bubbleX = Math.min(contW - bubbleW - 12, pos.x + 28);
        }

        const crownY = pos.headY ?? (pos.y - pos.radiusPx);
        const bubbleY = Math.max(24, Math.min(contH - 120, crownY - 30));

        bubbleEl.style.left = `${bubbleX}px`;
        bubbleEl.style.top = `${bubbleY}px`;
      }
      animId = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => cancelAnimationFrame(animId);
  }, [open, targetPosRef, containerRef]);

  if (!open) return null;

  // Fallback calculations for static rendering or isolated tests
  const contW = containerWidth || (typeof window !== "undefined" ? window.innerWidth : 800);
  const contH = containerHeight || (typeof window !== "undefined" ? window.innerHeight : 600);
  const fallbackX = screenX ?? contW / 2;
  const fallbackY = headY ?? contH / 2;
  const fallbackLeft = fallbackX >= contW / 2;
  const bubbleW = Math.min(260, contW - 48);

  const initialX = fallbackLeft
    ? Math.max(12, fallbackX - bubbleW - 28)
    : Math.min(contW - bubbleW - 12, fallbackX + 28);
  const initialY = Math.max(24, Math.min(contH - 120, fallbackY - 45));

  return (
    <div
      ref={rootRef}
      style={{
        left: `${initialX}px`,
        top: `${initialY}px`,
        maxWidth: `${bubbleW}px`,
      }}
      className="absolute z-35 pointer-events-auto transition-[left,top] duration-75 ease-out select-none"
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
