import { soundEffects } from "../../engine/audio/soundEffects";
import { useUIStore } from "../../stores/uiStore";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
}

export interface PixelSegmentedProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  fullWidthOnMobile?: boolean;
}

export function PixelSegmented<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  fullWidthOnMobile = false,
}: PixelSegmentedProps<T>) {
  const { soundEnabled } = useUIStore();

  const handleSelect = (val: T) => {
    if (val === value) return;
    if (soundEnabled) {
      soundEffects.playTab();
    }
    onChange(val);
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-xs sm:text-sm gap-2",
  };

  return (
    <div
      className={`rounded-xl bg-neutral-100 dark:bg-neutral-800/80 p-1 border border-neutral-200/80 dark:border-neutral-700/70 ${
        fullWidthOnMobile
          ? "grid grid-flow-col auto-cols-fr gap-1 w-full sm:inline-flex sm:w-fit sm:flex-nowrap overflow-x-auto"
          : "inline-flex flex-nowrap items-center gap-1 w-fit max-w-full overflow-x-auto shrink-0"
      }`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={`
              rounded-lg font-medium transition-all duration-150 select-none
              inline-flex items-center justify-center whitespace-nowrap cursor-pointer min-w-0
              ${sizeClasses[size]}
              ${
                isSelected
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold"
                  : "bg-transparent text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              }
            `}
          >
            <span className="truncate">{opt.label}</span>
            {opt.badge && (
              <span
                className={`
                  text-[11px] px-1.5 py-0.5 rounded-full shrink-0 tabular-nums font-semibold
                  ${
                    isSelected
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                      : "bg-neutral-200/80 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                  }
                `}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
