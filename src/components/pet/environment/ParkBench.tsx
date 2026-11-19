import React from "react";
import { BASE_GROUND_Y } from "../../../engine/world/mapTerrain";

export interface ParkBenchProps {
  woodColor: string;
  woodDarkColor: string;
}

/**
 * East Knoll Wooden Park Bench
 */
export const ParkBench: React.FC<ParkBenchProps> = ({ woodColor, woodDarkColor }) => {
  return (
    <group position={[3.65, BASE_GROUND_Y + 0.42, 0.95]} rotation={[0, -0.75, 0]}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.72, 0.05, 0.24]} />
        <meshLambertMaterial color={woodColor} />
      </mesh>
      <mesh position={[0, 0.3, -0.1]}>
        <boxGeometry args={[0.72, 0.16, 0.045]} />
        <meshLambertMaterial color={woodColor} />
      </mesh>
      <mesh position={[-0.28, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.16, 0.2]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
      <mesh position={[0.28, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.16, 0.2]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
    </group>
  );
};
