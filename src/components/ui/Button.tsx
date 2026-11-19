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
    sm: "px-2.5 py-1.5 text-[10px] gap-1.5",
    md: "px-4 py-2 text-xs gap-2",
    lg: "px-5 py-3 text-sm gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-charcoal text-white border-2 border-charcoal shadow-[3px_3px_0px_#F97316] hover:bg-neutral-800 dark:border-neutral-600 dark:shadow-[3px_3px_0px_#F97316]",
    secondary:
      "bg-white text-charcoal border-2 border-charcoal shadow-[3px_3px_0px_#171717] hover:bg-warm-white dark:bg-dark-surface dark:text-neutral-100 dark:border-neutral-600 dark:shadow-[3px_3px_0px_#000000] dark:hover:bg-neutral-800",
    accent:
      "bg-juro-orange text-white border-2 border-charcoal shadow-[3px_3px_0px_#171717] hover:bg-orange-600 dark:border-neutral-700 dark:shadow-[3px_3px_0px_#000000] border-t-white/30",
    ghost:
      "bg-transparent text-charcoal border-2 border-transparent hover:border-charcoal hover:bg-white/60 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/60 shadow-none",
    danger:
      "bg-rose-600 text-white border-2 border-charcoal shadow-[3px_3px_0px_#171717] hover:bg-rose-700 dark:border-neutral-700 dark:shadow-[3px_3px_0px_#000000]",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        pixel-text relative inline-flex items-center justify-center font-bold uppercase tracking-wider
        cursor-pointer select-none
        transition-all duration-75
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange focus-visible:ring-offset-1
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:hover:bg-auto
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-3 h-3 bg-current animate-pulse border border-current" />
      ) : (
        Icon && <Icon size={size === "sm" ? 12 : size === "lg" ? 16 : 14} strokeWidth={2.5} />
      )}
      <span>{label}</span>
    </button>
  );
};
