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
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-juro-orange transition-colors">
              {label}
            </p>
          )}
          {description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Smooth Modern Pill Switch */}
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`
          relative w-11 h-6 rounded-full shrink-0
          transition-colors duration-200 flex items-center p-0.5
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange focus-visible:ring-offset-1
          ${
            checked
              ? "bg-juro-orange"
              : "bg-neutral-300 dark:bg-neutral-700"
          }
        `}
      >
        <div
          className={`
            w-5 h-5 rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${checked ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </div>
    </div>
  );
};
