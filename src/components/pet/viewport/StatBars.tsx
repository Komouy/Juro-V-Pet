import React from "react";
import { Utensils, Zap, Heart, Droplets, HandHeart } from "lucide-react";
import { soundEffects } from "../../../engine/audio/soundEffects";

export interface StatBarsProps {
  name: string;
  level: number;
  hunger: number;
  energy: number;
  happiness: number;
  cleanliness: number;
  affection: number;
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
  affection,
  currentState,
  showStatDetails,
  onToggleStatDetails,
}) => {
  const compactStats = [
    { key: "hunger", value: Math.round(hunger), icon: Utensils, barColor: "bg-juro-orange", iconColor: "text-juro-orange" },
    { key: "energy", value: Math.round(energy), icon: Zap, barColor: "bg-amber-400", iconColor: "text-amber-500" },
    { key: "happiness", value: Math.round(happiness), icon: Heart, barColor: "bg-rose-400", iconColor: "text-rose-500" },
    { key: "cleanliness", value: Math.round(cleanliness), icon: Droplets, barColor: "bg-sky-400", iconColor: "text-sky-500" },
    { key: "affection", value: Math.round(affection), icon: HandHeart, barColor: "bg-purple-400", iconColor: "text-purple-500" },
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
        {/* Ultra-Minimal 5-Stat Strip (Consistent Horizontal Alignment Desktop & Mobile) */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playClick();
            onToggleStatDetails();
          }}
          aria-expanded={showStatDetails}
          aria-label="Lihat detail status Juro"
          className="h-9 inline-flex items-center gap-2 sm:gap-2.5 px-2.5 bg-warm-white/95 dark:bg-neutral-900/90 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange transition-colors cursor-pointer"
        >
          {compactStats.map((stat) => {
            const Icon = stat.icon;
            const isLow = stat.value < 30;
            return (
              <div
                key={stat.key}
                title={`${stat.value}%`}
                className="flex items-center gap-1"
              >
                <Icon
                  size={12}
                  strokeWidth={2.5}
                  className={`${isLow ? "text-rose-500 animate-pulse" : stat.iconColor} shrink-0`}
                />
                <div className="w-5 sm:w-8 h-1.5 bg-neutral-200 dark:bg-neutral-700 border border-charcoal/40 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isLow ? "bg-rose-500" : stat.barColor
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </button>

        {/* Compact Tap-to-Peek Detail Popover (Tanpa Teks - Hanya Ikon, Bar & Nilai %) */}
        {showStatDetails && (
          <div className="animate-tray-enter absolute top-11 left-0 w-48 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-charcoal/15 dark:border-neutral-700">
              <span className="pixel-text text-[10px] font-bold text-charcoal dark:text-white truncate">
                {name} · Lv.{level}
              </span>
              <span className="pixel-text text-[8px] uppercase px-1.5 py-0.5 bg-juro-orange text-white border border-charcoal">
                {stateLabel}
              </span>
            </div>
            <div className="space-y-2">
              {compactStats.map((stat) => {
                const Icon = stat.icon;
                const isLow = stat.value < 30;
                return (
                  <div key={stat.key} className="flex items-center justify-between gap-2">
                    <Icon
                      size={12}
                      strokeWidth={2.5}
                      className={isLow ? "text-rose-500 shrink-0" : `${stat.iconColor} shrink-0`}
                    />
                    <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 border border-charcoal/40 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isLow ? "bg-rose-500" : stat.barColor
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }}
                      />
                    </div>
                    <span
                      className={`pixel-text text-[9px] font-bold shrink-0 ${
                        isLow ? "text-rose-500" : "text-charcoal dark:text-neutral-200"
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
