import React from "react";
import { type LucideIcon } from "lucide-react";

export interface ProgressBarProps {
  label: string;
  value: number; // 0 to 100
  icon: LucideIcon;
  color?: string; // tailwind bg class
  unit?: string;
}

const TOTAL_SEGMENTS = 10;

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  icon: Icon,
  color = "bg-juro-orange",
  unit = "%",
}) => {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  const filledSegments = Math.round((safeValue / 100) * TOTAL_SEGMENTS);

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={14} strokeWidth={2.2} className="text-charcoal dark:text-neutral-300 shrink-0" />
          <span className="text-xs font-semibold text-charcoal dark:text-neutral-200 truncate">
            {label}
          </span>
        </div>
        <span className="font-mono-hud text-xs font-bold text-charcoal/80 dark:text-neutral-300 shrink-0">
          {safeValue}{unit}
        </span>
      </div>

      {/* Segmented 10-Cell Handheld Matrix Bar */}
      <div
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-3.5 w-full rounded-[4px] border-2 border-charcoal dark:border-[#3F424E] bg-[#EFE9DC] dark:bg-[#101114] p-[2px] grid grid-cols-10 gap-[2px]"
      >
        {Array.from({ length: TOTAL_SEGMENTS }, (_, idx) => {
          const isFilled = idx < filledSegments;
          return (
            <span
              key={idx}
              className={`h-full rounded-[1px] transition-colors duration-200 ${
                isFilled ? color : "bg-charcoal/12 dark:bg-white/10"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
