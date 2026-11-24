import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "warm" | "inset";
  shadowOffset?: "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  shadowOffset = "md",
  className = "",
  ...props
}) => {
  const variantStyles = {
    default: "bg-white border border-neutral-200 dark:bg-dark-surface dark:border-neutral-800",
    warm: "bg-orange-50/70 border border-orange-200/80 dark:bg-neutral-900 dark:border-neutral-800",
    inset: "bg-neutral-100/80 border border-neutral-200/70 shadow-none dark:bg-neutral-800/70 dark:border-neutral-700/60",
  };

  const shadowStyles = {
    sm: "shadow-xs",
    md: "shadow-sm",
    lg: "shadow-md",
  };

  return (
    <div
      className={`
        p-4 relative rounded-2xl
        ${variantStyles[variant]}
        ${variant !== "inset" ? shadowStyles[shadowOffset] : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
