import React from "react";
import { SkipForward } from "lucide-react";
import { soundEffects } from "../../../engine/audio/soundEffects";

export interface IntroOverlayHUDProps {
  onSkip: () => void;
}

/**
 * Pure visual retro console letterbox frame with a tactile Skip keycap during the 3D intro cutscene.
 * Contains zero subtitle text, emojis, or decorative icons per Juro anti-AI-slop standards.
 */
export const IntroOverlayHUD: React.FC<IntroOverlayHUDProps> = ({ onSkip }) => {
  const handleSkip = () => {
    soundEffects.playClick();
    onSkip();
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-none select-none flex flex-col justify-between">
      {/* Top letterbox bar */}
      <div className="w-full h-9 sm:h-11 bg-[#18181B] border-b-2 border-[#27272A] flex items-center justify-end px-3 sm:px-5">
        <button
          type="button"
          onClick={handleSkip}
          className="pointer-events-auto console-btn-bevel inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-[38px] px-3 py-1 rounded-[4px] bg-[#FDFBF7] hover:bg-[#FFF6EB] text-[#18181B] border-2 border-[#18181B] shadow-[0_2px_0_#09090B] font-pixel text-[11px] font-bold uppercase tracking-wide cursor-pointer transition-colors"
          aria-label="Lewati animasi pembuka"
        >
          <span>Lewati</span>
          <SkipForward size={13} strokeWidth={2.4} className="text-[#F97316]" />
        </button>
      </div>

      {/* Bottom letterbox bar */}
      <div className="w-full h-9 sm:h-11 bg-[#18181B] border-t-2 border-[#27272A]" />
    </div>
  );
};
