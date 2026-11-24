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
    sm: "px-3.5 py-2 text-xs gap-1.5 min-h-[38px]",
    md: "px-4 py-2 text-xs sm:text-sm gap-2 min-h-[42px]",
    lg: "px-5 py-2.5 text-sm sm:text-base gap-2.5 min-h-[46px]",
  };

  const variantStyles = {
    primary:
      "bg-neutral-900 text-white border border-neutral-900 shadow-xs hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100 dark:hover:bg-neutral-200",
    secondary:
      "bg-white text-neutral-800 border border-neutral-200 shadow-xs hover:bg-neutral-50 hover:border-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-750",
    accent:
      "bg-juro-orange text-white border border-juro-orange shadow-xs hover:bg-orange-600 hover:border-orange-600",
    ghost:
      "bg-transparent text-neutral-700 border border-transparent hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 shadow-none",
    danger:
      "bg-rose-600 text-white border border-rose-600 shadow-xs hover:bg-rose-700 hover:border-rose-700",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center rounded-xl font-semibold
        cursor-pointer select-none
        transition-all duration-150
        active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange focus-visible:ring-offset-1
        disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 18 : 16} strokeWidth={2} />
      )}
      <span>{label}</span>
    </button>
  );
};
