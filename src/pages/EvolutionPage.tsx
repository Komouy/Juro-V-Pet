import React from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { usePetStore } from "../stores/petStore";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import { soundEffects } from "../engine/audio/soundEffects";

const StageEmblem: React.FC<{ stage: 1 | 2 | 3; unlocked: boolean }> = ({
  stage,
  unlocked,
}) => {
  const fillMain = unlocked ? "#F97316" : "#9CA3AF";
  const fillLight = unlocked ? "#FDBA74" : "#D1D5DB";

  return (
    <div className="w-11 h-11 bg-warm-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] flex items-center justify-center shrink-0">
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
    <main className="w-full max-w-5xl mx-auto px-4 py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="border-b-2 border-charcoal/15 dark:border-neutral-700 pb-3 flex items-center justify-between gap-2">
        <h1 className="pixel-text text-sm md:text-base text-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2 shrink-0">
          <TrendingUp size={16} strokeWidth={2.5} className="text-juro-orange" />
          <span>Evolusi</span>
        </h1>
        <span className="pixel-text text-[9px] text-muted">
          Tahapan Pertumbuhan Juro
        </span>
      </div>

      {/* Progress Level Card */}
      <Card shadowOffset="sm" variant="warm" className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="pixel-text text-xs sm:text-sm text-charcoal dark:text-white font-bold">
            {name} · Level {level}
          </h2>
          <span className="pixel-text text-[10px] text-muted font-mono">
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
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="pixel-text text-xs sm:text-sm text-charcoal dark:text-white font-bold uppercase tracking-wider">
            Wujud Fisik
          </h2>
          <span className="pixel-text text-[9px] text-muted">
            3 Tahap Pertumbuhan Tubuh
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {physicalStages.map((stage) => {
            const isUnlocked = stage.completed || stage.current;
            return (
              <Card
                key={stage.stageName}
                shadowOffset="sm"
                onClick={() => soundEffects.playClick()}
                className={`p-3.5 flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                  stage.current
                    ? "border-juro-orange ring-2 ring-juro-orange/25"
                    : !isUnlocked
                    ? "opacity-75"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <StageEmblem stage={stage.num} unlocked={isUnlocked} />
                    <div className="min-w-0">
                      <span className="pixel-text text-[8px] text-muted block uppercase">
                        {stage.levelRange}
                      </span>
                      <h3 className="pixel-text text-[11px] text-charcoal dark:text-white font-bold mt-0.5 truncate">
                        {stage.stageName}
                      </h3>
                    </div>
                  </div>
                  {stage.completed ? (
                    <Badge label="Selesai" variant="good" size="sm" />
                  ) : stage.current ? (
                    <Badge label="Aktif" variant="orange" size="sm" />
                  ) : (
                    <Badge label="Kunci" variant="charcoal" size="sm" />
                  )}
                </div>

                <div className="pt-2.5 border-t border-charcoal/10 dark:border-neutral-700 space-y-1.5">
                  {stage.perks.map((perk) => (
                    <div
                      key={perk}
                      className="flex items-center gap-1.5 pixel-text text-[9px] text-charcoal/90 dark:text-neutral-200"
                    >
                      <CheckCircle2
                        size={11}
                        strokeWidth={2.5}
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
      </section>
    </main>
  );
};
