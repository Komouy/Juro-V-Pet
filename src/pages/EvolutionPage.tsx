import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { usePetStore } from "../stores/petStore";
import { TrendingUp, CheckCircle2, X } from "lucide-react";
import { soundEffects } from "../engine/audio/soundEffects";

const StageEmblem: React.FC<{ stage: 1 | 2 | 3; unlocked: boolean }> = ({
  stage,
  unlocked,
}) => {
  const fillMain = unlocked ? "#F97316" : "#9CA3AF";
  const fillLight = unlocked ? "#FDBA74" : "#D1D5DB";

  return (
    <div className="w-12 h-12 rounded-xl bg-orange-50/70 dark:bg-neutral-800 border border-orange-200/70 dark:border-neutral-700 flex items-center justify-center shrink-0">
      <svg
        width="28"
        height="28"
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {stage === 1 && (
          <>
            <rect x="5" y="5" width="6" height="6" fill={fillMain} />
            <rect x="6" y="4" width="4" height="1" fill={fillMain} />
            <rect x="4" y="7" width="8" height="4" fill={fillMain} />
            <rect x="6" y="6" width="2" height="1" fill={fillLight} />
            <rect x="6" y="8" width="1" height="1" fill="#171717" />
            <rect x="9" y="8" width="1" height="1" fill="#171717" />
          </>
        )}
        {stage === 2 && (
          <>
            <rect x="4" y="4" width="8" height="8" fill={fillMain} />
            <rect x="3" y="6" width="10" height="5" fill={fillMain} />
            <rect x="5" y="3" width="6" height="1" fill={fillMain} />
            <rect x="5" y="5" width="2" height="2" fill={fillLight} />
            <rect x="5" y="8" width="2" height="2" fill="#171717" />
            <rect x="9" y="8" width="2" height="2" fill="#171717" />
            <rect x="5" y="8" width="1" height="1" fill="#FFFFFF" />
            <rect x="9" y="8" width="1" height="1" fill="#FFFFFF" />
          </>
        )}
        {stage === 3 && (
          <>
            {/* Mini Crown + Radiant Juro */}
            <rect x="5" y="1" width="1" height="2" fill="#FACC15" />
            <rect x="7" y="1" width="2" height="2" fill="#FACC15" />
            <rect x="10" y="1" width="1" height="2" fill="#FACC15" />
            <rect x="5" y="3" width="6" height="1" fill="#EAB308" />
            <rect x="3" y="5" width="10" height="8" fill={fillMain} />
            <rect x="2" y="7" width="12" height="5" fill={fillMain} />
            <rect x="4" y="6" width="3" height="2" fill={fillLight} />
            <rect x="5" y="9" width="2" height="2" fill="#171717" />
            <rect x="9" y="9" width="2" height="2" fill="#171717" />
            <rect x="5" y="9" width="1" height="1" fill="#FFFFFF" />
            <rect x="9" y="9" width="1" height="1" fill="#FFFFFF" />
          </>
        )}
      </svg>
    </div>
  );
};

export const EvolutionPage: React.FC = () => {
  const navigate = useNavigate();
  const { name, level, xp, xpToNextLevel } = usePetStore();

  const xpPercent = Math.min(100, Math.round((xp / xpToNextLevel) * 100));

  const physicalStages: Array<{
    num: 1 | 2 | 3;
    levelRange: string;
    stageName: string;
    current: boolean;
    completed: boolean;
    perks: string[];
  }> = [
    {
      num: 1,
      levelRange: "Lv. 1 – 4",
      stageName: "Tetes Jeli",
      current: level >= 1 && level < 5,
      completed: level >= 5,
      perks: [
        "Ukuran awal mungil (68% – 85%)",
        "Lompatan kinetik",
        "Respons sentuhan interaktif",
      ],
    },
    {
      num: 2,
      levelRange: "Lv. 5 – 9",
      stageName: "Slime Memantul",
      current: level >= 5 && level < 10,
      completed: level >= 10,
      perks: [
        "Pertumbuhan tubuh remaja",
        "Lompatan lincah di padang rumput",
        "Mainan interaktif & mandi busa",
      ],
    },
    {
      num: 3,
      levelRange: "Lv. 10+",
      stageName: "Juro Mulia",
      current: level >= 10,
      completed: false,
      perks: [
        "Ukuran dewasa maksimal (120%)",
        "Mahkota emas mini 3D",
        "Proporsi tubuh optimal berwibawa",
      ],
    },
  ];

  return (
    <section className="w-full px-4 sm:px-6 py-4 sm:py-5 space-y-4">
      {/* Compact Overlay Header */}
      <div className="border-b border-neutral-200/80 dark:border-neutral-800 pb-3.5 flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2 shrink-0">
          <TrendingUp size={18} strokeWidth={2.2} className="text-juro-orange" />
          <span>Evolusi</span>
        </h1>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
            Tahapan pertumbuhan Juro
          </span>
          <button
            type="button"
            onClick={() => {
              soundEffects.playDismiss();
              navigate("/");
            }}
            className="w-8 h-8 rounded-xl inline-flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Tutup dan kembali ke Home"
            title="Kembali ke Home"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Progress Level Card */}
      <Card shadowOffset="sm" variant="warm" className="p-4 shadow-none">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <h2 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">
            {name} · Level {level}
          </h2>
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
            {xp}/{xpToNextLevel} XP
          </span>
        </div>

        <ProgressBar
          label={`Menuju Level ${level + 1}`}
          value={xpPercent}
          icon={TrendingUp}
          color="bg-juro-orange"
        />
      </Card>

      {/* Section: Wujud Fisik */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 pb-2.5">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Wujud Fisik
          </h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            3 tahap pertumbuhan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {physicalStages.map((stage) => {
            const isUnlocked = stage.completed || stage.current;
            return (
              <Card
                key={stage.stageName}
                shadowOffset="sm"
                onClick={() => soundEffects.playClick()}
                className={`p-4 shadow-none flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                  stage.current
                    ? "border-juro-orange ring-1 ring-juro-orange/25"
                    : !isUnlocked
                    ? "opacity-75"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <StageEmblem stage={stage.num} unlocked={isUnlocked} />
                    <div className="min-w-0">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 block tabular-nums">
                        {stage.levelRange}
                      </span>
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5 truncate">
                        {stage.stageName}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      stage.completed
                        ? "text-emerald-600 dark:text-emerald-400"
                        : stage.current
                        ? "text-juro-orange"
                        : "text-neutral-400"
                    }`}
                  >
                    {stage.completed ? "Selesai" : stage.current ? "Aktif" : "Terkunci"}
                  </span>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                  {stage.perks.map((perk) => (
                    <div
                      key={perk}
                      className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-200"
                    >
                      <CheckCircle2
                        size={13}
                        strokeWidth={2.2}
                        className={
                          isUnlocked
                            ? "text-emerald-600 shrink-0"
                            : "text-neutral-400 shrink-0"
                        }
                      />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
