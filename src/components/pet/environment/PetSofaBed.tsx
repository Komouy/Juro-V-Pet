import React from "react";
import type { TimeThemeConfig } from "../../../utils/timeOfDay";
import { BASE_GROUND_Y } from "../../../engine/world/mapTerrain";

export interface PetSofaBedProps {
  theme: TimeThemeConfig;
  woodColor: string;
  woodDarkColor: string;
  onBedClick?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
}

/**
 * Juro's Cozy Pet Sofa Bed & Bedside Table on West Knoll
 * Featuring plush sofa cushion, padded backrest & armrests, bedside table with drawer and warm glowing lamp.
 */
export const PetSofaBed: React.FC<PetSofaBedProps> = ({
  theme,
  woodColor,
  woodDarkColor,
  onBedClick,
  onHoverChange,
}) => {
  return (
    <group
      position={[-3.25, BASE_GROUND_Y + 0.465, -0.55]}
      rotation={[0, 0.35, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onBedClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange?.(true);
      }}
      onPointerOut={() => onHoverChange?.(false)}
    >
      {/* 1. Cozy Woven Rug under the sofa */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[1.35, 1.05]} />
        <meshLambertMaterial color={theme.isNight ? "#1E293B" : "#FEF3C7"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[1.22, 0.92]} />
        <meshLambertMaterial color={theme.isNight ? "#334155" : "#FDE68A"} />
      </mesh>

      {/* 2. Pet Sofa Bed Base (Sofa Alas Tidur Pet) */}
      {/* 4 Tiny Wooden Stubby Feet */}
      <mesh position={[-0.38, 0.02, -0.24]}>
        <cylinderGeometry args={[0.028, 0.02, 0.04, 6]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
      <mesh position={[0.38, 0.02, -0.24]}>
        <cylinderGeometry args={[0.028, 0.02, 0.04, 6]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
      <mesh position={[-0.38, 0.02, 0.24]}>
        <cylinderGeometry args={[0.028, 0.02, 0.04, 6]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
      <mesh position={[0.38, 0.02, 0.24]}>
        <cylinderGeometry args={[0.028, 0.02, 0.04, 6]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>

      {/* Wooden Trim Plinth */}
      <mesh position={[0, 0.042, 0]}>
        <boxGeometry args={[0.92, 0.025, 0.68]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>

      {/* Sofa Upholstered Outer Base */}
      <mesh position={[0, 0.075, 0]}>
        <boxGeometry args={[0.9, 0.05, 0.66]} />
        <meshLambertMaterial color={theme.isNight ? "#312E81" : "#EA580C"} />
      </mesh>

      {/* Padded Curved Backrest (Sandaran Punggung Sofa Empuk) */}
      <mesh position={[0, 0.165, -0.24]}>
        <boxGeometry args={[0.9, 0.15, 0.14]} />
        <meshLambertMaterial color={theme.isNight ? "#3730A3" : "#F97316"} />
      </mesh>
      {/* Backrest Bolster Curve */}
      <mesh position={[0, 0.24, -0.24]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.9, 12]} />
        <meshLambertMaterial color={theme.isNight ? "#4338CA" : "#FB923C"} />
      </mesh>

      {/* Left Padded Armrest (Sandaran Tangan Kiri) */}
      <mesh position={[-0.39, 0.135, 0.04]}>
        <boxGeometry args={[0.12, 0.11, 0.44]} />
        <meshLambertMaterial color={theme.isNight ? "#3730A3" : "#F97316"} />
      </mesh>
      <mesh position={[-0.39, 0.19, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.44, 10]} />
        <meshLambertMaterial color={theme.isNight ? "#4338CA" : "#FB923C"} />
      </mesh>

      {/* Right Padded Armrest (Sandaran Tangan Kanan) */}
      <mesh position={[0.39, 0.135, 0.04]}>
        <boxGeometry args={[0.12, 0.11, 0.44]} />
        <meshLambertMaterial color={theme.isNight ? "#3730A3" : "#F97316"} />
      </mesh>
      <mesh position={[0.39, 0.19, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.44, 10]} />
        <meshLambertMaterial color={theme.isNight ? "#4338CA" : "#FB923C"} />
      </mesh>

      {/* 3. Super Soft Center Mattress Cushion Pad (Bantalan Tengah Super Empuk untuk Juro) */}
      <mesh position={[0, 0.09, 0.035]}>
        <boxGeometry args={[0.66, 0.075, 0.44]} />
        <meshLambertMaterial color={theme.isNight ? "#CBD5E1" : "#FFFBEB"} />
      </mesh>
      {/* Subtle Button Tuft Impressions */}
      <mesh position={[-0.14, 0.129, 0.035]}>
        <cylinderGeometry args={[0.016, 0.016, 0.005, 8]} />
        <meshLambertMaterial color={theme.isNight ? "#94A3B8" : "#FDE68A"} />
      </mesh>
      <mesh position={[0.14, 0.129, 0.035]}>
        <cylinderGeometry args={[0.016, 0.016, 0.005, 8]} />
        <meshLambertMaterial color={theme.isNight ? "#94A3B8" : "#FDE68A"} />
      </mesh>

      {/* 4. Cute Accent Throw Pillow (Bantal Sofa Bintang Pastel) */}
      <group position={[0.26, 0.155, -0.12]} rotation={[0.15, -0.28, 0.12]}>
        <mesh>
          <boxGeometry args={[0.16, 0.16, 0.05]} />
          <meshLambertMaterial color="#FDE047" />
        </mesh>
        <mesh position={[0, 0, 0.026]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* 5. Adorable Wooden Nightstand & Warm Bedside Lamp (Di Sebelah Kiri) */}
      <group position={[-0.62, 0, -0.18]}>
        {/* Nightstand Table */}
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshLambertMaterial color={woodColor} />
        </mesh>
        {/* Drawer line */}
        <mesh position={[0, 0.13, 0.112]}>
          <boxGeometry args={[0.16, 0.02, 0.01]} />
          <meshLambertMaterial color={woodDarkColor} />
        </mesh>
        <mesh position={[0, 0.08, 0.115]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshLambertMaterial color="#FDE047" />
        </mesh>

        {/* Bedside Lamp Base */}
        <mesh position={[0, 0.235, 0]}>
          <cylinderGeometry args={[0.035, 0.045, 0.03, 8]} />
          <meshLambertMaterial color={woodDarkColor} />
        </mesh>
        {/* Lamp Stem */}
        <mesh position={[0, 0.265, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.04, 6]} />
          <meshLambertMaterial color="#E5E7EB" />
        </mesh>
        {/* Lamp Shade (Glowing Warm Amber at Night!) */}
        <mesh position={[0, 0.31, 0]}>
          <cylinderGeometry args={[0.055, 0.08, 0.075, 10]} />
          <meshStandardMaterial
            color={theme.isNight ? "#FEF08A" : "#FEF3C7"}
            emissive={theme.isNight ? "#F59E0B" : "#000000"}
            emissiveIntensity={theme.isNight ? 1.5 : 0}
          />
        </mesh>
        {/* Soft Ambient Night Glow */}
        {theme.isNight && (
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.34, 10, 8]} />
            <meshBasicMaterial color="#FDE047" transparent opacity={0.18} depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  );
};
