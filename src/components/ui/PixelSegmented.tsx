import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useUIStore } from "../../stores/uiStore";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
  summary?: string;
  icon?: LucideIcon;
}

export interface PixelSegmentedProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  fullWidthOnMobile?: boolean;
  fullWidth?: boolean;
  mobileDropdown?: boolean;
  className?: string;
}

export function PixelSegmented<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  fullWidthOnMobile = false,
  fullWidth = false,
  mobileDropdown = false,
  className = "",
}: PixelSegmentedProps<T>) {
  const { soundEnabled } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [dropdownOpen]);

  const handleSelect = (val: T) => {
    setDropdownOpen(false);
    if (val === value) return;
    if (soundEnabled) {
      soundEffects.playTab();
    }
    onChange(val);
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-[11px] gap-1.5 min-h-[36px]",
    md: "px-3.5 py-2 text-xs gap-2 min-h-[40px]",
  };

  const activeOption = options.find((opt) => opt.value === value) ?? options[0];
  const ActiveIcon = activeOption?.icon;

  return (
    <div className={className}>
      {/* Mobile Navbar-style Dropdown Menu Selector */}
      {mobileDropdown && activeOption && (
        <div ref={dropdownRef} className="relative sm:hidden w-full">
          <button
            type="button"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            onClick={() => {
              if (soundEnabled) soundEffects.playClick();
              setDropdownOpen((prev) => !prev);
            }}
            className="console-btn-bevel w-full min-h-[44px] px-3 py-2 rounded-[5px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] dark:shadow-[0_2px_0_#09090B] flex items-center justify-between gap-2 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange"
          >
            <span className="flex items-center gap-2 min-w-0">
              {ActiveIcon && (
                <span className="w-6 h-6 rounded-[3px] bg-juro-orange text-white border border-charcoal flex items-center justify-center shrink-0">
                  <ActiveIcon size={13} strokeWidth={2.4} />
                </span>
              )}
              <span className="font-pixel text-xs font-bold uppercase text-charcoal dark:text-white tracking-wide truncate">
                {activeOption.label}
              </span>
              {activeOption.badge && (
                <span className="font-mono-hud text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#FDFBF7] dark:bg-[#1E2028] text-charcoal dark:text-neutral-200 border border-charcoal/40 dark:border-[#3F424E] leading-none shrink-0">
                  {activeOption.badge}
                </span>
              )}
            </span>

            <span className="flex items-center gap-2 shrink-0">
              {activeOption.summary && (
                <span className="font-mono-hud text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                  {activeOption.summary}
                </span>
              )}
              <ChevronDown
                size={16}
                strokeWidth={2.4}
                className={`text-charcoal dark:text-neutral-200 transition-transform duration-150 ${
                  dropdownOpen ? "rotate-180 text-juro-orange" : ""
                }`}
              />
            </span>
          </button>

          {dropdownOpen && (
            <div
              role="listbox"
              aria-label="Pilih kategori toko"
              className="absolute left-0 right-0 top-full mt-2 bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] rounded-[6px] shadow-[4px_4px_0_#18181B] dark:shadow-[4px_4px_0_#09090B] p-1.5 z-40 flex flex-col gap-0.5 animate-tray-enter select-none"
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[4px] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-juro-orange text-white border border-charcoal"
                        : "hover:bg-[#EFE9DC] dark:hover:bg-[#101114] text-charcoal dark:text-neutral-100"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {OptIcon && (
                        <OptIcon
                          size={15}
                          strokeWidth={2.2}
                          className={
                            isSelected ? "text-white shrink-0" : "text-juro-orange shrink-0"
                          }
                        />
                      )}
                      <span className="font-pixel text-xs font-bold uppercase tracking-wide truncate">
                        {opt.label}
                      </span>
                    </span>

                    <span className="flex items-center gap-2 shrink-0">
                      {(opt.badge || opt.summary) && (
                        <span
                          className={`font-mono-hud text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] border leading-none ${
                            isSelected
                              ? "bg-[#FDFBF7] text-charcoal border-charcoal"
                              : "bg-[#EFE9DC] dark:bg-[#101114] text-neutral-600 dark:text-neutral-300 border-charcoal/25 dark:border-[#3F424E]"
                          }`}
                        >
                          {opt.badge ?? opt.summary}
                        </span>
                      )}
                      {isSelected && <Check size={14} strokeWidth={2.6} className="shrink-0" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Segmented Tab Strip (Desktop / Default) */}
      <div
        className={`rounded-[5px] bg-[#EFE9DC] dark:bg-[#101114] p-1 border-2 border-charcoal dark:border-[#3F424E] shadow-[inset_0_2px_0_rgba(24,24,27,0.08)] ${
          mobileDropdown ? "hidden sm:grid sm:grid-flow-col sm:auto-cols-fr gap-1 w-full" : ""
        } ${
          !mobileDropdown && fullWidth
            ? "grid grid-flow-col auto-cols-fr gap-1 w-full overflow-x-auto"
            : !mobileDropdown && fullWidthOnMobile
            ? "grid grid-flow-col auto-cols-fr gap-1 w-full sm:inline-flex sm:w-fit sm:flex-nowrap overflow-x-auto"
            : !mobileDropdown
            ? "inline-flex flex-nowrap items-center gap-1 w-fit max-w-full overflow-x-auto shrink-0"
            : ""
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
                rounded-[3px] font-pixel font-bold uppercase tracking-wide transition-all duration-120 select-none
                inline-flex items-center justify-center whitespace-nowrap cursor-pointer min-w-0
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange
                ${sizeClasses[size]}
                ${
                  isSelected
                    ? "bg-juro-orange text-white border-2 border-charcoal shadow-[0_2px_0_#18181B] dark:border-[#18181B]"
                    : "bg-transparent border-2 border-transparent text-charcoal/70 dark:text-neutral-400 hover:text-charcoal hover:bg-[#FDFBF7]/60 dark:hover:text-white dark:hover:bg-[#1E2028]"
                }
              `}
            >
              <span className="truncate leading-none">{opt.label}</span>
              {opt.badge && (
                <span
                  className={`
                    font-mono-hud text-[10px] px-1.5 py-0.5 rounded-[2px] border shrink-0 font-bold leading-none
                    ${
                      isSelected
                        ? "bg-[#FDFBF7] text-charcoal border-charcoal"
                        : "bg-charcoal/10 dark:bg-[#1E2028] text-charcoal dark:text-neutral-200 border-charcoal/25 dark:border-[#3F424E]"
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
    </div>
  );
}
