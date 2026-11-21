import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { ArrowBigUp, Footprints, X } from "lucide-react";
import * as THREE from "three";
import { BASE_GROUND_Y } from "../../../engine/world/mapTerrain";

export interface BouncyMushroomTrampolineProps {
  onTrampolineClick?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  isHovered?: boolean;
  isBouncing?: boolean;
  isMenuOpen?: boolean;
  onStartBounce?: () => void;
  onStopBounce?: () => void;
  onCloseMenu?: () => void;
}

/**
 * Bouncy Mushroom Trampoline in the South-West Meadow.
 * Interactive landmark where Juro bounces up and down with springy squishy physics.
 * Contextual menu is strictly anchored atop the mushroom cap in 3D world space (never follows camera!).
 */
export const BouncyMushroomTrampoline: React.FC<BouncyMushroomTrampolineProps> = ({
  onTrampolineClick,
  onHoverChange,
  isHovered = false,
  isBouncing = false,
  isMenuOpen = false,
  onStartBounce,
  onStopBounce,
  onCloseMenu,
}) => {
  const capMeshRef = useRef<THREE.Mesh>(null);
  const stemMeshRef = useRef<THREE.Mesh>(null);

  // Dynamic spring squash & stretch bounce when Juro is actively jumping on it!
  useFrame((state) => {
    if (!capMeshRef.current || !stemMeshRef.current) return;
    const t = state.clock.getElapsedTime();

    if (isBouncing) {
      // Impact compression occurs when Juro lands (sin < 0)
      const sinVal = Math.sin(t * 7.5);
      const impact = Math.max(0, -sinVal); // 0 when airborne, 0 -> 1 during landing squash
      const capSquash = 1 + impact * 0.18;
      const capStretchY = 1 - impact * 0.22;

      capMeshRef.current.scale.set(1.08 * capSquash, 0.44 * capStretchY, 1.08 * capSquash);
      capMeshRef.current.position.y = 0.20 - impact * 0.04;
      stemMeshRef.current.scale.set(capSquash * 0.95, capStretchY, capSquash * 0.95);
      stemMeshRef.current.position.y = 0.10 - impact * 0.02;
    } else {
      // Gentle idle breathing
      const idleWave = Math.sin(t * 1.8) * 0.02;
      capMeshRef.current.scale.set(1.08 * (1 + idleWave), 0.44 * (1 - idleWave), 1.08 * (1 + idleWave));
      capMeshRef.current.position.y = 0.20;
      stemMeshRef.current.scale.set(1, 1, 1);
      stemMeshRef.current.position.y = 0.10;
    }
  });

  const capColor = isHovered ? "#F87171" : "#EF4444";
  const stemColor = "#FEF3C7";

  return (
    <group
      position={[-1.75, BASE_GROUND_Y, 1.25]}
      onClick={(e) => {
        e.stopPropagation();
        onTrampolineClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange?.(true);
      }}
      onPointerOut={() => onHoverChange?.(false)}
    >
      {/* Invisible enlarged hitbox for reliable clicks/taps across desktop & touch devices */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.85, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Earthy Ring Base with tiny grass collar */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.52, 16]} />
        <meshLambertMaterial color="#15803D" />
      </mesh>

      {/* Thick Mushroom Stalk */}
      <mesh ref={stemMeshRef} position={[0, 0.10, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 0.20, 14]} />
        <meshLambertMaterial color={stemColor} />
      </mesh>

      {/* Chunky Bouncy Mushroom Cap (Squash & Stretch Cap) */}
      <mesh ref={capMeshRef} position={[0, 0.20, 0]} scale={[1.08, 0.44, 1.08]}>
        <sphereGeometry args={[0.50, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial
          color={capColor}
          roughness={0.35}
          metalness={0.08}
          emissive={capColor}
          emissiveIntensity={isBouncing ? 0.35 : 0.08}
        />

        {/* Polka Dot Spots atop mushroom cap */}
        {[
          { pos: [0.22, 0.36, 0.14], scale: 0.10 },
          { pos: [-0.22, 0.34, -0.14], scale: 0.10 },
          { pos: [0.16, 0.32, -0.22], scale: 0.09 },
          { pos: [-0.24, 0.30, 0.16], scale: 0.09 },
          { pos: [0, 0.46, 0], scale: 0.11 },
        ].map((spot, i) => (
          <mesh
            key={i}
            position={spot.pos as [number, number, number]}
            scale={[spot.scale, spot.scale * 0.3, spot.scale]}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}

        {/* Soft Flat Bouncy Trampoline Pad Ring */}
        <mesh position={[0, 0.465, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.36, 16]} />
          <meshBasicMaterial color="#FCA5A5" transparent opacity={0.4} />
        </mesh>
      </mesh>

      {/* Contextual Trampoline Popover Menu - ALWAYS strictly anchored atop the trampoline in 3D world space! */}
      {isMenuOpen && (
        <Html
          position={[0, isBouncing ? 1.45 : 0.94, 0]}
          zIndexRange={[80, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            data-trampoline-menu="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="animate-tray-enter relative flex flex-col gap-1.5 p-2 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] min-w-[154px] pointer-events-auto select-none -translate-x-1/2 -translate-y-full mb-1.5"
          >
            {/* Diamond tail pointing directly down to the mushroom cap */}
            <div
              style={{ left: "50%" }}
              className="absolute -translate-x-1/2 w-3 h-3 bg-warm-white dark:bg-neutral-900 rotate-45 pointer-events-none -bottom-1.5 border-r-2 border-b-2 border-charcoal dark:border-neutral-600"
              aria-hidden="true"
            />

            {/* Header with ArrowBigUp (bouncing) icon - NO sparkles! */}
            <div className="flex items-center justify-between gap-2 border-b border-neutral-300 dark:border-neutral-700 pb-1">
              <div className="flex items-center gap-1.5">
                <ArrowBigUp size={13} className="text-emerald-600 dark:text-emerald-400 fill-current shrink-0" />
                <span className="pixel-text text-[9px] uppercase font-bold text-charcoal dark:text-white">
                  Trampolin Jamur
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMenu}
                className="text-neutral-400 hover:text-charcoal dark:hover:text-white cursor-pointer"
                aria-label="Tutup menu trampolin"
              >
                <X size={12} />
              </button>
            </div>

            {/* Action Button: Main Trampolin or Selesai */}
            {isBouncing ? (
              <button
                type="button"
                onClick={onStopBounce}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                <Footprints size={12} />
                Selesai Main
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartBounce}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                <ArrowBigUp size={12} className="fill-current" />
                Main Trampolin
              </button>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
