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
    default: "bg-white border-2 border-charcoal dark:bg-dark-surface dark:border-neutral-700",
    warm: "bg-warm-white border-2 border-charcoal dark:bg-dark-bg dark:border-neutral-700",
    inset: "bg-neutral-100 border-2 border-charcoal/30 shadow-none dark:bg-neutral-800",
  };

  const shadowStyles = {
    sm: "shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]",
    md: "shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000]",
    lg: "shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000]",
  };

  return (
    <div
      className={`
        p-4 relative
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
