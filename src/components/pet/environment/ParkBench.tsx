import React from "react";
import { Html } from "@react-three/drei";
import { Armchair, Footprints, X } from "lucide-react";
import { BASE_GROUND_Y } from "../../../engine/world/mapTerrain";

export interface ParkBenchProps {
  woodColor: string;
  woodDarkColor: string;
  onBenchClick?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  isHovered?: boolean;
  isSitting?: boolean;
  isMenuOpen?: boolean;
  onSit?: () => void;
  onStand?: () => void;
  onCloseMenu?: () => void;
}

/**
 * East Knoll Wooden Park Bench with Interactive "Duduk" (Sit) Trigger
 * The contextual menu alert is strictly anchored atop the bench in 3D world coordinates
 * and will NEVER follow Juro's movements or positions.
 */
export const ParkBench: React.FC<ParkBenchProps> = ({
  woodColor,
  woodDarkColor,
  onBenchClick,
  onHoverChange,
  isHovered = false,
  isSitting = false,
  isMenuOpen = false,
  onSit,
  onStand,
  onCloseMenu,
}) => {
  const activeWoodColor = isHovered || isSitting ? "#D97706" : woodColor;
  const activeLegColor = isHovered ? "#52525B" : woodDarkColor;

  return (
    <group
      position={[3.65, BASE_GROUND_Y + 0.42, 0.95]}
      rotation={[0, -0.75, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onBenchClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange?.(true);
      }}
      onPointerOut={() => onHoverChange?.(false)}
    >
      {/* Invisible enlarged hitbox for reliable clicks/taps across desktop & touch devices */}
      <mesh position={[0, 0.2, 0]} visible={false}>
        <boxGeometry args={[1.1, 0.65, 0.7]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Bench Seat Board */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.72, 0.05, 0.24]} />
        <meshLambertMaterial color={activeWoodColor} />
      </mesh>

      {/* Bench Backrest Board */}
      <mesh position={[0, 0.3, -0.1]}>
        <boxGeometry args={[0.72, 0.16, 0.045]} />
        <meshLambertMaterial color={activeWoodColor} />
      </mesh>

      {/* Left Cast-Iron / Dark Wood Legs */}
      <mesh position={[-0.28, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.16, 0.2]} />
        <meshLambertMaterial color={activeLegColor} />
      </mesh>

      {/* Right Cast-Iron / Dark Wood Legs */}
      <mesh position={[0.28, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.16, 0.2]} />
        <meshLambertMaterial color={activeLegColor} />
      </mesh>

      {/* Contextual Park Bench Menu ("Duduk" / "Berdiri") - ALWAYS anchored strictly atop the bench! */}
      {isMenuOpen && (
        <Html
          position={[0, 0.52, 0]}
          zIndexRange={[80, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            data-bench-menu="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="animate-tray-enter relative flex flex-col gap-1.5 p-2 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] min-w-[148px] pointer-events-auto select-none -translate-x-1/2 -translate-y-full mb-1.5"
          >
            {/* Tail arrow pointing directly down to the wooden seat */}
            <div
              style={{ left: "50%" }}
              className="absolute -translate-x-1/2 w-3 h-3 bg-warm-white dark:bg-neutral-900 rotate-45 pointer-events-none -bottom-1.5 border-r-2 border-b-2 border-charcoal dark:border-neutral-600"
              aria-hidden="true"
            />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-neutral-300 dark:border-neutral-700 pb-1">
              <div className="flex items-center gap-1.5">
                <Armchair size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="pixel-text text-[9px] uppercase font-bold text-charcoal dark:text-white">
                  Kursi Taman
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMenu}
                className="text-neutral-400 hover:text-charcoal dark:hover:text-white cursor-pointer"
                aria-label="Tutup menu kursi"
              >
                <X size={12} />
              </button>
            </div>

            {/* Action Button: Duduk or Berdiri */}
            {isSitting ? (
              <button
                type="button"
                onClick={onStand}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                <Footprints size={12} />
                Berdiri
              </button>
            ) : (
              <button
                type="button"
                onClick={onSit}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                <Armchair size={12} />
                Duduk
              </button>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
