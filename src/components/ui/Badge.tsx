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
      "bg-[#EFE9DC] text-charcoal border-charcoal dark:bg-[#101114] dark:text-neutral-200 dark:border-[#3F424E]",
    orange:
      "bg-[#FFF1DF] text-juro-orange-deep border-juro-orange dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/60",
    success:
      "bg-emerald-50 text-emerald-800 border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/60",
    good:
      "bg-emerald-50 text-emerald-800 border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/60",
    warning:
      "bg-amber-50 text-amber-800 border-amber-600 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/60",
    charcoal:
      "bg-charcoal text-[#FDFBF7] border-charcoal dark:bg-[#FDFBF7] dark:text-charcoal dark:border-[#3F424E]",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-[11px]",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-[3px] font-pixel font-bold uppercase tracking-wide
        border-2 select-none whitespace-nowrap leading-none
        ${sizeStyles[size]}
        ${variantStyles[variant]}
      `}
    >
      {label}
    </span>
  );
};
