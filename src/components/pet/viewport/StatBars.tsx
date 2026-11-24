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
    { key: "energy", label: "Tidur", value: Math.round(energy), icon: Moon, barColor: "bg-indigo-400", iconColor: "text-indigo-400" },
    { key: "happiness", label: "Senang", value: Math.round(happiness), icon: Heart, barColor: "bg-rose-400", iconColor: "text-rose-500" },
    { key: "cleanliness", label: "Bersih", value: Math.round(cleanliness), icon: Droplets, barColor: "bg-sky-400", iconColor: "text-sky-500" },
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
        {/* Compact 4-Stat Strip */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playClick();
            onToggleStatDetails();
          }}
          aria-expanded={showStatDetails}
          aria-label="Lihat detail status Juro"
          className="h-9 inline-flex items-center gap-2 sm:gap-2.5 px-3 rounded-xl bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:border-juro-orange transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange"
        >
          {compactStats.map((stat) => {
            const Icon = stat.icon;
            const isLow = stat.value < 30;
            return (
              <div
                key={stat.key}
                title={`${stat.label}: ${stat.value}%`}
                className="flex items-center gap-1.5"
              >
                <Icon
                  size={13}
                  strokeWidth={2.2}
                  className={`${isLow ? "text-rose-500" : stat.iconColor} shrink-0`}
                />
                <div className="w-5 sm:w-7 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isLow ? "bg-rose-500" : stat.barColor
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </button>

        {/* Tap-to-Peek Detail Popover */}
        {showStatDetails && (
          <div className="animate-tray-enter absolute top-11 left-0 w-56 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-lg p-3 space-y-2.5">
            {/* Popover Arrow Indicator */}
            <div
              className="absolute -top-1.5 left-4 w-3 h-3 bg-white dark:bg-neutral-900 rotate-45 border-l border-t border-neutral-200/90 dark:border-neutral-800 pointer-events-none"
              aria-hidden="true"
            />

            <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate tabular-nums">
                {name} · Lv.{level}
              </span>
              <span className="text-[11px] font-semibold text-juro-orange shrink-0">
                {stateLabel}
              </span>
            </div>
            <div className="space-y-2">
              {compactStats.map((stat) => {
                const Icon = stat.icon;
                const isLow = stat.value < 30;
                return (
                  <div key={stat.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 w-16 shrink-0">
                      <Icon
                        size={13}
                        strokeWidth={2}
                        className={isLow ? "text-rose-500 shrink-0" : `${stat.iconColor} shrink-0`}
                      />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate">
                        {stat.label}
                      </span>
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isLow ? "bg-rose-500" : stat.barColor
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold tabular-nums w-9 text-right shrink-0 ${
                        isLow ? "text-rose-500" : "text-neutral-600 dark:text-neutral-300"
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
