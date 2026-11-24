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
      "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700",
    orange:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    good:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    warning:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    charcoal:
      "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-700 dark:text-neutral-100 dark:border-neutral-600",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-0.5 text-xs",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        border select-none whitespace-nowrap
        ${sizeStyles[size]}
        ${variantStyles[variant]}
      `}
    >
      {label}
    </span>
  );
};
