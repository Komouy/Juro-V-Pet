import React from "react";
import {
  Brain,
  Sparkles,
  Heart,
  Smile,
  Activity,
  X,
  MessageSquare,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  getCognitiveTier,
  computePetEmotionalState,
  COGNITIVE_TIERS,
  type PetEmotionalState,
} from "../../../engine/ai/cognitiveCore";
import type { PetAttributes } from "../../../types/pet";

interface AICoreModalProps {
  open: boolean;
  onClose: () => void;
  level: number;
  attributes: Partial<PetAttributes>;
  context?: {
    currentState?: string;
    isDizzy?: boolean;
    isSleeping?: boolean;
    isPetting?: boolean;
    isBathing?: boolean;
    isEating?: boolean;
    isPlaying?: boolean;
    isSittingOnBench?: boolean;
    isInWater?: boolean;
    isRaining?: boolean;
    isNight?: boolean;
  };
  onAskFeelings: (prompt?: string) => void;
}

export const AICoreModal: React.FC<AICoreModalProps> = ({
  open,
  onClose,
  level,
  attributes,
  context,
  onAskFeelings,
}) => {
  if (!open) return null;

  const currentTier = getCognitiveTier(level);
  const emotionalState: PetEmotionalState = computePetEmotionalState(attributes, {
    ...context,
    level,
  });

  const handleAskTrigger = () => {
    onClose();
    onAskFeelings("Bagaimana perasaanmu dan apa yang lagi kamu pikirkan sekarang?");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-core-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-warm-white dark:bg-neutral-900 border-3 border-charcoal dark:border-neutral-500 shadow-[5px_5px_0px_#171717] dark:shadow-[5px_5px_0px_#000000] p-4 sm:p-5 flex flex-col gap-4 text-charcoal dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-charcoal/20 dark:border-neutral-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-none bg-purple-500/15 border-2 border-purple-600 dark:border-purple-400 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Brain size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="ai-core-title" className="pixel-text text-sm sm:text-base font-bold text-charcoal dark:text-white uppercase tracking-wider">
                  Otak AI &amp; Kesadaran Juro
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] pixel-text font-bold bg-purple-500 text-white border border-charcoal shadow-[1px_1px_0px_#171717]">
                  Lv.{level}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400">
                Sistem kognisi adaptif &amp; pemahaman emosional mandiri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel Otak AI"
            className="p-1.5 border-2 border-charcoal dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cognitive Stage Summary Card */}
        <div className="bg-amber-500/10 dark:bg-amber-400/10 border-2 border-amber-600/40 dark:border-amber-400/30 p-3 sm:p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="pixel-text text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                Tier {currentTier.tier}: {currentTier.name}
              </span>
            </div>
            <span className="text-[10px] pixel-text font-bold px-2 py-0.5 bg-amber-500 text-charcoal border border-charcoal">
              {currentTier.archetype}
            </span>
          </div>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {currentTier.description}
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-600 dark:text-neutral-400 flex-wrap">
            <span className="font-semibold text-charcoal dark:text-neutral-200">Kapasitas Bahasa:</span>
            <span className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-mono">
              {currentTier.vocabularyLevel}
            </span>
            <span className="text-neutral-400">•</span>
            <span className="text-[10px]">Tumbuh otomatis seiring level peliharaan</span>
          </div>
        </div>

        {/* Cognitive Tiers Progression Track */}
        <div className="flex flex-col gap-1.5">
          <span className="pixel-text text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
            Jalur Evolusi Kognitif (5 Fase):
          </span>
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
            {Object.values(COGNITIVE_TIERS).map((t) => {
              const isCurrent = t.tier === currentTier.tier;
              const isPast = t.tier < currentTier.tier;

              return (
                <div
                  key={t.tier}
                  className={`p-1.5 text-center border-2 transition-all flex flex-col items-center justify-between gap-1 min-h-[64px] ${
                    isCurrent
                      ? "border-juro-orange bg-juro-orange/15 shadow-[2px_2px_0px_#171717]"
                      : isPast
                      ? "border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      : "border-neutral-300 dark:border-neutral-700 opacity-60 bg-neutral-100 dark:bg-neutral-800/40 text-neutral-400"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {isCurrent ? (
                      <Sparkles size={12} className="text-juro-orange animate-bounce" />
                    ) : isPast ? (
                      <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Lock size={12} className="text-neutral-400" />
                    )}
                  </div>
                  <span className="pixel-text text-[9px] font-bold leading-tight block">
                    T{t.tier}
                  </span>
                  <span className="text-[8px] font-mono leading-none block">
                    {t.unlockLevels.replace("Level ", "Lv.")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Emotional Condition & Inner Thoughts */}
        <div className="bg-sky-500/10 dark:bg-sky-400/10 border-2 border-sky-600/40 dark:border-sky-400/30 p-3 sm:p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Heart size={16} className="text-rose-500 animate-pulse shrink-0" />
              <span className="pixel-text text-xs sm:text-sm font-bold text-sky-950 dark:text-sky-200">
                Kondisi Emosional Saat Ini
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 bg-white dark:bg-neutral-800 border border-sky-300 dark:border-neutral-700">
                Intensitas: {emotionalState.moodIntensity}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500 text-white font-bold border border-charcoal">
                Resonansi: {emotionalState.resonanceScore}%
              </span>
            </div>
          </div>

          <div className="p-2 bg-white/80 dark:bg-neutral-800/80 border border-sky-200 dark:border-neutral-700 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Smile size={14} className="text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-charcoal dark:text-white">
                Emosi Dominan:
              </span>
              <span className="px-2 py-0.5 bg-juro-orange text-white text-[10px] pixel-text font-bold border border-charcoal">
                {emotionalState.primaryEmotion}
              </span>
            </div>

            <div className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed italic border-l-2 border-sky-400 pl-2 mt-1">
              &quot;{emotionalState.thoughtSummary}&quot;
            </div>
          </div>

          {/* Resonance Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                <Activity size={11} /> Indeks Harmoni Jiwa
              </span>
              <span className="font-bold">{emotionalState.resonanceScore} / 100</span>
            </div>
            <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-700 border border-charcoal overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 transition-all duration-300"
                style={{ width: `${Math.max(5, Math.min(100, emotionalState.resonanceScore))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Conversation CTA */}
        <div className="pt-1 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleAskTrigger}
            className="flex-1 h-11 px-4 bg-juro-orange hover:bg-juro-orange/90 text-white font-bold pixel-text text-xs uppercase border-2 border-charcoal shadow-[3px_3px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2 cursor-pointer transition-transform"
          >
            <MessageSquare size={16} />
            <span>Tanya Perasaan Juro</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 bg-warm-white dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border-2 border-charcoal dark:border-neutral-600 pixel-text text-xs uppercase cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
