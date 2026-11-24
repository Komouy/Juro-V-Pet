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
 * Perfectly centered directly above Juro's head with a downward pointing tail that tracks Juro's horizontal position.
 * Automatically flips below Juro if Juro walks too close to the top edge of the screen.
 * Tracks Juro smoothly at 60fps via requestAnimationFrame without CSS transition lag.
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
  const tailRef = useRef<HTMLDivElement>(null);
  const [isPlacedAbove, setIsPlacedAbove] = useState<boolean>(true);

  // Dynamic 60fps position tracking directly above Juro's head
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
        const bubbleW = bubbleEl.offsetWidth || 220;
        const bubbleH = bubbleEl.offsetHeight || 60;

        // Horizontally center bubble right over Juro's X coordinate
        const targetX = pos.x - bubbleW / 2;
        const clampedX = Math.max(16, Math.min(contW - bubbleW - 16, targetX));

        // Crown/head Y position
        const crownY = pos.headY ?? (pos.y - pos.radiusPx);

        // Check vertical clearance: if there is enough space above, position above; otherwise flip below
        const spaceAbove = crownY - 14;
        const placeAbove = spaceAbove >= bubbleH + 12;

        setIsPlacedAbove((prev) => (prev !== placeAbove ? placeAbove : prev));

        let clampedY: number;
        if (placeAbove) {
          clampedY = Math.max(14, crownY - bubbleH - 12);
        } else {
          clampedY = Math.min(contH - bubbleH - 16, pos.y + (pos.radiusPx * 0.75) + 14);
        }

        // Apply smooth GPU-accelerated transform without CSS transition lag
        bubbleEl.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;

        // Position pointer tail to point directly towards Juro's center
        if (tailRef.current) {
          const tailX = Math.max(16, Math.min(bubbleW - 16, pos.x - clampedX));
          tailRef.current.style.left = `${tailX}px`;
        }
      }
      animId = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => cancelAnimationFrame(animId);
  }, [open, targetPosRef, containerRef]);

  if (!open) return null;

  // Fallback initial calculations for static rendering or isolated tests
  const contW = containerWidth || (typeof window !== "undefined" ? window.innerWidth : 800);
  const contH = containerHeight || (typeof window !== "undefined" ? window.innerHeight : 600);
  const fallbackX = screenX ?? contW / 2;
  const fallbackY = headY ?? contH / 2;
  const bubbleW = Math.min(260, contW - 24);
  const bubbleH = 64;

  const initialX = Math.max(16, Math.min(contW - bubbleW - 16, fallbackX - bubbleW / 2));
  const placeAboveInitial = fallbackY - 14 >= bubbleH + 12;
  const initialY = placeAboveInitial
    ? Math.max(14, fallbackY - bubbleH - 12)
    : Math.min(contH - bubbleH - 16, fallbackY + 45);
  const initialTailLeft = Math.max(16, Math.min(bubbleW - 16, fallbackX - initialX));

  return (
    <div
      ref={rootRef}
      data-speech-bubble="true"
      style={{
        transform: `translate3d(${initialX}px, ${initialY}px, 0)`,
        maxWidth: `${bubbleW}px`,
        width: "max-content",
      }}
      className="absolute top-0 left-0 z-35 pointer-events-auto will-change-transform select-none"
    >
      <div className="relative animate-tray-enter p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg">
        {/* Dynamic Pointer Tail */}
        {isPlacedAbove ? (
          <div
            ref={tailRef}
            style={{ left: `${initialTailLeft}px` }}
            className="absolute -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white dark:bg-neutral-900 rotate-45 border-r border-b border-neutral-200 dark:border-neutral-700 pointer-events-none"
            aria-hidden="true"
          />
        ) : (
          <div
            ref={tailRef}
            style={{ left: `${initialTailLeft}px` }}
            className="absolute -top-1.5 -translate-x-1/2 w-3 h-3 bg-white dark:bg-neutral-900 rotate-45 border-l border-t border-neutral-200 dark:border-neutral-700 pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-neutral-200 dark:border-neutral-800 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-juro-orange inline-block" />
            <span className="text-xs font-semibold text-juro-orange">
              {petName}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-0.5 rounded-md transition-colors cursor-pointer"
            aria-label="Tutup pesan"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Content: Loading Dots or Juro's Reply */}
        {isLoading ? (
          <div className="flex items-center gap-1.5 py-0.5 text-neutral-700 dark:text-neutral-200">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
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
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
              {text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
