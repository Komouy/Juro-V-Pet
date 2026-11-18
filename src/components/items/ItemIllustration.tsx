import React from "react";

export type ItemIllustrationId =
  | "honey-drop"
  | "orange-slice"
  | "melon-cubes"
  | "biscuit"
  | "warm-milk"
  | "bounce-ball"
  | "bubble-blower"
  | "music-box"
  | "bath-care"
  | "soap-bar"
  | "water-bucket"
  | "cloud-sleep"
  | "crystal-quartz"
  | "crystal-amber"
  | "crystal-emerald"
  | "crystal-amethyst"
  | "pickaxe"
  | "mine-ladder";

export interface ItemIllustrationProps {
  id: ItemIllustrationId | string;
  size?: number;
  className?: string;
}

export const ItemIllustration: React.FC<ItemIllustrationProps> = ({
  id,
  size = 48,
  className = "",
}) => {
  const renderGraphic = () => {
    switch (id) {
      case "orange-slice":
      case "food-1":
        // Crisp Pixel-art Sweet Orange Jelly Wedge
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            {/* Hard Drop Shadow */}
            <rect x="5" y="27" width="22" height="3" fill="#171717" opacity="0.3" />
            <rect x="7" y="25" width="18" height="2" fill="#171717" opacity="0.4" />
            {/* Outer Rind Outline */}
            <rect x="3" y="16" width="26" height="10" fill="#171717" />
            <rect x="4" y="14" width="24" height="12" fill="#171717" />
            <rect x="6" y="12" width="20" height="14" fill="#171717" />
            {/* Outer Orange Peel */}
            <rect x="4" y="16" width="24" height="9" fill="#EA580C" />
            <rect x="5" y="14" width="22" height="11" fill="#EA580C" />
            <rect x="7" y="13" width="18" height="12" fill="#EA580C" />
            {/* Inner White Pith Line */}
            <rect x="5" y="15" width="22" height="2" fill="#FFF7ED" />
            <rect x="6" y="14" width="20" height="2" fill="#FFF7ED" />
            {/* Juicy Citrus Jelly Pulp */}
            <rect x="6" y="16" width="20" height="7" fill="#F97316" />
            <rect x="8" y="15" width="16" height="8" fill="#F97316" />
            <rect x="10" y="14" width="12" height="9" fill="#F97316" />
            {/* Translucent Segments & Pulp Highlights */}
            <rect x="7" y="17" width="3" height="4" fill="#FDBA74" />
            <rect x="11" y="16" width="4" height="6" fill="#FED7AA" />
            <rect x="17" y="16" width="4" height="6" fill="#FED7AA" />
            <rect x="22" y="17" width="3" height="4" fill="#FDBA74" />
            {/* Glistening Catchlight Seeds */}
            <rect x="12" y="18" width="2" height="2" fill="#FFFFFF" />
            <rect x="18" y="18" width="2" height="2" fill="#FFFFFF" />
            {/* Top Cut Edge */}
            <rect x="7" y="12" width="18" height="2" fill="#EA580C" />
            <rect x="9" y="11" width="14" height="2" fill="#171717" />
          </svg>
        );

      case "honey-drop":
        // Golden Amber Honey Droplet Jar / Honeycomb
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="8" y="27" width="16" height="3" fill="#171717" opacity="0.3" />
            {/* Outline */}
            <rect x="10" y="4" width="12" height="24" fill="#171717" />
            <rect x="8" y="8" width="16" height="18" fill="#171717" />
            <rect x="6" y="12" width="20" height="12" fill="#171717" />
            {/* Jar Lid / Honeycomb top */}
            <rect x="11" y="5" width="10" height="3" fill="#B45309" />
            <rect x="9" y="8" width="14" height="2" fill="#78350F" />
            {/* Rich Amber Honey Body */}
            <rect x="8" y="10" width="16" height="15" fill="#F59E0B" />
            <rect x="7" y="13" width="18" height="10" fill="#F59E0B" />
            {/* Dark Golden Honey Glow at bottom */}
            <rect x="9" y="20" width="14" height="4" fill="#D97706" />
            {/* Translucent Highlights */}
            <rect x="9" y="12" width="4" height="9" fill="#FDE68A" />
            <rect x="10" y="11" width="2" height="4" fill="#FEF3C7" />
            <rect x="10" y="13" width="1" height="5" fill="#FFFFFF" />
            {/* Honey Dripping Node */}
            <rect x="14" y="26" width="4" height="2" fill="#F59E0B" />
            <rect x="15" y="28" width="2" height="2" fill="#D97706" />
          </svg>
        );

      case "melon-cubes":
        // Crisp Mint-Green Melon Jelly Cubes
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="4" y="27" width="24" height="3" fill="#171717" opacity="0.3" />
            {/* Saucer / Plate */}
            <rect x="4" y="24" width="24" height="3" fill="#171717" />
            <rect x="6" y="23" width="20" height="3" fill="#E2E8F0" />
            {/* Cube 1 (Left) */}
            <rect x="5" y="13" width="11" height="10" fill="#171717" />
            <rect x="6" y="14" width="9" height="8" fill="#10B981" />
            <rect x="7" y="14" width="7" height="3" fill="#6EE7B7" />
            <rect x="7" y="15" width="2" height="2" fill="#ECFDF5" />
            {/* Cube 2 (Right) */}
            <rect x="16" y="13" width="11" height="10" fill="#171717" />
            <rect x="17" y="14" width="9" height="8" fill="#059669" />
            <rect x="18" y="14" width="7" height="3" fill="#34D399" />
            <rect x="18" y="15" width="2" height="2" fill="#ECFDF5" />
            {/* Cube 3 (Top Center) */}
            <rect x="10" y="6" width="12" height="10" fill="#171717" />
            <rect x="11" y="7" width="10" height="8" fill="#10B981" />
            <rect x="12" y="7" width="8" height="3" fill="#A7F3D0" />
            <rect x="12" y="8" width="2" height="3" fill="#FFFFFF" />
          </svg>
        );

      case "biscuit":
      case "food-2":
        // Crisp Golden Waffle Biscuit
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="6" y="26" width="20" height="3" fill="#171717" opacity="0.3" />
            {/* Biscuit Body */}
            <rect x="6" y="6" width="20" height="20" fill="#171717" />
            <rect x="7" y="7" width="18" height="18" fill="#D97706" />
            <rect x="8" y="8" width="16" height="16" fill="#F59E0B" />
            {/* Waffle Grid Holes */}
            <rect x="10" y="10" width="4" height="4" fill="#92400E" />
            <rect x="18" y="10" width="4" height="4" fill="#92400E" />
            <rect x="10" y="18" width="4" height="4" fill="#92400E" />
            <rect x="18" y="18" width="4" height="4" fill="#92400E" />
            {/* Top Cookie Crust Highlight */}
            <rect x="8" y="8" width="16" height="1" fill="#FDE68A" />
            <rect x="8" y="9" width="1" height="14" fill="#FDE68A" />
          </svg>
        );

      case "warm-milk":
      case "food-3":
        // Warm Steaming Milk Mug
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="6" y="27" width="20" height="3" fill="#171717" opacity="0.3" />
            {/* Steam Wiggles */}
            <rect x="12" y="3" width="2" height="3" fill="#CBD5E1" />
            <rect x="14" y="4" width="2" height="3" fill="#94A3B8" />
            <rect x="18" y="2" width="2" height="3" fill="#CBD5E1" />
            <rect x="20" y="4" width="2" height="3" fill="#94A3B8" />
            {/* Mug Outline */}
            <rect x="7" y="9" width="16" height="18" fill="#171717" />
            <rect x="22" y="13" width="6" height="10" fill="#171717" />
            {/* Mug Handle Hole */}
            <rect x="24" y="15" width="2" height="6" fill="#FFF7ED" />
            {/* Mug Exterior Ceramic */}
            <rect x="8" y="10" width="14" height="16" fill="#F97316" />
            {/* Warm Milk Foam Surface */}
            <rect x="9" y="11" width="12" height="4" fill="#F8FAFC" />
            <rect x="10" y="12" width="10" height="2" fill="#FFFFFF" />
            {/* Ceramic Gloss Highlight */}
            <rect x="9" y="16" width="2" height="8" fill="#FDBA74" />
          </svg>
        );

      case "bounce-ball":
      case "toy-1":
        // Bouncy Retro Striped Ball
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="7" y="26" width="18" height="3" fill="#171717" opacity="0.3" />
            {/* Ball Outline */}
            <rect x="9" y="5" width="14" height="22" fill="#171717" />
            <rect x="6" y="8" width="20" height="16" fill="#171717" />
            {/* Coral Red Top Band */}
            <rect x="10" y="6" width="12" height="5" fill="#EF4444" />
            <rect x="7" y="9" width="18" height="3" fill="#EF4444" />
            {/* Cyan Center Band */}
            <rect x="6" y="12" width="20" height="7" fill="#06B6D4" />
            <rect x="8" y="13" width="16" height="5" fill="#22D3EE" />
            {/* Yellow Bottom Band */}
            <rect x="7" y="19" width="18" height="4" fill="#F59E0B" />
            <rect x="9" y="21" width="14" height="5" fill="#FBBF24" />
            {/* Ball Specular Highlight */}
            <rect x="10" y="8" width="3" height="3" fill="#FFFFFF" />
            <rect x="11" y="12" width="2" height="2" fill="#E0F2FE" />
          </svg>
        );

      case "bubble-blower":
        // Soap Bubble Wand & Bubbles
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="6" y="27" width="20" height="3" fill="#171717" opacity="0.3" />
            {/* Wand Ring */}
            <rect x="5" y="5" width="12" height="12" fill="#171717" />
            <rect x="6" y="6" width="10" height="10" fill="#F59E0B" />
            <rect x="8" y="8" width="6" height="6" fill="#E0F2FE" opacity="0.8" />
            {/* Wand Handle */}
            <rect x="15" y="15" width="12" height="4" fill="#171717" transform="rotate(45 15 15)" />
            <rect x="16" y="16" width="10" height="2" fill="#D97706" transform="rotate(45 15 15)" />
            {/* Floating Soap Bubbles */}
            <rect x="19" y="4" width="8" height="8" fill="#171717" />
            <rect x="20" y="5" width="6" height="6" fill="#38BDF8" />
            <rect x="21" y="6" width="2" height="2" fill="#FFFFFF" />
            <rect x="15" y="1" width="5" height="5" fill="#171717" />
            <rect x="16" y="2" width="3" height="3" fill="#A855F7" />
          </svg>
        );

      case "music-box":
      case "toy-2":
        // Retro Chiptune Radio Player
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="4" y="27" width="24" height="3" fill="#171717" opacity="0.3" />
            {/* Antenna */}
            <rect x="6" y="3" width="2" height="6" fill="#171717" />
            <rect x="5" y="2" width="4" height="2" fill="#EF4444" />
            {/* Radio Body */}
            <rect x="4" y="8" width="24" height="19" fill="#171717" />
            <rect x="5" y="9" width="22" height="17" fill="#10B981" />
            {/* Speaker Grid (Left) */}
            <rect x="7" y="12" width="10" height="11" fill="#065F46" />
            <rect x="9" y="14" width="2" height="2" fill="#A7F3D0" />
            <rect x="13" y="14" width="2" height="2" fill="#A7F3D0" />
            <rect x="9" y="18" width="2" height="2" fill="#A7F3D0" />
            <rect x="13" y="18" width="2" height="2" fill="#A7F3D0" />
            {/* Tape/Display Window (Right) */}
            <rect x="19" y="12" width="6" height="6" fill="#171717" />
            <rect x="20" y="13" width="4" height="4" fill="#F59E0B" />
            {/* Knobs */}
            <rect x="19" y="20" width="3" height="3" fill="#EA580C" />
            <rect x="23" y="20" width="2" height="3" fill="#D97706" />
          </svg>
        );

      case "soap-bar":
        // Cute Bubbly Pastel-Pink Bar of Soap
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="6" y="26" width="20" height="3" fill="#171717" opacity="0.28" />
            {/* Floating Suds Bubbles */}
            <rect x="4" y="6" width="5" height="5" fill="#171717" />
            <rect x="5" y="7" width="3" height="3" fill="#E0F2FE" />
            <rect x="5" y="7" width="1" height="1" fill="#FFFFFF" />
            <rect x="23" y="4" width="6" height="6" fill="#171717" />
            <rect x="24" y="5" width="4" height="4" fill="#FFFFFF" />
            <rect x="26" y="7" width="1" height="1" fill="#BAE6FD" />
            {/* Soap Bar Outline */}
            <rect x="5" y="13" width="22" height="13" fill="#171717" />
            <rect x="7" y="11" width="18" height="16" fill="#171717" />
            {/* Soap Base Body */}
            <rect x="6" y="14" width="20" height="11" fill="#F472B6" />
            <rect x="8" y="12" width="16" height="14" fill="#F472B6" />
            {/* Lower Shade */}
            <rect x="7" y="21" width="18" height="4" fill="#DB2777" />
            {/* Top Glossy Face */}
            <rect x="8" y="13" width="16" height="6" fill="#F9A8D4" />
            <rect x="9" y="14" width="12" height="3" fill="#FCE7F3" />
            <rect x="10" y="14" width="4" height="2" fill="#FFFFFF" />
            {/* Little Suds Foam on Corner */}
            <rect x="20" y="10" width="6" height="5" fill="#171717" />
            <rect x="21" y="11" width="4" height="3" fill="#FFFFFF" />
          </svg>
        );

      case "water-bucket":
        // Crisp Pixel Bucket Filled with Sparkling Blue Water
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="7" y="27" width="18" height="3" fill="#171717" opacity="0.28" />
            {/* Curved Metal Handle */}
            <rect x="9" y="4" width="14" height="2" fill="#171717" />
            <rect x="7" y="6" width="2" height="6" fill="#171717" />
            <rect x="23" y="6" width="2" height="6" fill="#171717" />
            <rect x="10" y="5" width="12" height="1" fill="#94A3B8" />
            {/* Bucket Outline */}
            <rect x="5" y="10" width="22" height="4" fill="#171717" />
            <rect x="6" y="14" width="20" height="8" fill="#171717" />
            <rect x="8" y="22" width="16" height="6" fill="#171717" />
            {/* Sparkling Water Surface Inside Top */}
            <rect x="7" y="11" width="18" height="3" fill="#38BDF8" />
            <rect x="9" y="11" width="10" height="2" fill="#7DD3FC" />
            <rect x="11" y="11" width="4" height="1" fill="#FFFFFF" />
            {/* Water Splash Droplets */}
            <rect x="14" y="7" width="2" height="3" fill="#38BDF8" />
            <rect x="19" y="8" width="2" height="2" fill="#7DD3FC" />
            {/* Bucket Body (Sky/Steel Blue) */}
            <rect x="7" y="15" width="18" height="7" fill="#0284C7" />
            <rect x="9" y="22" width="14" height="5" fill="#0369A1" />
            {/* Bucket Rim & Shine */}
            <rect x="6" y="14" width="20" height="2" fill="#E2E8F0" />
            <rect x="9" y="17" width="3" height="8" fill="#38BDF8" />
            <rect x="10" y="17" width="1" height="6" fill="#BAE6FD" />
            {/* Bottom Metal Band */}
            <rect x="8" y="22" width="16" height="2" fill="#CBD5E1" />
          </svg>
        );

      case "bath-care":
      case "care-1":
        // Bubbles & Wash Tub
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="5" y="27" width="22" height="3" fill="#171717" opacity="0.3" />
            {/* Tub Body */}
            <rect x="5" y="13" width="22" height="14" fill="#171717" />
            <rect x="6" y="14" width="20" height="12" fill="#0284C7" />
            <rect x="4" y="12" width="24" height="3" fill="#0369A1" />
            {/* Overflowing Foam Suds */}
            <rect x="7" y="7" width="7" height="6" fill="#171717" />
            <rect x="8" y="8" width="5" height="4" fill="#F0F9FF" />
            <rect x="13" y="5" width="8" height="8" fill="#171717" />
            <rect x="14" y="6" width="6" height="6" fill="#FFFFFF" />
            <rect x="20" y="8" width="6" height="5" fill="#171717" />
            <rect x="21" y="9" width="4" height="3" fill="#F0F9FF" />
            {/* Sparkle Bubbles */}
            <rect x="15" y="8" width="2" height="2" fill="#38BDF8" />
            <rect x="9" y="10" width="1" height="1" fill="#38BDF8" />
          </svg>
        );

      case "cloud-sleep":
      case "care-2":
        // Soft Cloud Pillow
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="5" y="26" width="22" height="3" fill="#171717" opacity="0.3" />
            {/* Cloud Outline */}
            <rect x="6" y="12" width="20" height="13" fill="#171717" />
            <rect x="11" y="7" width="11" height="16" fill="#171717" />
            {/* Cloud Body */}
            <rect x="7" y="13" width="18" height="11" fill="#E0E7FF" />
            <rect x="12" y="8" width="9" height="14" fill="#EEF2FF" />
            <rect x="9" y="15" width="14" height="6" fill="#FFFFFF" />
            {/* Crescent Moon Accent */}
            <rect x="19" y="4" width="6" height="7" fill="#171717" />
            <rect x="20" y="5" width="4" height="5" fill="#FBBF24" />
            <rect x="20" y="5" width="2" height="3" fill="#EEF2FF" />
          </svg>
        );

      case "crystal-quartz":
        // Luminous Sky-Ice Quartz Crystal Cluster
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="6" y="27" width="20" height="3" fill="#171717" opacity="0.28" />
            {/* Center Tall Spire Outline */}
            <rect x="13" y="4" width="6" height="4" fill="#171717" />
            <rect x="11" y="8" width="10" height="19" fill="#171717" />
            {/* Side Spires Outline */}
            <rect x="5" y="13" width="6" height="14" fill="#171717" />
            <rect x="21" y="11" width="6" height="16" fill="#171717" />
            {/* Crystal Faces */}
            <rect x="14" y="6" width="4" height="4" fill="#E0F2FE" />
            <rect x="12" y="10" width="8" height="16" fill="#38BDF8" />
            <rect x="12" y="10" width="4" height="14" fill="#BAE6FD" />
            <rect x="13" y="8" width="2" height="12" fill="#FFFFFF" />
            {/* Left Spire */}
            <rect x="6" y="15" width="4" height="11" fill="#0284C7" />
            <rect x="6" y="15" width="2" height="9" fill="#7DD3FC" />
            {/* Right Spire */}
            <rect x="22" y="13" width="4" height="13" fill="#0EA5E9" />
            <rect x="22" y="13" width="2" height="10" fill="#BAE6FD" />
          </svg>
        );

      case "crystal-amber":
        // Warm Golden Honey Amber Crystal Cluster
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="6" y="27" width="20" height="3" fill="#171717" opacity="0.28" />
            <rect x="13" y="4" width="6" height="4" fill="#171717" />
            <rect x="11" y="8" width="10" height="19" fill="#171717" />
            <rect x="5" y="13" width="6" height="14" fill="#171717" />
            <rect x="21" y="11" width="6" height="16" fill="#171717" />
            <rect x="14" y="6" width="4" height="4" fill="#FEF3C7" />
            <rect x="12" y="10" width="8" height="16" fill="#F59E0B" />
            <rect x="12" y="10" width="4" height="14" fill="#FDE68A" />
            <rect x="13" y="8" width="2" height="12" fill="#FFFFFF" />
            <rect x="6" y="15" width="4" height="11" fill="#D97706" />
            <rect x="6" y="15" width="2" height="9" fill="#FBBF24" />
            <rect x="22" y="13" width="4" height="13" fill="#EA580C" />
            <rect x="22" y="13" width="2" height="10" fill="#FDBA74" />
          </svg>
        );

      case "crystal-emerald":
        // Vivid Emerald Green Gem Crystal
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="6" y="27" width="20" height="3" fill="#171717" opacity="0.28" />
            <rect x="12" y="4" width="8" height="4" fill="#171717" />
            <rect x="9" y="8" width="14" height="18" fill="#171717" />
            <rect x="11" y="25" width="10" height="3" fill="#171717" />
            {/* Emerald Facets */}
            <rect x="13" y="6" width="6" height="4" fill="#A7F3D0" />
            <rect x="10" y="10" width="12" height="15" fill="#10B981" />
            <rect x="16" y="10" width="6" height="15" fill="#059669" />
            <rect x="11" y="10" width="4" height="13" fill="#6EE7B7" />
            <rect x="12" y="11" width="2" height="7" fill="#FFFFFF" />
            <rect x="13" y="19" width="6" height="5" fill="#047857" />
          </svg>
        );

      case "crystal-amethyst":
        // Royal Epic Purple Amethyst Geode Cluster
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="5" y="27" width="22" height="3" fill="#171717" opacity="0.3" />
            {/* Main Royal Spire */}
            <rect x="12" y="3" width="8" height="5" fill="#171717" />
            <rect x="10" y="8" width="12" height="19" fill="#171717" />
            <rect x="4" y="12" width="6" height="15" fill="#171717" />
            <rect x="22" y="10" width="6" height="17" fill="#171717" />
            {/* Amethyst Facets */}
            <rect x="14" y="5" width="4" height="4" fill="#F3E8FF" />
            <rect x="11" y="9" width="10" height="17" fill="#9333EA" />
            <rect x="16" y="9" width="5" height="17" fill="#7E22CE" />
            <rect x="12" y="9" width="3" height="15" fill="#D8B4FE" />
            <rect x="13" y="7" width="2" height="11" fill="#FFFFFF" />
            <rect x="5" y="14" width="4" height="12" fill="#A855F7" />
            <rect x="5" y="14" width="2" height="9" fill="#E9D5FF" />
            <rect x="23" y="12" width="4" height="14" fill="#6B21A8" />
            <rect x="23" y="12" width="2" height="10" fill="#C084FC" />
          </svg>
        );

      case "pickaxe-wood":
        // Lv.1 Beliung Kayu (Carved Timber Head + Twine Wrap)
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            {/* Light Wood Handle */}
            <rect x="5" y="24" width="5" height="5" fill="#171717" />
            <rect x="8" y="21" width="5" height="5" fill="#171717" />
            <rect x="11" y="18" width="5" height="5" fill="#171717" />
            <rect x="14" y="15" width="5" height="5" fill="#171717" />
            <rect x="17" y="12" width="5" height="5" fill="#171717" />
            <rect x="6" y="25" width="3" height="3" fill="#92400E" />
            <rect x="9" y="22" width="3" height="3" fill="#B45309" />
            <rect x="12" y="19" width="3" height="3" fill="#92400E" />
            <rect x="15" y="16" width="3" height="3" fill="#B45309" />
            <rect x="18" y="13" width="3" height="3" fill="#78350F" />
            {/* Carved Timber Pick Head */}
            <rect x="11" y="4" width="12" height="5" fill="#171717" />
            <rect x="19" y="7" width="8" height="10" fill="#171717" />
            <rect x="23" y="15" width="5" height="6" fill="#171717" />
            <rect x="12" y="5" width="10" height="3" fill="#D97706" />
            <rect x="20" y="8" width="6" height="8" fill="#B45309" />
            <rect x="24" y="15" width="3" height="5" fill="#92400E" />
            {/* Wood Grain Highlight & Twine Lash */}
            <rect x="13" y="5" width="6" height="2" fill="#F59E0B" />
            <rect x="19" y="10" width="3" height="3" fill="#FEF3C7" />
          </svg>
        );

      case "pickaxe-stone":
        // Lv.2 Beliung Batu (Chunky Chiseled Slate-Stone Head)
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            {/* Sturdy Oak Handle */}
            <rect x="5" y="24" width="5" height="5" fill="#171717" />
            <rect x="8" y="21" width="5" height="5" fill="#171717" />
            <rect x="11" y="18" width="5" height="5" fill="#171717" />
            <rect x="14" y="15" width="5" height="5" fill="#171717" />
            <rect x="17" y="12" width="5" height="5" fill="#171717" />
            <rect x="6" y="25" width="3" height="3" fill="#78350F" />
            <rect x="9" y="22" width="3" height="3" fill="#B45309" />
            <rect x="12" y="19" width="3" height="3" fill="#78350F" />
            <rect x="15" y="16" width="3" height="3" fill="#B45309" />
            <rect x="18" y="13" width="3" height="3" fill="#78350F" />
            {/* Chunky Chiseled Stone Head */}
            <rect x="10" y="3" width="13" height="6" fill="#171717" />
            <rect x="18" y="7" width="9" height="10" fill="#171717" />
            <rect x="22" y="15" width="6" height="7" fill="#171717" />
            <rect x="11" y="4" width="11" height="4" fill="#64748B" />
            <rect x="19" y="8" width="7" height="8" fill="#475569" />
            <rect x="23" y="15" width="4" height="6" fill="#334155" />
            {/* Chiseled Stone Facets */}
            <rect x="12" y="4" width="7" height="2" fill="#94A3B8" />
            <rect x="20" y="9" width="2" height="3" fill="#94A3B8" />
            <rect x="24" y="16" width="2" height="2" fill="#64748B" />
          </svg>
        );

      case "pickaxe":
      case "pickaxe-iron":
        // Lv.3 Beliung Besi (Forged Polished Steel Head + Collar)
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            {/* Dark Grip Handle */}
            <rect x="5" y="24" width="5" height="5" fill="#171717" />
            <rect x="8" y="21" width="5" height="5" fill="#171717" />
            <rect x="11" y="18" width="5" height="5" fill="#171717" />
            <rect x="14" y="15" width="5" height="5" fill="#171717" />
            <rect x="17" y="12" width="5" height="5" fill="#171717" />
            <rect x="6" y="25" width="3" height="3" fill="#92400E" />
            <rect x="9" y="22" width="3" height="3" fill="#D97706" />
            <rect x="12" y="19" width="3" height="3" fill="#92400E" />
            <rect x="15" y="16" width="3" height="3" fill="#D97706" />
            <rect x="18" y="13" width="3" height="3" fill="#475569" />
            {/* Forged Steel Curved Head */}
            <rect x="11" y="4" width="12" height="5" fill="#171717" />
            <rect x="19" y="7" width="8" height="10" fill="#171717" />
            <rect x="23" y="15" width="5" height="6" fill="#171717" />
            <rect x="12" y="5" width="10" height="3" fill="#CBD5E1" />
            <rect x="20" y="8" width="6" height="8" fill="#94A3B8" />
            <rect x="24" y="15" width="3" height="5" fill="#64748B" />
            {/* Bright Steel Specular Edge */}
            <rect x="12" y="5" width="8" height="2" fill="#FFFFFF" />
            <rect x="20" y="9" width="2" height="5" fill="#F8FAFC" />
            <rect x="24" y="17" width="2" height="2" fill="#E2E8F0" />
          </svg>
        );

      case "pickaxe-gold":
        // Lv.4 Beliung Emas (Royal Gleaming Gold Head + Ruby Collar)
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            {/* Dark Mahogany Handle with Gold Pommel */}
            <rect x="5" y="24" width="5" height="5" fill="#171717" />
            <rect x="8" y="21" width="5" height="5" fill="#171717" />
            <rect x="11" y="18" width="5" height="5" fill="#171717" />
            <rect x="14" y="15" width="5" height="5" fill="#171717" />
            <rect x="17" y="12" width="5" height="5" fill="#171717" />
            <rect x="6" y="25" width="3" height="3" fill="#FACC15" />
            <rect x="9" y="22" width="3" height="3" fill="#7C2D12" />
            <rect x="12" y="19" width="3" height="3" fill="#9A3412" />
            <rect x="15" y="16" width="3" height="3" fill="#7C2D12" />
            <rect x="18" y="13" width="3" height="3" fill="#EF4444" />
            {/* Ornate Royal Gold Head */}
            <rect x="10" y="3" width="13" height="6" fill="#171717" />
            <rect x="19" y="7" width="8" height="10" fill="#171717" />
            <rect x="23" y="15" width="5" height="7" fill="#171717" />
            <rect x="11" y="4" width="11" height="4" fill="#FACC15" />
            <rect x="20" y="8" width="6" height="8" fill="#F59E0B" />
            <rect x="24" y="15" width="3" height="6" fill="#D97706" />
            {/* Radiant Gold Sheen */}
            <rect x="12" y="4" width="8" height="2" fill="#FEF08A" />
            <rect x="13" y="4" width="4" height="1" fill="#FFFFFF" />
            <rect x="21" y="9" width="2" height="5" fill="#FEF08A" />
            <rect x="19" y="13" width="1" height="1" fill="#FCA5A5" />
          </svg>
        );

      case "pickaxe-crystal":
        // Lv.5 Beliung Kristal (Legendary Cyan-Amethyst Crystal Pickaxe)
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            {/* Obsidian & Gold Handle */}
            <rect x="5" y="24" width="5" height="5" fill="#171717" />
            <rect x="8" y="21" width="5" height="5" fill="#171717" />
            <rect x="11" y="18" width="5" height="5" fill="#171717" />
            <rect x="14" y="15" width="5" height="5" fill="#171717" />
            <rect x="17" y="12" width="5" height="5" fill="#171717" />
            <rect x="6" y="25" width="3" height="3" fill="#38BDF8" />
            <rect x="9" y="22" width="3" height="3" fill="#334155" />
            <rect x="12" y="19" width="3" height="3" fill="#475569" />
            <rect x="15" y="16" width="3" height="3" fill="#334155" />
            <rect x="18" y="13" width="3" height="3" fill="#FACC15" />
            {/* Oversized Legendary Crystalline Head */}
            <rect x="9" y="3" width="14" height="6" fill="#171717" />
            <rect x="18" y="6" width="9" height="11" fill="#171717" />
            <rect x="22" y="15" width="6" height="8" fill="#171717" />
            {/* Outer Cyan Crystal Blades */}
            <rect x="10" y="4" width="12" height="4" fill="#38BDF8" />
            <rect x="20" y="8" width="6" height="8" fill="#0284C7" />
            <rect x="23" y="15" width="4" height="7" fill="#0369A1" />
            {/* Inner Amethyst Core */}
            <rect x="18" y="7" width="4" height="5" fill="#A855F7" />
            <rect x="19" y="8" width="2" height="3" fill="#E9D5FF" />
            {/* Razor-Sharp Luminous Crystal Highlights */}
            <rect x="11" y="4" width="8" height="2" fill="#BAE6FD" />
            <rect x="10" y="4" width="3" height="2" fill="#FFFFFF" />
            <rect x="22" y="9" width="2" height="5" fill="#7DD3FC" />
            <rect x="24" y="18" width="2" height="3" fill="#E0F2FE" />
          </svg>
        );

      case "mine-ladder":
        // Wooden Mine Shaft Ladder to Descend Deeper
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="7" y="3" width="4" height="26" fill="#171717" />
            <rect x="21" y="3" width="4" height="26" fill="#171717" />
            <rect x="8" y="4" width="2" height="24" fill="#92400E" />
            <rect x="22" y="4" width="2" height="24" fill="#92400E" />
            {[7, 13, 19, 25].map((y) => (
              <React.Fragment key={y}>
                <rect x="10" y={y - 1} width="12" height="4" fill="#171717" />
                <rect x="10" y={y} width="12" height="2" fill="#D97706" />
              </React.Fragment>
            ))}
          </svg>
        );

      default:
        // Default glowing pixel treat
        return (
          <svg viewBox="0 0 32 32" width={size} height={size} shapeRendering="crispEdges">
            <rect x="8" y="8" width="16" height="16" fill="#171717" />
            <rect x="10" y="10" width="12" height="12" fill="#F97316" />
            <rect x="12" y="12" width="4" height="4" fill="#FFFFFF" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {renderGraphic()}
    </div>
  );
};
