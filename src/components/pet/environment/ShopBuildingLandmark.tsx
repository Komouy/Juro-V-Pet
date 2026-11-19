import React from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { TimeThemeConfig } from "../../../utils/timeOfDay";
import { BASE_GROUND_Y } from "../../../engine/world/mapTerrain";

export interface ShopBuildingLandmarkProps {
  theme: TimeThemeConfig;
  woodColor: string;
  woodDarkColor: string;
  isLanternLit: boolean;
  isHovered: boolean;
  shopSignTex: THREE.CanvasTexture | null;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onHoverChange: (isHovered: boolean) => void;
}

/**
 * Interactive 3D Juro Shop Building ("TOKO") on Back-Right Hillside — Click to open /shop
 */
export const ShopBuildingLandmark: React.FC<ShopBuildingLandmarkProps> = ({
  theme,
  woodColor,
  woodDarkColor,
  isLanternLit,
  isHovered,
  shopSignTex,
  onPointerDown,
  onClick,
  onHoverChange,
}) => {
  return (
    <group
      position={[4.55, BASE_GROUND_Y, -2.55]}
      rotation={[0, -0.52, 0]}
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
      {/* Wooden Shop Foundation Step */}
      <mesh position={[0, 0.04, 0.08]}>
        <boxGeometry args={[1.4, 0.08, 1.18]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
      {/* Warm Cream Shop Walls */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.28, 0.88, 0.98]} />
        <meshLambertMaterial color={theme.isNight ? "#94A3B8" : "#FFF7ED"} />
      </mesh>
      {/* Crisp Wooden Roof Trim */}
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[1.38, 0.08, 1.08]} />
        <meshLambertMaterial color={woodColor} />
      </mesh>
      {/* Pitched Shop Roof */}
      <mesh position={[0, 1.26, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.04, 0.58, 4]} />
        <meshLambertMaterial color={theme.isNight ? "#9A3412" : "#EA580C"} />
      </mesh>
      {/* Wooden Entrance Door (Left Side of Storefront) */}
      <mesh position={[-0.34, 0.34, 0.505]}>
        <boxGeometry args={[0.3, 0.54, 0.03]} />
        <meshLambertMaterial color={woodDarkColor} />
      </mesh>
      <mesh position={[-0.24, 0.34, 0.53]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshLambertMaterial color="#FACC15" />
      </mesh>
      {/* Wide Illuminated Shop Display Window (Right Side) */}
      <mesh position={[0.24, 0.44, 0.505]}>
        <boxGeometry args={[0.56, 0.34, 0.03]} />
        <meshStandardMaterial
          color={isLanternLit ? "#FEF08A" : "#E0F2FE"}
          emissive={isLanternLit ? "#F59E0B" : "#38BDF8"}
          emissiveIntensity={isLanternLit ? 1.1 : isHovered ? 0.35 : 0.08}
        />
      </mesh>
      {/* Wooden Display Counter Shelf + Mini Shop Goods */}
      <mesh position={[0.24, 0.25, 0.58]}>
        <boxGeometry args={[0.62, 0.05, 0.16]} />
        <meshLambertMaterial color={woodColor} />
      </mesh>
      <mesh position={[0.06, 0.33, 0.58]}>
        <cylinderGeometry args={[0.045, 0.05, 0.11, 8]} />
        <meshLambertMaterial color="#F97316" />
      </mesh>
      <mesh position={[0.22, 0.32, 0.58]}>
        <boxGeometry args={[0.09, 0.09, 0.09]} />
        <meshLambertMaterial color="#10B981" />
      </mesh>
      <mesh position={[0.38, 0.33, 0.58]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshLambertMaterial color="#FACC15" />
      </mesh>
      {/* Striped Orange & Cream Shop Awning Canopy */}
      <group position={[0, 0.72, 0.63]} rotation={[0.38, 0, 0]}>
        {[-0.5, -0.25, 0, 0.25, 0.5].map((xOff, idx) => (
          <mesh key={idx} position={[xOff, 0, 0]}>
            <boxGeometry args={[0.25, 0.045, 0.36]} />
            <meshLambertMaterial color={idx % 2 === 0 ? "#F97316" : "#FFF7ED"} />
          </mesh>
        ))}
      </group>
      {/* Pixel Wooden Signboard: "TOKO" */}
      <group position={[0, 1.07, 0.78]}>
        <mesh position={[-0.24, -0.14, -0.04]}>
          <boxGeometry args={[0.05, 0.18, 0.05]} />
          <meshLambertMaterial color={woodDarkColor} />
        </mesh>
        <mesh position={[0.24, -0.14, -0.04]}>
          <boxGeometry args={[0.05, 0.18, 0.05]} />
          <meshLambertMaterial color={woodDarkColor} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.82, 0.25, 0.05]} />
          <meshLambertMaterial color="#171717" />
        </mesh>
        {shopSignTex && (
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[0.78, 0.22]} />
            <meshBasicMaterial map={shopSignTex} />
          </mesh>
        )}
      </group>
    </group>
  );
};
