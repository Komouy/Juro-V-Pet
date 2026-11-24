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

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={14} strokeWidth={2} className="text-neutral-600 dark:text-neutral-300" />
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            {label}
          </span>
        </div>
        <span className="text-xs font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
          {safeValue}{unit}
        </span>
      </div>

      {/* Smooth Progress Bar */}
      <div className="h-2.5 w-full rounded-full bg-neutral-200/80 dark:bg-neutral-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${color}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};
