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
      soundEffects.playClick();
    }
    onChange(val);
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-[9px] gap-1",
    md: "px-2 sm:px-3 py-1.5 text-[9px] sm:text-[10px] gap-1 sm:gap-1.5",
  };

  return (
    <div
      className={`bg-neutral-100 dark:bg-neutral-900/60 p-1 border-2 border-charcoal/30 dark:border-neutral-700 ${
        fullWidthOnMobile
          ? "grid grid-cols-4 gap-1 w-full sm:inline-flex sm:w-fit sm:flex-nowrap"
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
              pixel-text uppercase tracking-wider font-bold transition-all duration-75 select-none
              inline-flex items-center justify-center whitespace-nowrap cursor-pointer border-2 min-w-0
              ${sizeClasses[size]}
              ${
                isSelected
                  ? "bg-charcoal text-white border-charcoal shadow-[2px_2px_0px_#F97316] dark:border-neutral-600"
                  : "bg-white dark:bg-dark-surface text-charcoal/80 dark:text-neutral-300 border-charcoal/20 hover:border-charcoal dark:hover:border-neutral-500"
              }
            `}
          >
            <span className="truncate">{opt.label}</span>
            {opt.badge && (
              <span
                className={`
                  text-[8px] px-1 border shrink-0
                  ${
                    isSelected
                      ? "bg-juro-orange text-white border-white/40"
                      : "bg-neutral-200 dark:bg-neutral-800 text-charcoal dark:text-neutral-300 border-charcoal/30"
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
