import React from "react";
import { Utensils, Moon, Heart, Droplets } from "lucide-react";
import { soundEffects } from "../../../engine/audio/soundEffects";

export interface StatBarsProps {
  name: string;
  level: number;
  hunger: number;
  energy: number;
  happiness: number;
  cleanliness: number;
  affection?: number;
  currentState: string;
  showStatDetails: boolean;
  onToggleStatDetails: () => void;
}

const MINI_SEGMENTS = 4;
const DETAIL_SEGMENTS = 8;

export const StatBars: React.FC<StatBarsProps> = ({
  name,
  level,
  hunger,
  energy,
  happiness,
  cleanliness,
  currentState,
  showStatDetails,
  onToggleStatDetails,
}) => {
  const compactStats = [
    { key: "hunger", label: "Lapar", value: Math.round(hunger), icon: Utensils, barColor: "bg-juro-orange", iconColor: "text-juro-orange" },
    { key: "energy", label: "Tidur", value: Math.round(energy), icon: Moon, barColor: "bg-indigo-500", iconColor: "text-indigo-500 dark:text-indigo-400" },
    { key: "happiness", label: "Senang", value: Math.round(happiness), icon: Heart, barColor: "bg-rose-500", iconColor: "text-rose-500" },
    { key: "cleanliness", label: "Bersih", value: Math.round(cleanliness), icon: Droplets, barColor: "bg-sky-500", iconColor: "text-sky-500" },
  ];

  const stateLabel =
    currentState === "sleep"
      ? "Tidur"
      : currentState === "eating"
      ? "Makan"
      : currentState === "play"
      ? "Main"
      : "Aktif";

  return (
    <div className="absolute top-3 left-3 z-20 pointer-events-none">
      <div className="relative pointer-events-auto">
        {/* Compact Handheld Cartridge Status Strip */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playClick();
            onToggleStatDetails();
          }}
          aria-expanded={showStatDetails}
          aria-label="Lihat detail status Juro"
          className="console-btn-bevel h-9 inline-flex items-center gap-2 sm:gap-2.5 px-2.5 rounded-[5px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#3F424E] shadow-[0_3px_0_#18181B] dark:shadow-[0_3px_0_#09090B] hover:border-juro-orange transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange"
        >
          {compactStats.map((stat) => {
            const Icon = stat.icon;
            const isLow = stat.value < 30;
            const filled = Math.ceil((Math.max(0, Math.min(100, stat.value)) / 100) * MINI_SEGMENTS);
            return (
              <div
                key={stat.key}
                title={`${stat.label}: ${stat.value}%`}
                className="flex items-center gap-1"
              >
                <Icon
                  size={13}
                  strokeWidth={2.3}
                  className={`${isLow ? "text-rose-600" : stat.iconColor} shrink-0`}
                />
                <div className="w-6 sm:w-8 h-2.5 rounded-[2px] bg-[#EFE9DC] dark:bg-[#101114] border border-charcoal/50 dark:border-[#3F424E] p-[1px] grid grid-cols-4 gap-[1px]">
                  {Array.from({ length: MINI_SEGMENTS }, (_, idx) => (
                    <span
                      key={idx}
                      className={`h-full rounded-[1px] ${
                        idx < filled
                          ? isLow
                            ? "bg-rose-500"
                            : stat.barColor
                          : "bg-charcoal/12 dark:bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </button>

        {/* Tap-to-Peek Console LCD Readout Popover */}
        {showStatDetails && (
          <div className="animate-tray-enter absolute top-11 left-0 w-60 rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[4px_4px_0_#18181B] dark:shadow-[4px_4px_0_#09090B] p-3 space-y-2.5">
            <div
              className="absolute -top-2 left-4 w-3 h-3 bg-[#FDFBF7] dark:bg-[#1E2028] rotate-45 border-l-2 border-t-2 border-charcoal dark:border-[#4A4E5E] pointer-events-none"
              aria-hidden="true"
            />

            <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E]">
              <span className="font-pixel text-xs font-bold text-charcoal dark:text-white truncate uppercase">
                {name} · Lv.{level}
              </span>
              <span className="font-pixel text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[2px] bg-[#FFF1DF] text-juro-orange-deep border border-juro-orange shrink-0 leading-none">
                {stateLabel}
              </span>
            </div>
            <div className="space-y-2">
              {compactStats.map((stat) => {
                const Icon = stat.icon;
                const isLow = stat.value < 30;
                const filled = Math.round((Math.max(0, Math.min(100, stat.value)) / 100) * DETAIL_SEGMENTS);
                return (
                  <div key={stat.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-16 shrink-0">
                      <Icon
                        size={13}
                        strokeWidth={2.2}
                        className={isLow ? "text-rose-600 shrink-0" : `${stat.iconColor} shrink-0`}
                      />
                      <span className="text-xs font-semibold text-charcoal dark:text-neutral-200 truncate">
                        {stat.label}
                      </span>
                    </div>
                    <div className="flex-1 h-2.5 rounded-[2px] bg-[#EFE9DC] dark:bg-[#101114] border border-charcoal/60 dark:border-[#3F424E] p-[1px] grid grid-cols-8 gap-[1px]">
                      {Array.from({ length: DETAIL_SEGMENTS }, (_, idx) => (
                        <span
                          key={idx}
                          className={`h-full rounded-[1px] ${
                            idx < filled
                              ? isLow
                                ? "bg-rose-500"
                                : stat.barColor
                              : "bg-charcoal/12 dark:bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`font-mono-hud text-xs font-bold w-9 text-right shrink-0 ${
                        isLow ? "text-rose-600" : "text-charcoal dark:text-neutral-200"
                      }`}
                    >
                      {stat.value}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
