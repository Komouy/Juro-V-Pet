import React from "react";

export interface NotchedSlotProps {
  children: React.ReactNode;
  state?: "default" | "focus" | "error" | "success";
  disabled?: boolean;
  className?: string;
  innerClassName?: string;
}

/**
 * Two-layer 45-degree chamfered cartridge slot wrapper.
 * Renders a crisp 2px notched frame without curved SaaS corners.
 */
export const NotchedSlot: React.FC<NotchedSlotProps> = ({
  children,
  state = "default",
  disabled = false,
  className = "",
  innerClassName = "",
}) => {
  const borderBg =
    state === "error"
      ? "bg-rose-600"
      : state === "success"
      ? "bg-emerald-600"
      : "bg-charcoal dark:bg-[#3F424E] group-focus-within:bg-juro-orange";

  return (
    <div
      className={`group cartridge-chamfer p-[2px] transition-colors duration-150 ${borderBg} ${
        disabled ? "opacity-55" : ""
      } ${className}`}
    >
      <div
        className={`cartridge-chamfer w-full flex items-center bg-[#EFE9DC] dark:bg-[#101114] transition-colors ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
