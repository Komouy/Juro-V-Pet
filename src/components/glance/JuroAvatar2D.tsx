import React from "react";
import { getSkinById } from "../../data/economyCatalog";

export interface JuroAvatar2DProps {
  skinId?: string;
  hatId?: string;
  isSleeping?: boolean;
  isHungry?: boolean;
  size?: number;
  className?: string;
}

export const JuroAvatar2D: React.FC<JuroAvatar2DProps> = ({
  skinId = "classic-orange",
  hatId = "hat-none",
  isSleeping = false,
  isHungry = false,
  size = 96,
  className = "",
}) => {
  const skin = getSkinById(skinId);
  const primaryColor = skin.colorA;
  const highlightColor = skin.colorB;
  const shadowColor = skin.edgeColor || "#171717";

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative select-none ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        width="100%"
        height="100%"
        shapeRendering="crispEdges"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Ground Drop Shadow */}
        <rect x="6" y="27" width="20" height="3" fill="#18181B" opacity="0.6" />
        <rect x="8" y="26" width="16" height="1" fill="#18181B" opacity="0.6" />

        {/* Charcoal Body Outline */}
        <rect x="8" y="5" width="16" height="2" fill="#18181B" />
        <rect x="6" y="7" width="20" height="2" fill="#18181B" />
        <rect x="4" y="9" width="24" height="17" fill="#18181B" />
        <rect x="6" y="26" width="20" height="2" fill="#18181B" />
        <rect x="8" y="27" width="16" height="1" fill="#18181B" />

        {/* Slime Jelly Base Body */}
        <rect x="6" y="9" width="20" height="17" fill={primaryColor} />
        <rect x="8" y="7" width="16" height="2" fill={primaryColor} />

        {/* Bottom Shading */}
        <rect x="6" y="24" width="20" height="2" fill={shadowColor} opacity="0.25" />

        {/* Top-Left Glossy Highlight */}
        <rect x="8" y="9" width="6" height="4" fill={highlightColor} />
        <rect x="8" y="13" width="2" height="3" fill={highlightColor} />
        <rect x="14" y="9" width="3" height="2" fill="#FFFFFF" opacity="0.8" />

        {/* Eyes: Sleeping (︶ ︶) vs Normal Pixel Eyes */}
        {isSleeping ? (
          <>
            {/* Left Sleeping Eye */}
            <rect x="9" y="17" width="4" height="1" fill="#18181B" />
            <rect x="8" y="16" width="1" height="1" fill="#18181B" />
            <rect x="13" y="16" width="1" height="1" fill="#18181B" />

            {/* Right Sleeping Eye */}
            <rect x="19" y="17" width="4" height="1" fill="#18181B" />
            <rect x="18" y="16" width="1" height="1" fill="#18181B" />
            <rect x="23" y="16" width="1" height="1" fill="#18181B" />
          </>
        ) : (
          <>
            {/* Left Pixel Eye */}
            <rect x="9" y="14" width="3" height="4" fill="#18181B" />
            <rect x="9" y="14" width="1" height="2" fill="#FFFFFF" />

            {/* Right Pixel Eye */}
            <rect x="20" y="14" width="3" height="4" fill="#18181B" />
            <rect x="20" y="14" width="1" height="2" fill="#FFFFFF" />
          </>
        )}

        {/* Rosy Blush Cheeks */}
        <rect x="7" y="19" width="3" height="2" fill="#F43F5E" opacity="0.75" />
        <rect x="22" y="19" width="3" height="2" fill="#F43F5E" opacity="0.75" />

        {/* Mouth */}
        {isSleeping ? (
          <rect x="15" y="19" width="2" height="1" fill="#18181B" />
        ) : isHungry ? (
          <>
            <rect x="15" y="18" width="2" height="2" fill="#18181B" />
            {/* Saliva drip */}
            <rect x="16" y="20" width="1" height="2" fill="#38BDF8" opacity="0.8" />
          </>
        ) : (
          <rect x="15" y="18" width="2" height="1" fill="#18181B" />
        )}

        {/* Optional 2D Pixel Hat Overlay */}
        {hatId === "hat-party" && (
          <g>
            <polygon points="16,0 12,6 20,6" fill="#F59E0B" stroke="#18181B" strokeWidth="0.8" />
            <rect x="15" y="0" width="2" height="1" fill="#EF4444" />
            <rect x="12" y="6" width="8" height="1" fill="#3B82F6" />
          </g>
        )}

        {hatId === "hat-straw" && (
          <g>
            {/* Straw Hat Crown */}
            <rect x="12" y="1" width="8" height="4" fill="#FDE047" stroke="#18181B" strokeWidth="0.8" />
            <rect x="12" y="4" width="8" height="1" fill="#DC2626" />
            {/* Straw Hat Brim */}
            <rect x="7" y="5" width="18" height="2" fill="#FACC15" stroke="#18181B" strokeWidth="0.8" />
          </g>
        )}

        {hatId === "hat-chef" && (
          <g>
            {/* Chef Hat Puff */}
            <circle cx="13" cy="2" r="3" fill="#FFFFFF" stroke="#18181B" strokeWidth="0.8" />
            <circle cx="19" cy="2" r="3" fill="#FFFFFF" stroke="#18181B" strokeWidth="0.8" />
            <circle cx="16" cy="1" r="3" fill="#FFFFFF" stroke="#18181B" strokeWidth="0.8" />
            {/* Chef Hat Band */}
            <rect x="11" y="4" width="10" height="3" fill="#F1F5F9" stroke="#18181B" strokeWidth="0.8" />
          </g>
        )}

        {hatId === "hat-propeller" && (
          <g>
            {/* Propeller Beanie Cap */}
            <path d="M 11 6 C 11 2, 21 2, 21 6 Z" fill="#3B82F6" stroke="#18181B" strokeWidth="0.8" />
            <rect x="15" y="0" width="2" height="3" fill="#E2E8F0" stroke="#18181B" strokeWidth="0.8" />
            {/* Propeller Blade */}
            <rect x="10" y="0" width="12" height="1" fill="#EF4444" stroke="#18181B" strokeWidth="0.8" />
          </g>
        )}

        {hatId === "hat-top" && (
          <g>
            {/* Top Hat Crown */}
            <rect x="12" y="0" width="8" height="6" fill="#18181B" />
            <rect x="12" y="4" width="8" height="1" fill="#E11D48" />
            {/* Top Hat Brim */}
            <rect x="9" y="5" width="14" height="2" fill="#18181B" />
          </g>
        )}
      </svg>
    </div>
  );
};
