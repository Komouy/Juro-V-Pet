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
    default:
      "bg-[#FDFBF7] border-2 border-charcoal dark:bg-[#1E2028] dark:border-[#3F424E]",
    warm:
      "bg-[#FFF6EB] border-2 border-charcoal border-t-4 border-t-juro-orange dark:bg-[#231F1D] dark:border-[#3F424E] dark:border-t-juro-orange",
    inset:
      "bg-[#EFE9DC] border-2 border-charcoal/80 shadow-[inset_0_2px_0_rgba(24,24,27,0.08)] dark:bg-[#101114] dark:border-[#323540] dark:shadow-[inset_0_2px_0_rgba(0,0,0,0.35)]",
  };

  const shadowStyles = {
    sm: "shadow-[0_2px_0_#18181B] dark:shadow-[0_2px_0_#09090B]",
    md: "shadow-[0_3px_0_#18181B] dark:shadow-[0_3px_0_#09090B]",
    lg: "shadow-[0_5px_0_#18181B] dark:shadow-[0_5px_0_#09090B]",
  };

  return (
    <div
      className={`
        p-4 relative rounded-[6px]
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
