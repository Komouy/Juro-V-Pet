import React from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { FoodItem, ToyItem } from "../../types/pet";
import type { JuroSkin } from "../../data/economyCatalog";
import { FoodProp3D, HeartPop3D } from "./FoodProp3D";
import { ToyProp3D, MusicalNote3D, PlayBubble3D } from "./ToyProp3D";
import { JuroHeadwear } from "./JuroHats";
import type { JuroMouthShapes } from "./juroMouthShapes";
import {
  SOAP_BUBBLES_DATA,
  WATER_DROPS_DATA,
  Z_OFFSETS,
  type JuroVisualRefs,
} from "./juroTypes";

const CRUMB_PALETTES: Record<string, [string, string, string, string]> = {
  "melon-cubes": ["#34D399", "#10B981", "#A7F3D0", "#ECFDF5"],
  "honey-drop": ["#FBBF24", "#FDE047", "#F59E0B", "#FEF3C7"],
  biscuit: ["#D97706", "#F59E0B", "#FBBF24", "#FDE68A"],
  "warm-milk": ["#FFFBEB", "#FFFFFF", "#FEF3C7", "#F8FAFC"],
  default: ["#F97316", "#FB923C", "#F97316", "#FED7AA"],
};

interface JuroCharacterMeshesProps {
  refs: JuroVisualRefs;
  outerBodyGeometry: THREE.BufferGeometry;
  skinPalette: JuroSkin;
  mouthShapes: JuroMouthShapes;
  activeHat: string;
  level: number;
  usePhysicalMaterial: boolean;
  shadowsEnabled: boolean;
  isCurrentlyEating: boolean;
  currentFoodBeingEaten: FoodItem | null;
  isPlayingToy: boolean;
  currentToyBeingPlayed: ToyItem | null;
  sleepZTexture: THREE.Texture | null;
  softShadowTexture: THREE.Texture | null;
  dizzyEyeTexture: THREE.Texture | null;
  dizzyMouthTexture: THREE.Texture | null;
  dizzyStarTexture: THREE.Texture | null;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

/**
 * Pure 3D scene graph for Juro's body, facial expressions, headwear,
 * bath particles, contact shadow, and world toys.
 */
export const JuroCharacterMeshes: React.FC<JuroCharacterMeshesProps> = ({
  refs,
  outerBodyGeometry,
  skinPalette,
  mouthShapes,
  activeHat,
  level,
  usePhysicalMaterial,
  shadowsEnabled,
  isCurrentlyEating,
  currentFoodBeingEaten,
  isPlayingToy,
  currentToyBeingPlayed,
  sleepZTexture,
  softShadowTexture,
  dizzyEyeTexture,
  dizzyMouthTexture,
  dizzyStarTexture,
  onPointerOver,
  onPointerOut,
  onPointerDown,
  onClick,
}) => {
  const crumbColors = CRUMB_PALETTES[currentFoodBeingEaten?.id ?? ""] ?? CRUMB_PALETTES.default;

  return (
    <>
      <group
        ref={refs.groupRef}
        position={[0, -0.1, 0]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {/* Invisible Comfortable Hitbox (Radius 1.85) */}
        <mesh position={[0, 0.48, 0]}>
          <sphereGeometry args={[1.85, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>

        {/* Main Sculpted Chubby Jelly Body */}
        <mesh
          ref={refs.bodyMeshRef}
          geometry={outerBodyGeometry}
          castShadow={shadowsEnabled}
          receiveShadow={shadowsEnabled}
        >
          {usePhysicalMaterial ? (
            <meshPhysicalMaterial
              vertexColors={true}
              roughness={0.14}
              metalness={0.02}
              clearcoat={1.0}
              clearcoatRoughness={0.06}
              sheen={0.55}
              sheenColor={skinPalette.centerColor}
              emissive={skinPalette.emissiveColor}
              emissiveIntensity={0.08}
            />
          ) : (
            <meshStandardMaterial
              vertexColors={true}
              roughness={0.14}
              metalness={0.08}
              emissive={skinPalette.emissiveColor}
              emissiveIntensity={0.1}
            />
          )}
        </mesh>

        {/* Top-Right Jelly Swirl Fold (hidden when wearing a hat) */}
        {(!activeHat || activeHat === "hat-none") && (
          <mesh
            position={[0.24, 0.72, 0.02]}
            rotation={[0.22, 0.35, -0.2]}
            scale={[1.0, 0.72, 1.0]}
          >
            <torusGeometry args={[0.3, 0.088, 12, 24, Math.PI * 0.85]} />
            <meshStandardMaterial
              color={skinPalette.limbColor}
              roughness={0.12}
              metalness={0.06}
              emissive={skinPalette.emissiveColor}
              emissiveIntensity={0.12}
            />
          </mesh>
        )}

        {/* Left & Right Jelly Droplet Arms */}
        <mesh position={[-1.16, -0.22, 0.04]} rotation={[0, 0, 0.35]} scale={[1.22, 0.85, 0.85]}>
          <sphereGeometry args={[0.21, 18, 16]} />
          <meshStandardMaterial
            color={skinPalette.limbColor}
            roughness={0.14}
            metalness={0.06}
            emissive={skinPalette.emissiveColor}
            emissiveIntensity={0.1}
          />
        </mesh>
        <mesh position={[1.16, -0.2, 0.02]} rotation={[0, 0, -0.35]} scale={[1.22, 0.85, 0.85]}>
          <sphereGeometry args={[0.21, 18, 16]} />
          <meshStandardMaterial
            color={skinPalette.limbColor}
            roughness={0.14}
            metalness={0.06}
            emissive={skinPalette.emissiveColor}
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* === AWAKE EYES === */}
        <group ref={refs.leftEyeRef} position={[-0.35, 0.07, 0.96]} rotation={[0, -0.24, -0.05]}>
          <mesh scale={[1.0, 1.24, 0.52]}>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#1E140E" roughness={0.08} metalness={0.05} />
          </mesh>
          <mesh ref={refs.leftCatchlightRef} position={[0.032, 0.042, 0.056]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh ref={refs.leftSubCatchlightRef} position={[-0.025, -0.042, 0.052]}>
            <sphereGeometry args={[0.014, 10, 10]} />
            <meshBasicMaterial color="#FFFFFF" opacity={0.7} transparent />
          </mesh>
        </group>

        <group ref={refs.rightEyeRef} position={[0.35, 0.07, 0.96]} rotation={[0, 0.24, 0.05]}>
          <mesh scale={[1.0, 1.24, 0.52]}>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#1E140E" roughness={0.08} metalness={0.05} />
          </mesh>
          <mesh ref={refs.rightCatchlightRef} position={[0.032, 0.042, 0.056]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh ref={refs.rightSubCatchlightRef} position={[-0.025, -0.042, 0.052]}>
            <sphereGeometry args={[0.014, 10, 10]} />
            <meshBasicMaterial color="#FFFFFF" opacity={0.7} transparent />
          </mesh>
        </group>

        {/* === DIZZY SPINNING SPIRAL EYES === */}
        <group ref={refs.dizzyEyesGroupRef} visible={false}>
          {dizzyEyeTexture && (
            <>
              <mesh ref={refs.dizzyLeftEyeRef} position={[-0.35, 0.07, 1.015]} rotation={[0, -0.24, 0]}>
                <planeGeometry args={[0.28, 0.28]} />
                <meshBasicMaterial map={dizzyEyeTexture} transparent depthWrite={false} />
              </mesh>
              <mesh ref={refs.dizzyRightEyeRef} position={[0.35, 0.07, 1.015]} rotation={[0, 0.24, 0]}>
                <planeGeometry args={[0.28, 0.28]} />
                <meshBasicMaterial map={dizzyEyeTexture} transparent depthWrite={false} />
              </mesh>
            </>
          )}
        </group>

        {/* === SLEEPING CLOSED EYELIDS === */}
        <group ref={refs.sleepEyesRef} visible={false}>
          <mesh position={[-0.34, 0.1, 0.985]} rotation={[0, -0.24, Math.PI + 0.06]}>
            <torusGeometry args={[0.095, 0.022, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#271A12" roughness={0.25} />
          </mesh>
          <mesh position={[0.34, 0.1, 0.985]} rotation={[0, 0.24, Math.PI - 0.06]}>
            <torusGeometry args={[0.095, 0.022, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#271A12" roughness={0.25} />
          </mesh>
        </group>

        {/* === HAPPY SMILING CRESCENT EYELIDS === */}
        <group ref={refs.petEyesRef} visible={false}>
          <mesh position={[-0.34, 0.02, 0.985]} rotation={[0, -0.24, -0.06]}>
            <torusGeometry args={[0.098, 0.024, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#271A12" roughness={0.25} />
          </mesh>
          <mesh position={[0.34, 0.02, 0.985]} rotation={[0, 0.24, 0.06]}>
            <torusGeometry args={[0.098, 0.024, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#271A12" roughness={0.25} />
          </mesh>
        </group>

        {/* === MOUTHS === */}
        <group ref={refs.mouthGroupRef} position={[0, -0.01, 1.035]}>
          <mesh>
            <shapeGeometry args={[mouthShapes.mouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.008, 0.006]}>
            <shapeGeometry args={[mouthShapes.tongueShape]} />
            <meshBasicMaterial color="#FB7185" side={THREE.DoubleSide} />
          </mesh>
        </group>

        <group ref={refs.hungryMouthGroupRef} position={[0, -0.035, 1.035]} visible={false}>
          <mesh>
            <shapeGeometry args={[mouthShapes.hungryMouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
        </group>

        <group ref={refs.poutMouthGroupRef} position={[0, -0.02, 1.035]} visible={false}>
          <mesh>
            <shapeGeometry args={[mouthShapes.poutMouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
        </group>

        <group ref={refs.flatMouthGroupRef} position={[0, -0.02, 1.035]} visible={false}>
          <mesh>
            <shapeGeometry args={[mouthShapes.flatMouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
        </group>

        <group ref={refs.sleepyMouthGroupRef} position={[0, -0.035, 1.035]} visible={false}>
          <mesh>
            <shapeGeometry args={[mouthShapes.sleepyMouthShape]} />
            <meshBasicMaterial color="#7C2D12" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {dizzyMouthTexture && (
          <mesh ref={refs.dizzyMouthRef} position={[0, -0.06, 1.045]} visible={false}>
            <planeGeometry args={[0.3, 0.15]} />
            <meshBasicMaterial map={dizzyMouthTexture} transparent depthWrite={false} />
          </mesh>
        )}

        {/* === ORBITING DIZZY STARS HALO === */}
        <group ref={refs.dizzyHaloRef} position={[0, 1.18, 0.05]} visible={false}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.66, 0.015, 8, 32]} />
            <meshBasicMaterial color="#FDE047" transparent opacity={0.45} depthWrite={false} />
          </mesh>
          {dizzyStarTexture &&
            [0, 1, 2].map((idx) => (
              <sprite
                key={idx}
                ref={(el) => {
                  refs.dizzyStarRefs.current[idx] = el;
                }}
              >
                <spriteMaterial map={dizzyStarTexture} transparent depthWrite={false} opacity={1} />
              </sprite>
            ))}
        </group>

        {/* === SLEEPING BREATHING MOUTH + BUBBLE === */}
        <group ref={refs.sleepMouthGroupRef} position={[0, -0.075, 1.035]} visible={false}>
          <mesh>
            <circleGeometry args={[0.046, 20]} />
            <meshBasicMaterial color="#7C2D12" />
          </mesh>
          <mesh position={[0, -0.012, 0.003]}>
            <circleGeometry args={[0.028, 16]} />
            <meshBasicMaterial color="#FB7185" />
          </mesh>
        </group>

        <mesh ref={refs.sleepBubbleRef} position={[0.06, -0.06, 1.12]} visible={false}>
          <sphereGeometry args={[0.088, 16, 14]} />
          <meshStandardMaterial
            color="#E0F2FE"
            roughness={0.08}
            metalness={0.1}
            transparent
            opacity={0.62}
            emissive="#BAE6FD"
            emissiveIntensity={0.2}
          />
          <mesh position={[-0.025, 0.03, 0.072]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </mesh>

        {/* === CHEEK BLUSH STRIPES === */}
        <group ref={refs.leftCheekGroupRef} position={[-0.45, -0.075, 0.945]} rotation={[0, -0.36, -0.16]}>
          <mesh position={[-0.038, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.046, 4, 8]} />
            <meshBasicMaterial ref={refs.leftCheekMatRef} color="#F97316" opacity={0.92} transparent />
          </mesh>
          <mesh>
            <capsuleGeometry args={[0.014, 0.058, 4, 8]} />
            <meshBasicMaterial color="#F97316" opacity={0.92} transparent />
          </mesh>
          <mesh position={[0.038, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.046, 4, 8]} />
            <meshBasicMaterial color="#F97316" opacity={0.92} transparent />
          </mesh>
        </group>

        <group ref={refs.rightCheekGroupRef} position={[0.45, -0.075, 0.945]} rotation={[0, 0.36, 0.16]}>
          <mesh position={[-0.038, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.046, 4, 8]} />
            <meshBasicMaterial ref={refs.rightCheekMatRef} color="#F97316" opacity={0.92} transparent />
          </mesh>
          <mesh>
            <capsuleGeometry args={[0.014, 0.058, 4, 8]} />
            <meshBasicMaterial color="#F97316" opacity={0.92} transparent />
          </mesh>
          <mesh position={[0.038, 0, 0]}>
            <capsuleGeometry args={[0.014, 0.046, 4, 8]} />
            <meshBasicMaterial color="#F97316" opacity={0.92} transparent />
          </mesh>
        </group>

        {/* Detailed Sculpted 3D Food Prop */}
        {isCurrentlyEating && (
          <group ref={refs.foodPropRef} position={[0, -0.14, 1.48]}>
            <FoodProp3D foodId={currentFoodBeingEaten?.id} />
            <group ref={refs.crumbsGroupRef} visible={false}>
              <mesh position={[0.16, 0.09, 0.05]}>
                <sphereGeometry args={[0.024, 8, 8]} />
                <meshBasicMaterial color={crumbColors[0]} />
              </mesh>
              <mesh position={[-0.14, 0.1, 0.06]}>
                <sphereGeometry args={[0.022, 8, 8]} />
                <meshBasicMaterial color={crumbColors[1]} />
              </mesh>
              <mesh position={[0.1, -0.09, 0.07]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshBasicMaterial color={crumbColors[2]} />
              </mesh>
              <mesh position={[-0.09, -0.08, 0.06]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshBasicMaterial color={crumbColors[3]} />
              </mesh>
            </group>
          </group>
        )}

        {/* Emotion & Status Overlays */}
        <group ref={refs.salivaDripRef} position={[-0.08, -0.15, 1.05]} visible={false}>
          <mesh scale={[0.024, 0.048, 0.024]}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial
              color="#BAE6FD"
              roughness={0.08}
              metalness={0.1}
              transparent
              opacity={0.85}
              emissive="#E0F2FE"
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position={[0, 0.032, 0]} scale={[0.014, 0.028, 0.014]}>
            <coneGeometry args={[1, 1.5, 8]} />
            <meshStandardMaterial color="#BAE6FD" roughness={0.08} metalness={0.1} transparent opacity={0.85} />
          </mesh>
        </group>

        <group ref={refs.sweatDropRef} position={[0.42, 0.48, 0.82]} rotation={[0, 0, -0.28]} visible={false}>
          <mesh scale={[0.038, 0.062, 0.03]}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial
              color="#38BDF8"
              roughness={0.08}
              metalness={0.12}
              transparent
              opacity={0.88}
              emissive="#7DD3FC"
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh position={[0, 0.048, 0]} rotation={[0, 0, Math.PI]} scale={[0.028, 0.045, 0.024]}>
            <coneGeometry args={[1, 1.6, 8]} />
            <meshStandardMaterial color="#38BDF8" roughness={0.08} metalness={0.12} transparent opacity={0.88} />
          </mesh>
        </group>

        <group ref={refs.angerSteamGroupRef} visible={false}>
          {([-0.45, 0.45] as const).map((xPos, idx) => (
            <group key={idx} position={[xPos, 0.95, 0.15]}>
              <mesh>
                <sphereGeometry args={[0.068, 12, 12]} />
                <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
              </mesh>
              <mesh position={[idx === 0 ? -0.035 : 0.035, 0.052, 0]}>
                <sphereGeometry args={[0.048, 10, 10]} />
                <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
              </mesh>
              <mesh position={[idx === 0 ? 0.032 : -0.032, 0.045, 0]}>
                <sphereGeometry args={[0.04, 10, 10]} />
                <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
              </mesh>
            </group>
          ))}
        </group>

        <group ref={refs.sighCloudRef} position={[0.12, -0.02, 1.05]} visible={false}>
          <mesh>
            <sphereGeometry args={[0.052, 12, 12]} />
            <meshBasicMaterial color="#F3F4F6" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0.038, 0.02, 0]}>
            <sphereGeometry args={[0.036, 10, 10]} />
            <meshBasicMaterial color="#F3F4F6" transparent opacity={0.65} />
          </mesh>
          <mesh position={[-0.032, 0.015, 0]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshBasicMaterial color="#F3F4F6" transparent opacity={0.6} />
          </mesh>
        </group>

        <group ref={refs.mudGroupRef} visible={false}>
          <mesh position={[0.18, 0.74, 0.42]} rotation={[0.4, 0.2, -0.3]} scale={[1.2, 0.35, 1.0]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#451A03" roughness={0.85} />
          </mesh>
          <mesh position={[-0.72, 0.16, 0.65]} rotation={[-0.2, -0.5, 0.3]} scale={[0.85, 1.25, 0.4]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color="#3E1A04" roughness={0.85} />
          </mesh>
          <mesh position={[0.78, -0.15, 0.58]} rotation={[0.2, 0.6, -0.2]} scale={[1.1, 0.85, 0.45]}>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial color="#451A03" roughness={0.85} />
          </mesh>
          <mesh position={[-0.15, -0.42, 0.88]} rotation={[0.5, 0, 0]} scale={[1.15, 0.4, 0.8]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color="#3A1700" roughness={0.9} />
          </mesh>
          <mesh position={[0.22, 0.38, -0.78]} rotation={[-0.4, 0.3, 0]} scale={[1.0, 0.5, 0.9]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color="#451A03" roughness={0.85} />
          </mesh>
        </group>

        <group ref={refs.dustGroupRef} visible={false}>
          {[0, 1, 2].map((idx) => (
            <mesh
              key={idx}
              ref={(el) => {
                refs.dustSpeckRefs.current[idx] = el;
              }}
            >
              <sphereGeometry args={[0.016, 6, 6]} />
              <meshBasicMaterial color="#1C1917" />
            </mesh>
          ))}
        </group>

        <group ref={refs.heartBubbleRef} position={[0, 1.0, 0.35]} visible={false}>
          <HeartPop3D />
        </group>

        <group ref={refs.zzzGroupRef} visible={false}>
          {sleepZTexture &&
            Z_OFFSETS.map((_, idx) => (
              <sprite
                key={idx}
                ref={(el) => {
                  refs.zSpriteRefs.current[idx] = el;
                }}
              >
                <spriteMaterial map={sleepZTexture} transparent depthWrite={false} opacity={0.9} />
              </sprite>
            ))}
        </group>

        <JuroHeadwear
          activeHat={activeHat}
          level={level}
          leafUmbrellaRef={refs.leafUmbrellaRef}
          crownRef={refs.crownRef}
          propellerRef={refs.propellerRef}
        />

        <instancedMesh
          ref={refs.soapFoamInstRef}
          args={[undefined, undefined, SOAP_BUBBLES_DATA.length]}
          visible={false}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial
            color="#F0F9FF"
            roughness={0.12}
            metalness={0.05}
            transparent
            opacity={0.88}
            emissive="#E0F2FE"
            emissiveIntensity={0.22}
          />
        </instancedMesh>

        <instancedMesh
          ref={refs.waterDropsInstRef}
          args={[undefined, undefined, WATER_DROPS_DATA.length]}
          visible={false}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#38BDF8"
            roughness={0.08}
            metalness={0.1}
            transparent
            opacity={0.82}
            emissive="#7DD3FC"
            emissiveIntensity={0.3}
          />
        </instancedMesh>
      </group>

      {/* Soft Contact Shadow */}
      <mesh ref={refs.shadowRef} position={[0, -0.912, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={softShadowTexture ?? undefined}
          color={softShadowTexture ? "#FFFFFF" : "#1C1410"}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>

      {/* 3D World Toy Prop */}
      {isPlayingToy && currentToyBeingPlayed && (
        <group ref={refs.worldToyRef} visible={false}>
          <group ref={refs.worldToyMeshRef}>
            <ToyProp3D toyId={currentToyBeingPlayed.id} />
          </group>
          {currentToyBeingPlayed.id === "music-box" && (
            <>
              <MusicalNote3D offset={0} />
              <MusicalNote3D offset={0.33} />
              <MusicalNote3D offset={0.66} />
            </>
          )}
          {currentToyBeingPlayed.id === "bubble-blower" && (
            <>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
                <PlayBubble3D key={idx} index={idx} />
              ))}
            </>
          )}
        </group>
      )}

      {isPlayingToy && currentToyBeingPlayed && (
        <mesh ref={refs.worldToyShadowRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshBasicMaterial
            map={softShadowTexture ?? undefined}
            color={softShadowTexture ? "#FFFFFF" : "#1C1410"}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
};
