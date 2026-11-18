import React from "react";

export interface BadgeProps {
  label: string;
  variant?: "default" | "orange" | "success" | "good" | "warning" | "charcoal";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "default",
  size = "md",
}) => {
  const variantStyles = {
    default:
      "bg-white text-charcoal border-charcoal shadow-[2px_2px_0px_#171717] dark:bg-dark-surface dark:text-white dark:border-neutral-600 dark:shadow-[2px_2px_0px_#000000]",
    orange:
      "bg-juro-orange text-white border-charcoal shadow-[2px_2px_0px_#171717] dark:border-neutral-600 dark:shadow-[2px_2px_0px_#000000]",
    success:
      "bg-emerald-500 text-white border-charcoal shadow-[2px_2px_0px_#171717] dark:border-neutral-600 dark:shadow-[2px_2px_0px_#000000]",
    good:
      "bg-emerald-500 text-white border-charcoal shadow-[2px_2px_0px_#171717] dark:border-neutral-600 dark:shadow-[2px_2px_0px_#000000]",
    warning:
      "bg-amber-400 text-charcoal border-charcoal shadow-[2px_2px_0px_#171717] dark:border-neutral-600 dark:shadow-[2px_2px_0px_#000000]",
    charcoal:
      "bg-charcoal text-white border-charcoal shadow-[2px_2px_0px_#F97316] dark:bg-neutral-800 dark:border-neutral-600 dark:shadow-[2px_2px_0px_#F97316]",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[8px]",
    md: "px-2.5 py-1 text-[9px]",
  };

  return (
    <span
      className={`
        pixel-text inline-flex items-center uppercase tracking-wider font-bold
        border-2 select-none
        ${sizeStyles[size]}
        ${variantStyles[variant]}
      `}
    >
      {label}
    </span>
  );
};
