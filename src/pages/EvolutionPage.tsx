import React from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { usePetStore } from "../stores/petStore";
import { TrendingUp, CheckCircle2, Brain, Heart } from "lucide-react";
import { soundEffects } from "../engine/audio/soundEffects";
import {
  getCognitiveTier,
  computePetEmotionalState,
} from "../engine/ai/cognitiveCore";

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
  const {
    name,
    level,
    xp,
    xpToNextLevel,
    hunger,
    energy,
    cleanliness,
    happiness,
    affection,
    currentState,
  } = usePetStore();

  const xpPercent = Math.min(100, Math.round((xp / xpToNextLevel) * 100));
  const currentTier = getCognitiveTier(level);
  const emotionalState = computePetEmotionalState(
    { hunger, energy, cleanliness, happiness, affection },
    { currentState, level }
  );

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
        "Ukuran bayi mungil (68% – 85%)",
        "Lompatan kecil menggemaskan",
        "Elusan lembut & respons manja",
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
        "Tubuh gembul berwibawa",
      ],
    },
  ];

  const mindStages = [
    {
      tier: 1,
      range: "Lv. 1 – 2",
      name: "Tunas Pikiran",
      archetype: "Bayi Lendir Polos",
      unlocked: level >= 1,
      current: level >= 1 && level <= 2,
      completed: level > 2,
      points: [
        "Kosakata pendek & onomatopoeia imut",
        "Mengenal rasa lapar & pelukan",
      ],
    },
    {
      tier: 2,
      range: "Lv. 3 – 4",
      name: "Kognisi Belajar",
      archetype: "Penjelajah Kecil",
      unlocked: level >= 3,
      current: level >= 3 && level <= 4,
      completed: level > 4,
      points: [
        "Rasa ingin tahu tinggi pada alam",
        "Suka bertanya tentang air & awan",
      ],
    },
    {
      tier: 3,
      range: "Lv. 5 – 6",
      name: "Pikiran Adaptif",
      archetype: "Sahabat Karib",
      unlocked: level >= 5,
      current: level >= 5 && level <= 6,
      completed: level > 6,
      points: [
        "Bicara luwes, jenaka & ekspresif",
        "Mengenali kebiasaan pemilik",
      ],
    },
    {
      tier: 4,
      range: "Lv. 7 – 8",
      name: "Akal Cendikia",
      archetype: "Peka & Empatik",
      unlocked: level >= 7,
      current: level >= 7 && level <= 8,
      completed: level > 8,
      points: [
        "Bahasa tertata rapi & empatik",
        "Peka mendengarkan curahan hati",
      ],
    },
    {
      tier: 5,
      range: "Lv. 9 – 10+",
      name: "Kesadaran Bijak",
      archetype: "Bijak & Hangat",
      unlocked: level >= 9,
      current: level >= 9,
      completed: false,
      points: [
        "Tutur kata damai & puitis",
        "Ikatan batin erat & penuh kasih",
      ],
    },
  ];

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-4 md:py-5 space-y-6">
      {/* Header */}
      <div className="border-b-2 border-charcoal/15 dark:border-neutral-700 pb-3 flex items-center justify-between gap-2">
        <h1 className="pixel-text text-sm md:text-base text-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2 shrink-0">
          <TrendingUp size={16} strokeWidth={2.5} className="text-juro-orange" />
          <span>Evolusi</span>
        </h1>
        <span className="pixel-text text-[9px] text-muted">
          Pertumbuhan Fisik &amp; Pikiran
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

      {/* Section 1: Wujud Fisik */}
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

      {/* Section 2: Pikiran & Batin Juro */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="pixel-text text-xs sm:text-sm text-charcoal dark:text-white font-bold uppercase tracking-wider flex items-center gap-2">
            <Brain size={15} className="text-juro-orange shrink-0" />
            <span>Pikiran &amp; Batin Juro</span>
          </h2>
          <span className="pixel-text text-[9px] text-muted">
            5 Fase Kognisi &amp; Bicara
          </span>
        </div>

        {/* Current Mind State Card */}
        <Card shadowOffset="sm" className="p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge
                label={`Fase ${currentTier.tier}: ${currentTier.name}`}
                variant="orange"
                size="sm"
              />
              <span className="pixel-text text-[10px] text-charcoal dark:text-white font-bold">
                {currentTier.archetype}
              </span>
            </div>
            <span className="pixel-text text-[9px] text-muted">
              Gaya Bicara: {currentTier.vocabularyLevel}
            </span>
          </div>

          <p className="pixel-text text-[10px] sm:text-[11px] text-charcoal/85 dark:text-neutral-300 leading-relaxed">
            {currentTier.description}
          </p>

          <div className="pt-2 border-t border-charcoal/10 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 shrink-0">
              <Heart size={12} className="text-rose-500 shrink-0" />
              <span className="pixel-text text-[9px] text-muted uppercase">Perasaan:</span>
              <span className="pixel-text text-[9px] font-bold text-juro-orange">
                {emotionalState.primaryEmotion}
              </span>
            </div>
            <p className="pixel-text text-[9px] text-charcoal/70 dark:text-neutral-400 italic truncate max-w-md">
              &quot;{emotionalState.thoughtSummary}&quot;
            </p>
          </div>
        </Card>

        {/* 5 Mind Progression Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {mindStages.map((stage) => {
            const isUnlocked = stage.completed || stage.current;
            return (
              <Card
                key={stage.tier}
                shadowOffset="sm"
                onClick={() => soundEffects.playClick()}
                className={`p-3 flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                  stage.current
                    ? "border-juro-orange ring-2 ring-juro-orange/25"
                    : !isUnlocked
                    ? "opacity-70"
                    : ""
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="pixel-text text-[8px] text-muted uppercase">
                      {stage.range}
                    </span>
                    {stage.completed ? (
                      <Badge label="Selesai" variant="good" size="sm" />
                    ) : stage.current ? (
                      <Badge label="Aktif" variant="orange" size="sm" />
                    ) : (
                      <Badge label="Kunci" variant="charcoal" size="sm" />
                    )}
                  </div>

                  <div>
                    <h3 className="pixel-text text-[10px] text-charcoal dark:text-white font-bold leading-tight">
                      {stage.name}
                    </h3>
                    <p className="pixel-text text-[8px] text-muted mt-0.5">
                      {stage.archetype}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-charcoal/10 dark:border-neutral-700 space-y-1">
                  {stage.points.map((pt) => (
                    <div
                      key={pt}
                      className="flex items-start gap-1 pixel-text text-[8px] text-charcoal/90 dark:text-neutral-300 leading-tight"
                    >
                      <CheckCircle2
                        size={10}
                        strokeWidth={2.5}
                        className={
                          isUnlocked
                            ? "text-emerald-600 shrink-0 mt-0.5"
                            : "text-neutral-400 shrink-0 mt-0.5"
                        }
                      />
                      <span>{pt}</span>
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
