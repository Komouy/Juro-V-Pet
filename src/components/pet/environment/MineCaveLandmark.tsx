import React from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { TimeThemeConfig } from "../../../utils/timeOfDay";
import { BASE_GROUND_Y } from "../../../engine/world/mapTerrain";

export interface MineCaveLandmarkProps {
  theme: TimeThemeConfig;
  woodColor: string;
  woodDarkColor: string;
  isLanternLit: boolean;
  isHovered: boolean;
  mineSignTex: THREE.CanvasTexture | null;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onHoverChange: (isHovered: boolean) => void;
}

/**
 * Interactive 3D Crystal Mine Cave ("TAMBANG") Straight North Across Bridge — Click to open /mine
 */
export const MineCaveLandmark: React.FC<MineCaveLandmarkProps> = ({
  theme,
  woodColor,
  woodDarkColor,
  isLanternLit,
  isHovered,
  mineSignTex,
  onPointerDown,
  onClick,
  onHoverChange,
}) => {
  return (
    <group
      position={[-0.36, BASE_GROUND_Y, -4.55]}
      rotation={[0, 0, 0]}
      scale={isHovered ? 1.045 : 1}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHoverChange(false);
      }}
    >
      {/* Sculpted Rocky Cave Mountain Mound */}
      <mesh position={[0, 0.62, -0.36]} scale={[1.38, 1.02, 0.78]}>
        <dodecahedronGeometry args={[0.82, 1]} />
        <meshLambertMaterial color={theme.isNight ? "#334155" : "#64748B"} />
      </mesh>
      <mesh position={[-0.78, 0.36, -0.12]} scale={[0.92, 0.8, 0.75]}>
        <dodecahedronGeometry args={[0.52, 0]} />
        <meshLambertMaterial color={theme.isNight ? "#1E293B" : "#475569"} />
      </mesh>
      <mesh position={[0.78, 0.38, -0.1]} scale={[0.92, 0.82, 0.75]}>
        <dodecahedronGeometry args={[0.54, 0]} />
        <meshLambertMaterial color={theme.isNight ? "#1E293B" : "#475569"} />
      </mesh>
      <mesh position={[0.06, 1.05, -0.38]} scale={[1.08, 0.65, 0.76]}>
        <dodecahedronGeometry args={[0.56, 0]} />
        <meshLambertMaterial color={theme.isNight ? "#334155" : "#78716C"} />
      </mesh>

      {/* Deep Dark Mine Tunnel Portal */}
      <mesh position={[0, 0.38, 0.34]}>
        <boxGeometry args={[0.7, 0.74, 0.28]} />
        <meshBasicMaterial color="#0C0A09" />
      </mesh>

      {/* Timber Mine-Shaft Support Beams */}
      <mesh position={[-0.39, 0.4, 0.5]}>
        <boxGeometry args={[0.11, 0.8, 0.13]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
      <mesh position={[0.39, 0.4, 0.5]}>
        <boxGeometry args={[0.11, 0.8, 0.13]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
      <mesh position={[0, 0.8, 0.5]}>
        <boxGeometry args={[0.98, 0.12, 0.16]} />
        <meshLambertMaterial color={woodColor} />
      </mesh>

      {/* Hanging Mine Lantern */}
      <mesh position={[0.25, 0.67, 0.53]}>
        <boxGeometry args={[0.08, 0.1, 0.08]} />
        <meshStandardMaterial
          color="#FEF08A"
          emissive="#F59E0B"
          emissiveIntensity={isLanternLit || isHovered ? 1.5 : 0.85}
        />
      </mesh>

      {/* Mini Mine-Cart Wooden Sleepers & Steel Rails Leading Out to the Bridge Path */}
      {[0.64, 0.84, 1.04].map((zOff, idx) => (
        <mesh key={idx} position={[0, 0.02, zOff]}>
          <boxGeometry args={[0.54, 0.03, 0.06]} />
          <meshLambertMaterial color={woodDarkColor} />
        </mesh>
      ))}
      <mesh position={[-0.18, 0.04, 0.84]}>
        <boxGeometry args={[0.04, 0.025, 0.66]} />
        <meshLambertMaterial color="#94A3B8" />
      </mesh>
      <mesh position={[0.18, 0.04, 0.84]}>
        <boxGeometry args={[0.04, 0.025, 0.66]} />
        <meshLambertMaterial color="#94A3B8" />
      </mesh>

      {/* Glowing Miniature Crystal Clusters Embedded on Cave Entrance */}
      {/* Sky-Blue Kuarsa Cluster (Left) */}
      <mesh position={[-0.64, 0.25, 0.42]} rotation={[0.2, 0.2, 0.35]}>
        <coneGeometry args={[0.085, 0.28, 5]} />
        <meshStandardMaterial
          color="#38BDF8"
          emissive="#0284C7"
          emissiveIntensity={isHovered ? 1.1 : 0.55}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[-0.53, 0.18, 0.51]} rotation={[0.3, -0.2, -0.25]}>
        <coneGeometry args={[0.065, 0.2, 5]} />
        <meshStandardMaterial
          color="#7DD3FC"
          emissive="#38BDF8"
          emissiveIntensity={0.6}
          roughness={0.2}
        />
      </mesh>
      {/* Emerald & Amethyst Cluster (Right) */}
      <mesh position={[0.64, 0.26, 0.42]} rotation={[0.15, -0.3, -0.35]}>
        <coneGeometry args={[0.085, 0.28, 5]} />
        <meshStandardMaterial
          color="#10B981"
          emissive="#059669"
          emissiveIntensity={isHovered ? 1.1 : 0.55}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0.53, 0.18, 0.51]} rotation={[0.35, 0.1, 0.2]}>
        <coneGeometry args={[0.065, 0.21, 5]} />
        <meshStandardMaterial
          color="#A855F7"
          emissive="#9333EA"
          emissiveIntensity={0.65}
          roughness={0.2}
        />
      </mesh>

      {/* Pixel Wooden Signboard: "TAMBANG" */}
      <group position={[0, 1.0, 0.55]}>
        <mesh>
          <boxGeometry args={[0.92, 0.25, 0.05]} />
          <meshLambertMaterial color="#171717" />
        </mesh>
        {mineSignTex && (
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[0.88, 0.22]} />
            <meshBasicMaterial map={mineSignTex} />
          </mesh>
        )}
      </group>
    </group>
  );
};
