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
      soundEffects.playToggle(!checked);
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
            <p className="text-sm font-semibold text-charcoal dark:text-neutral-100 group-hover:text-juro-orange transition-colors">
              {label}
            </p>
          )}
          {description && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Mechanical Console Slide Rocker Switch */}
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`
          relative w-12 h-6 rounded-[4px] border-2 border-charcoal dark:border-[#3F424E] shrink-0
          transition-colors duration-150 flex items-center px-0.5
          shadow-[inset_0_2px_0_rgba(24,24,27,0.18)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange focus-visible:ring-offset-1
          ${
            checked
              ? "bg-juro-orange"
              : "bg-[#D6CEC0] dark:bg-[#101114]"
          }
        `}
      >
        <span
          aria-hidden="true"
          className={`font-pixel text-[8px] font-bold leading-none select-none transition-opacity ${
            checked ? "text-white ml-1 opacity-100" : "opacity-0"
          }`}
        >
          I
        </span>
        <span
          aria-hidden="true"
          className={`font-pixel text-[8px] font-bold leading-none select-none ml-auto mr-1 transition-opacity ${
            !checked ? "text-charcoal/70 dark:text-neutral-400 opacity-100" : "opacity-0"
          }`}
        >
          O
        </span>
        <div
          className={`
            absolute top-0.5 left-0.5 w-5 h-4 rounded-[2px] bg-[#FDFBF7] border-2 border-charcoal
            shadow-[0_1px_0_#18181B] flex items-center justify-center
            transition-transform duration-150
            ${checked ? "translate-x-[22px]" : "translate-x-0"}
          `}
        >
          <span className="w-[2px] h-2 bg-charcoal/40" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};
