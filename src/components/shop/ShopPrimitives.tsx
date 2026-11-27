import React from "react";
import { type LucideIcon } from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";

export interface PriceKeycapButtonProps {
  label: string;
  priceText?: string;
  icon?: LucideIcon;
  tone?: "orange" | "charcoal";
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Primary cartridge keycap button for shop purchases, upgrades, and bulk sales.
 */
export const PriceKeycapButton: React.FC<PriceKeycapButtonProps> = ({
  label,
  priceText,
  icon: Icon,
  tone = "orange",
  disabled = false,
  onClick,
  className = "",
}) => {
  const toneStyle = disabled
    ? "bg-[#EFE9DC] text-neutral-500 border-charcoal/40 dark:bg-[#101114] dark:text-neutral-500 dark:border-[#3F424E]"
    : tone === "orange"
    ? "bg-juro-orange text-white border-charcoal shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_2px_0_#18181B] hover:bg-[#EA580C] active:shadow-none dark:border-[#3F424E] dark:shadow-[inset_0_2px_0_rgba(255,255,255,0.22),0_2px_0_#09090B]"
    : "bg-charcoal text-[#FDFBF7] border-charcoal shadow-[inset_0_2px_0_rgba(255,255,255,0.16),0_2px_0_#09090B] hover:bg-[#27272A] active:shadow-none dark:bg-[#FDFBF7] dark:text-charcoal dark:border-[#3F424E]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        soundEffects.playClick();
        onClick();
      }}
      className={`console-btn-bevel inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-[4px] border-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 ${toneStyle} ${className}`}
    >
      {Icon && <Icon size={13} strokeWidth={2.3} className="shrink-0" />}
      <span className="font-pixel text-[11px] font-bold uppercase leading-none whitespace-nowrap">
        {label}
      </span>
      {priceText && (
        <span
          className={`font-mono-hud text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] leading-none whitespace-nowrap ${
            disabled
              ? "bg-charcoal/10 text-neutral-500 dark:bg-[#1E2028]"
              : "bg-black/20 text-white dark:bg-black/25"
          }`}
        >
          {priceText}
        </span>
      )}
    </button>
  );
};

export interface NotchedActionKeycapProps {
  label: string;
  subText?: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Secondary 45-degree chamfered cartridge keycap for quick stacks (x3) or single-unit sales.
 */
export const NotchedActionKeycap: React.FC<NotchedActionKeycapProps> = ({
  label,
  subText,
  disabled = false,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        soundEffects.playClick();
        onClick();
      }}
      className={`console-btn-bevel cartridge-chamfer p-[2px] min-h-[38px] cursor-pointer select-none disabled:opacity-45 disabled:cursor-not-allowed disabled:translate-y-0 transition-colors ${
        disabled
          ? "bg-charcoal/35 dark:bg-[#3F424E]"
          : "bg-charcoal hover:bg-juro-orange dark:bg-[#4A4E5E] dark:hover:bg-juro-orange"
      } ${className}`}
    >
      <span className="cartridge-chamfer w-full h-full px-2.5 py-1.5 bg-[#EFE9DC] dark:bg-[#101114] inline-flex items-center justify-center gap-1.5">
        <span className="font-pixel text-[11px] font-bold uppercase text-charcoal dark:text-white leading-none whitespace-nowrap">
          {label}
        </span>
        {subText && (
          <span className="font-mono-hud text-[11px] font-bold text-neutral-600 dark:text-neutral-400 leading-none whitespace-nowrap">
            {subText}
          </span>
        )}
      </span>
    </button>
  );
};

export interface EquipTogglePillProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
}

/**
 * Compact interactive pill button for equipping or removing unlocked cosmetics.
 */
export const EquipTogglePill: React.FC<EquipTogglePillProps> = ({
  label,
  icon: Icon,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={() => {
        soundEffects.playClick();
        onClick();
      }}
      className={`console-btn-bevel inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-[4px] border-2 border-charcoal dark:border-[#4A4E5E] bg-[#FDFBF7] dark:bg-[#101114] text-charcoal dark:text-white shadow-[0_2px_0_#18181B] dark:shadow-[0_2px_0_#09090B] hover:border-juro-orange hover:text-juro-orange cursor-pointer select-none ${className}`}
    >
      <Icon size={13} strokeWidth={2.3} className="shrink-0 text-juro-orange" />
      <span className="font-pixel text-[11px] font-bold uppercase leading-none whitespace-nowrap">
        {label}
      </span>
    </button>
  );
};

export interface ShopStatusStampProps {
  label: string;
  icon?: LucideIcon;
  tone?: "accent" | "good" | "neutral";
  className?: string;
}

/**
 * Non-interactive inset stamp replacing static disabled rectangular buttons.
 */
export const ShopStatusStamp: React.FC<ShopStatusStampProps> = ({
  label,
  icon: Icon,
  tone = "neutral",
  className = "",
}) => {
  const toneClass =
    tone === "accent"
      ? "bg-[#FFF5E9] text-juro-orange border-juro-orange/60 dark:bg-[#231B16] dark:text-orange-300 dark:border-juro-orange/50"
      : tone === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-600/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50"
      : "bg-[#EFE9DC]/80 text-neutral-500 border-charcoal/25 dark:bg-[#101114] dark:text-neutral-400 dark:border-[#3F424E]";

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-[4px] border-2 border-dashed font-pixel text-[11px] font-bold uppercase leading-none select-none whitespace-nowrap ${toneClass} ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} className="shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
