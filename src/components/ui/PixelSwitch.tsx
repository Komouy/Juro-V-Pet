import React from "react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useUIStore } from "../../stores/uiStore";

export interface PixelSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const PixelSwitch: React.FC<PixelSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  const { soundEnabled } = useUIStore();

  const handleToggle = () => {
    if (disabled) return;
    if (soundEnabled) {
      soundEffects.playSquish();
    }
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`
        flex items-center justify-between gap-4 select-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer group"}
      `}
    >
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <p className="pixel-text text-xs text-charcoal dark:text-neutral-100 uppercase tracking-wider font-bold group-hover:text-juro-orange transition-colors">
              {label}
            </p>
          )}
          {description && (
            <p className="pixel-text text-[9px] text-muted dark:text-neutral-400 mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Tactile Retro Pixel Track */}
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`
          relative w-14 h-7 border-2 border-charcoal dark:border-neutral-600
          transition-colors duration-100 flex items-center px-0.5
          shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange
          ${
            checked
              ? "bg-juro-orange"
              : "bg-neutral-200 dark:bg-neutral-800"
          }
        `}
      >
        {/* State Label Text Inside Track */}
        <span
          className={`
            pixel-text text-[8px] font-bold absolute tracking-tighter
            ${
              checked
                ? "left-1.5 text-white"
                : "right-1.5 text-charcoal/60 dark:text-neutral-400"
            }
          `}
        >
          {checked ? "ON" : "OFF"}
        </span>

        {/* Sliding Mechanical Pixel Thumb */}
        <div
          className={`
            w-5 h-5 bg-white dark:bg-neutral-200 border-2 border-charcoal
            shadow-[1px_1px_0px_#171717]
            transition-transform duration-100 flex items-center justify-center
            ${checked ? "translate-x-7" : "translate-x-0"}
          `}
        >
          {/* Subtle tactile grip lines on thumb */}
          <div className="flex flex-col gap-[2px]">
            <div className="w-2 h-[2px] bg-charcoal/40" />
            <div className="w-2 h-[2px] bg-charcoal/40" />
          </div>
        </div>
      </div>
    </div>
  );
};
