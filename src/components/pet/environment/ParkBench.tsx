import React from "react";
import { BASE_GROUND_Y } from "../../../engine/world/mapTerrain";

export interface ParkBenchProps {
  woodColor: string;
  woodDarkColor: string;
  onBenchClick?: (screenPos?: { x: number; y: number }) => void;
  onHoverChange?: (isHovered: boolean) => void;
  isHovered?: boolean;
  isSitting?: boolean;
}

/**
 * East Knoll Wooden Park Bench with Interactive "Duduk" (Sit) Trigger
 */
export const ParkBench: React.FC<ParkBenchProps> = ({
  woodColor,
  woodDarkColor,
  onBenchClick,
  onHoverChange,
  isHovered = false,
  isSitting = false,
}) => {
  const activeWoodColor = isHovered || isSitting ? "#D97706" : woodColor;
  const activeLegColor = isHovered ? "#52525B" : woodDarkColor;

  return (
    <group
      position={[3.65, BASE_GROUND_Y + 0.42, 0.95]}
      rotation={[0, -0.75, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onBenchClick?.({ x: e.clientX, y: e.clientY });
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
    </group>
  );
};
