import React from "react";
import { type LucideIcon } from "lucide-react";

export interface ProgressBarProps {
  label: string;
  value: number; // 0 to 100
  icon: LucideIcon;
  color?: string; // hex or tailwind class
  unit?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  icon: Icon,
  color = "bg-juro-orange",
  unit = "%",
}) => {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  // 10 distinct pixel blocks
  const filledSegments = Math.round(safeValue / 10);

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={13} strokeWidth={2.5} className="text-charcoal dark:text-neutral-300" />
          <span className="pixel-text text-[10px] tracking-wider text-charcoal dark:text-neutral-200">
            {label}
          </span>
        </div>
        <span className="pixel-text text-[10px] font-bold text-muted dark:text-neutral-400">
          {safeValue}{unit}
        </span>
      </div>

      {/* Segmented Pixel Bar */}
      <div className="flex gap-[3px] bg-charcoal/10 dark:bg-neutral-800 p-[3px] border-2 border-charcoal dark:border-neutral-700">
        {Array.from({ length: 10 }, (_, i) => {
          const isFilled = i < filledSegments;
          return (
            <div
              key={i}
              className={`
                h-2.5 flex-1 transition-colors duration-150
                ${isFilled ? color : "bg-neutral-200/50 dark:bg-neutral-700/50"}
                ${isFilled ? "border-t border-l border-white/40" : ""}
              `}
            />
          );
        })}
      </div>
    </div>
  );
};
