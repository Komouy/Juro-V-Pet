import React from "react";
import { type LucideIcon } from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useUIStore } from "../../stores/uiStore";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: "primary" | "secondary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  playClickSound?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  variant = "secondary",
  size = "md",
  isActive = false,
  playClickSound = true,
  className = "",
  onClick,
  disabled,
  ...props
}) => {
  const { soundEnabled } = useUIStore();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (playClickSound && soundEnabled) {
      soundEffects.playSquish();
    }
    onClick?.(e);
  };

  const sizeStyles = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizes = {
    sm: 13,
    md: 16,
    lg: 20,
  };

  const variantStyles = {
    primary:
      "bg-charcoal text-white border-2 border-charcoal shadow-[2px_2px_0px_#F97316] hover:bg-neutral-800 dark:border-neutral-600 dark:shadow-[2px_2px_0px_#F97316]",
    secondary:
      "bg-white text-charcoal border-2 border-charcoal shadow-[2px_2px_0px_#171717] hover:bg-warm-white dark:bg-dark-surface dark:text-neutral-100 dark:border-neutral-600 dark:shadow-[2px_2px_0px_#000000] dark:hover:bg-neutral-800",
    accent:
      "bg-juro-orange text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] hover:bg-orange-600 dark:border-neutral-700 dark:shadow-[2px_2px_0px_#000000]",
    ghost:
      "bg-transparent text-charcoal border-2 border-transparent hover:border-charcoal hover:bg-white/70 shadow-none dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/70",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        inline-flex items-center justify-center cursor-pointer select-none
        transition-all duration-75
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange
        disabled:opacity-40 disabled:cursor-not-allowed
        ${sizeStyles[size]}
        ${isActive ? variantStyles.accent : variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      <Icon size={iconSizes[size]} strokeWidth={2.5} />
    </button>
  );
};
