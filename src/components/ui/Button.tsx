import React from "react";
import { type LucideIcon } from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useUIStore } from "../../stores/uiStore";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  playClickSound?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  icon: Icon,
  variant = "primary",
  size = "md",
  loading = false,
  playClickSound = true,
  className = "",
  disabled,
  onClick,
  ...props
}) => {
  const { soundEnabled } = useUIStore();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    if (playClickSound && soundEnabled) {
      soundEffects.playClick();
    }
    onClick?.(e);
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-[11px] gap-1.5 min-h-[38px]",
    md: "px-4 py-2 text-xs gap-2 min-h-[42px]",
    lg: "px-5 py-2.5 text-xs sm:text-sm gap-2.5 min-h-[46px]",
  };

  const variantStyles = {
    primary:
      "bg-charcoal text-[#FDFBF7] border-charcoal shadow-[inset_0_2px_0_rgba(255,255,255,0.16),0_3px_0_#09090B] hover:bg-[#27272A] active:shadow-[0_1px_0_#09090B] dark:bg-[#FDFBF7] dark:text-charcoal dark:border-[#3F424E] dark:shadow-[inset_0_2px_0_#FFFFFF,0_3px_0_#09090B] dark:hover:bg-[#EFE9DC]",
    secondary:
      "bg-[#FDFBF7] text-charcoal border-charcoal shadow-[inset_0_2px_0_#FFFFFF,0_3px_0_#18181B] hover:bg-[#F4EFE6] active:shadow-[0_1px_0_#18181B] dark:bg-[#1E2028] dark:text-[#F4F4F5] dark:border-[#3F424E] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_#09090B] dark:hover:bg-[#272A35]",
    accent:
      "bg-juro-orange text-white border-charcoal shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_3px_0_#18181B] hover:bg-[#EA580C] active:shadow-[0_1px_0_#18181B] dark:border-[#3F424E] dark:shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_3px_0_#09090B]",
    ghost:
      "bg-transparent text-charcoal border-transparent shadow-none hover:bg-[#EFE9DC]/80 hover:border-charcoal/25 dark:text-neutral-200 dark:hover:bg-[#1E2028] dark:hover:border-[#3F424E]",
    danger:
      "bg-rose-600 text-white border-charcoal shadow-[inset_0_2px_0_rgba(255,255,255,0.22),0_3px_0_#18181B] hover:bg-rose-700 active:shadow-[0_1px_0_#18181B] dark:border-[#3F424E] dark:shadow-[inset_0_2px_0_rgba(255,255,255,0.22),0_3px_0_#09090B]",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        console-btn-bevel relative inline-flex items-center justify-center rounded-[4px] border-2
        font-pixel font-bold uppercase tracking-wide
        cursor-pointer select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange focus-visible:ring-offset-1
        disabled:opacity-45 disabled:cursor-not-allowed disabled:translate-y-0
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent animate-spin" />
      ) : (
        Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 17 : 15} strokeWidth={2.2} />
      )}
      <span className="leading-none">{label}</span>
    </button>
  );
};
