import React from "react";
import { soundEffects } from "../../../engine/audio/soundEffects";
import type { EvolutionAlertData } from "../../../stores/petStore";

interface EvolutionModalProps {
  pendingEvolutionAlert: EvolutionAlertData | null;
  onClear: () => void;
}

/**
 * Milestone celebration modal shown when Juro evolves at Level 5 or Level 10.
 */
export const EvolutionModal: React.FC<EvolutionModalProps> = ({
  pendingEvolutionAlert,
  onClear,
}) => {
  if (!pendingEvolutionAlert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4">
      <div className="animate-tray-enter w-full max-w-xs rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[6px_6px_0_#18181B] dark:shadow-[6px_6px_0_#09090B] p-5 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 16 16" shapeRendering="crispEdges">
            {pendingEvolutionAlert.stageNumber === 2 && (
              <>
                <rect x="4" y="4" width="8" height="8" fill="#F97316" />
                <rect x="3" y="6" width="10" height="5" fill="#F97316" />
                <rect x="5" y="3" width="6" height="1" fill="#F97316" />
                <rect x="5" y="5" width="2" height="2" fill="#FDBA74" />
                <rect x="5" y="8" width="2" height="2" fill="#171717" />
                <rect x="9" y="8" width="2" height="2" fill="#171717" />
                <rect x="5" y="8" width="1" height="1" fill="#FFFFFF" />
                <rect x="9" y="8" width="1" height="1" fill="#FFFFFF" />
              </>
            )}
            {pendingEvolutionAlert.stageNumber === 3 && (
              <>
                <rect x="5" y="1" width="1" height="2" fill="#FACC15" />
                <rect x="7" y="1" width="2" height="2" fill="#FACC15" />
                <rect x="10" y="1" width="1" height="2" fill="#FACC15" />
                <rect x="5" y="3" width="6" height="1" fill="#EAB308" />
                <rect x="3" y="5" width="10" height="8" fill="#F97316" />
                <rect x="2" y="7" width="12" height="5" fill="#F97316" />
                <rect x="4" y="6" width="3" height="2" fill="#FDBA74" />
                <rect x="5" y="9" width="2" height="2" fill="#171717" />
                <rect x="9" y="9" width="2" height="2" fill="#171717" />
                <rect x="5" y="9" width="1" height="1" fill="#FFFFFF" />
                <rect x="9" y="9" width="1" height="1" fill="#FFFFFF" />
              </>
            )}
          </svg>
        </div>

        <div className="space-y-1.5">
          <h2 className="font-pixel text-base font-bold uppercase text-charcoal dark:text-white">
            Juro Berevolusi!
          </h2>
          <p className="text-sm text-charcoal/80 dark:text-neutral-300">
            Wujud baru:{" "}
            <span className="font-pixel text-juro-orange font-bold">
              {pendingEvolutionAlert.stageName}
            </span>{" "}
            <span className="font-mono-hud">(Level {pendingEvolutionAlert.level})</span>
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {pendingEvolutionAlert.stageNumber === 3
              ? "Juro kini berukuran dewasa megah dengan mahkota emas."
              : "Tubuh Juro membesar dan makin lincah membal."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEffects.playClick();
            onClear();
          }}
          className="console-btn-bevel w-full py-2.5 rounded-[4px] bg-juro-orange text-white border-2 border-charcoal shadow-[0_3px_0_#18181B] font-pixel text-xs font-bold uppercase hover:bg-[#EA580C] cursor-pointer"
        >
          Lanjutkan
        </button>
      </div>
    </div>
  );
};
