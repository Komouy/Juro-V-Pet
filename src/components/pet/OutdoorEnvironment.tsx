import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { TimeThemeConfig } from "../../utils/timeOfDay";
import { BASE_GROUND_Y, MAP_PLATFORMS } from "../../engine/world/mapTerrain";
import { PetSofaBed } from "./environment/PetSofaBed";
import { ParkBench } from "./environment/ParkBench";
import { ShopBuildingLandmark } from "./environment/ShopBuildingLandmark";
import { MineCaveLandmark } from "./environment/MineCaveLandmark";
import { PixelRain } from "./environment/PixelRain";
import { NightFireflies } from "./environment/NightFireflies";
import type { WeatherMode } from "../../types/ui";
import {
  createSignTexture,
  createOrganicPondShape,
  createStreamShape,
  generateStarsData,
  generateButterfliesData,
  generateRoundTreesData,
  generatePineTreesData,
  generateBushesData,
  generateFenceSegmentsData,
  generateGrassBladesData,
  generateOuterGrassBladesData,
  generateReedsData,
  generateRocksData,
  generateSteppingStonesData,
  generateMushroomsData,
  generateWaterShimmersData,
} from "./environment/landscapeData";

interface OutdoorEnvironmentProps {
  theme: TimeThemeConfig;
  weather?: WeatherMode;
  onWalkPointSelect?: (x: number, z: number) => void;
  onOpenShop?: () => void;
  onOpenMine?: () => void;
  onBedClick?: () => void;
  onBenchClick?: (screenPos?: { x: number; y: number }) => void;
  isSittingOnBench?: boolean;
}

// Reusable scratch objects at module scope (zero GC allocations per frame, 0 lint warnings)
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export const OutdoorEnvironment: React.FC<OutdoorEnvironmentProps> = React.memo(
  ({
    theme,
    weather = "clear",
    onWalkPointSelect,
    onOpenShop,
    onOpenMine,
    onBedClick,
    onBenchClick,
    isSittingOnBench = false,
  }) => {
    const [hoveredLandmark, setHoveredLandmark] = useState<"none" | "shop" | "mine" | "bed" | "bench">("none");

    // Signboard textures for interactive 3D Shop ("TOKO") & Mine Cave ("TAMBANG")
    const shopSignTex = useMemo(
      () => createSignTexture("TOKO", "#FFF7ED", "#171717", "#EA580C"),
      []
    );
    const mineSignTex = useMemo(
      () => createSignTexture("TAMBANG", "#1C1917", "#F59E0B", "#FEF08A"),
      []
    );

    useEffect(() => {
      return () => {
        shopSignTex?.dispose();
        mineSignTex?.dispose();
      };
    }, [shopSignTex, mineSignTex]);

    useEffect(() => {
      if (typeof document === "undefined") return;
      document.body.style.cursor = hoveredLandmark !== "none" ? "pointer" : "auto";
      return () => {
        document.body.style.cursor = "auto";
      };
    }, [hoveredLandmark]);

    // InstancedMesh refs for mobile-optimized batched rendering
    const starsInstRef = useRef<THREE.InstancedMesh>(null);
    const grassInstRef = useRef<THREE.InstancedMesh>(null);
    const outerGrassInstRef = useRef<THREE.InstancedMesh>(null);
    const reedsInstRef = useRef<THREE.InstancedMesh>(null);
    const rocksInstRef = useRef<THREE.InstancedMesh>(null);
    const bushesInstRef = useRef<THREE.InstancedMesh>(null);
    const steppingStonesInstRef = useRef<THREE.InstancedMesh>(null);
    const mushroomStemsInstRef = useRef<THREE.InstancedMesh>(null);
    const mushroomCapsInstRef = useRef<THREE.InstancedMesh>(null);
    const roundTreeTrunksInstRef = useRef<THREE.InstancedMesh>(null);
    const roundTreeCrownsInstRef = useRef<THREE.InstancedMesh>(null);
    const pineTrunksInstRef = useRef<THREE.InstancedMesh>(null);
    const pineLowerInstRef = useRef<THREE.InstancedMesh>(null);
    const pineUpperInstRef = useRef<THREE.InstancedMesh>(null);
    const fencePostsInstRef = useRef<THREE.InstancedMesh>(null);
    const fenceRailsInstRef = useRef<THREE.InstancedMesh>(null);
    const shimmerInstRef = useRef<THREE.InstancedMesh>(null);

    // Small dynamic groups
    const cloudsGroupRef = useRef<THREE.Group>(null);
    const ripple1Ref = useRef<THREE.Mesh>(null);
    const ripple2Ref = useRef<THREE.Mesh>(null);
    const butterfliesGroupRef = useRef<THREE.Group>(null);

    // Track pointer down coords to distinguish a clean tap-to-walk from an OrbitControls camera drag
    const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const handleGroundPointerDown = (e: ThreeEvent<PointerEvent>) => {
      pointerDownPos.current.x = e.clientX;
      pointerDownPos.current.y = e.clientY;
    };

    const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
      if (!onWalkPointSelect) return;
      const dist = Math.hypot(
        e.clientX - pointerDownPos.current.x,
        e.clientY - pointerDownPos.current.y
      );
      // Only command Juro to walk on a deliberate tap/click (not after dragging camera)
      if (dist < 6) {
        e.stopPropagation();
        onWalkPointSelect(e.point.x, e.point.z);
      }
    };

    const handleLandmarkPointerDown = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      pointerDownPos.current.x = e.clientX;
      pointerDownPos.current.y = e.clientY;
    };

    const handleShopClick = (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const dist = Math.hypot(
        e.clientX - pointerDownPos.current.x,
        e.clientY - pointerDownPos.current.y
      );
      if (dist < 6) {
        onOpenShop?.();
      }
    };

    const handleMineClick = (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const dist = Math.hypot(
        e.clientX - pointerDownPos.current.x,
        e.clientY - pointerDownPos.current.y
      );
      if (dist < 6) {
        onOpenMine?.();
      }
    };

    // Pond & Stream shapes
    const pondBankShape = useMemo(() => createOrganicPondShape(1.18, 0.86), []);
    const pondWaterShape = useMemo(() => createOrganicPondShape(1.06, 0.75), []);
    const streamBankShape = useMemo(() => createStreamShape(0.11), []);
    const streamWaterShape = useMemo(() => createStreamShape(0), []);

    // 1. Stars (70 instances -> 1 draw call!)
    const stars = useMemo(() => generateStarsData(), []);

    // 2. Daytime Butterflies (4 fluttering companions over valley)
    const butterflies = useMemo(() => generateButterfliesData(), []);

    // 3. Dense Miniature Terrarium Forest: Core Trees + Procedural Small Trees Filling All Empty Map Areas!
    const roundTrees = useMemo(() => generateRoundTreesData(), []);
    const pineTrees = useMemo(() => generatePineTreesData(), []);

    // 4. Cozy Rounded Shrubs / Mini Bushes filling empty meadow edges (1 draw call!)
    const bushes = useMemo(() => generateBushesData(), []);

    // 5. Rustic Wooden Garden Fence along left pasture & cottage garden (2 draw calls!)
    const fenceSegments = useMemo(() => generateFenceSegmentsData(), []);

    // 6. Lush Grass Blades across the whole valley & knolls (120 blades -> 1 draw call!)
    const grassBlades = useMemo(() => generateGrassBladesData(), []);

    // 6b. Dense Static Small Outer Grass Tufts Filling All Empty Surroundings (ZERO per-frame CPU cost!)
    const outerGrassBlades = useMemo(() => generateOuterGrassBladesData(), []);

    // 7. Tall Swaying Reeds along Pond & Stream Banks (18 blades -> 1 draw call!)
    const reeds = useMemo(() => generateReedsData(), []);

    // 8. Rocks, Scenic Boulders & River Pebbles (20 instances -> 1 draw call!)
    const rocks = useMemo(() => generateRocksData(), []);

    // 9. Cozy Stepping Stones Path connecting center, west hill, east hill & wooden bridge (10 stones -> 1 draw call!)
    const steppingStones = useMemo(() => generateSteppingStonesData(), []);

    // 10. Cute Forest Toadstool Mushrooms tucked near rocks, stumps & knolls (10 instances -> 2 draw calls!)
    const mushrooms = useMemo(() => generateMushroomsData(), []);

    // 11. Water shimmers (8 glints -> 1 draw call!)
    const waterShimmers = useMemo(() => generateWaterShimmersData(), []);

    // Populate static InstancedMesh transforms & per-instance colors on mount/theme change
    useEffect(() => {
      // Round trees
      if (roundTreeTrunksInstRef.current && roundTreeCrownsInstRef.current) {
        roundTrees.forEach((tr, i) => {
          _dummy.position.set(tr.pos[0], tr.pos[1] + 0.24 * tr.scale, tr.pos[2]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(tr.scale, tr.scale, tr.scale);
          _dummy.updateMatrix();
          roundTreeTrunksInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(tr.pos[0], tr.pos[1] + 0.68 * tr.scale, tr.pos[2]);
          _dummy.scale.set(tr.scale * 1.08, tr.scale * 0.96, tr.scale * 1.08);
          _dummy.updateMatrix();
          roundTreeCrownsInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        roundTreeTrunksInstRef.current.instanceMatrix.needsUpdate = true;
        roundTreeCrownsInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Pine trees
      if (pineTrunksInstRef.current && pineLowerInstRef.current && pineUpperInstRef.current) {
        pineTrees.forEach((tr, i) => {
          _dummy.position.set(tr.pos[0], tr.pos[1] + 0.22 * tr.scale, tr.pos[2]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(tr.scale, tr.scale, tr.scale);
          _dummy.updateMatrix();
          pineTrunksInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(tr.pos[0], tr.pos[1] + 0.62 * tr.scale, tr.pos[2]);
          _dummy.updateMatrix();
          pineLowerInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(tr.pos[0], tr.pos[1] + 1.02 * tr.scale, tr.pos[2]);
          _dummy.updateMatrix();
          pineUpperInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        pineTrunksInstRef.current.instanceMatrix.needsUpdate = true;
        pineLowerInstRef.current.instanceMatrix.needsUpdate = true;
        pineUpperInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Bushes
      if (bushesInstRef.current) {
        bushes.forEach((b, i) => {
          _dummy.position.set(b.pos[0], b.pos[1], b.pos[2]);
          _dummy.rotation.set(0, i * 0.7, 0);
          _dummy.scale.set(b.scale[0], b.scale[1], b.scale[2]);
          _dummy.updateMatrix();
          bushesInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        bushesInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Rustic Fence
      if (fencePostsInstRef.current && fenceRailsInstRef.current) {
        fenceSegments.forEach((seg, i) => {
          _dummy.position.set(seg.x, BASE_GROUND_Y + 0.17, seg.z);
          _dummy.rotation.set(0, seg.rotY, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          fencePostsInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(seg.x, BASE_GROUND_Y + 0.24, seg.z);
          _dummy.rotation.set(0, seg.rotY, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          fenceRailsInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        fencePostsInstRef.current.instanceMatrix.needsUpdate = true;
        fenceRailsInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Rocks & pebbles
      if (rocksInstRef.current) {
        const shades = theme.isNight
          ? ["#475569", "#334155", "#64748B"]
          : ["#A8A29E", "#D6D3D1", "#78716C"];
        rocks.forEach((rk, i) => {
          _dummy.position.set(rk.pos[0], rk.pos[1], rk.pos[2]);
          _dummy.rotation.set(0, rk.rotY, 0);
          _dummy.scale.set(rk.scale[0], rk.scale[1], rk.scale[2]);
          _dummy.updateMatrix();
          rocksInstRef.current!.setMatrixAt(i, _dummy.matrix);
          _color.set(shades[rk.shade]);
          rocksInstRef.current!.setColorAt(i, _color);
        });
        rocksInstRef.current.instanceMatrix.needsUpdate = true;
        if (rocksInstRef.current.instanceColor) {
          rocksInstRef.current.instanceColor.needsUpdate = true;
        }
      }

      // Stepping stones
      if (steppingStonesInstRef.current) {
        steppingStones.forEach((st, i) => {
          _dummy.position.set(st.pos[0], st.pos[1], st.pos[2]);
          _dummy.rotation.set(0, st.rotY, 0);
          _dummy.scale.set(st.scale[0], st.scale[1], st.scale[2]);
          _dummy.updateMatrix();
          steppingStonesInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        steppingStonesInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Static outer small grass blades (populated once -> 0ms CPU per frame!)
      if (outerGrassInstRef.current) {
        outerGrassBlades.forEach((g, i) => {
          _dummy.position.set(g.x, g.y + g.h * 0.48, g.z);
          _dummy.rotation.set(g.tiltX, g.rotY, g.tiltZ);
          _dummy.scale.set(1, g.h / 0.18, 1);
          _dummy.updateMatrix();
          outerGrassInstRef.current!.setMatrixAt(i, _dummy.matrix);
        });
        outerGrassInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Mushrooms
      if (mushroomStemsInstRef.current && mushroomCapsInstRef.current) {
        mushrooms.forEach((m, i) => {
          _dummy.position.set(m.pos[0], m.pos[1] + 0.045 * m.scale, m.pos[2]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(m.scale, m.scale, m.scale);
          _dummy.updateMatrix();
          mushroomStemsInstRef.current!.setMatrixAt(i, _dummy.matrix);

          _dummy.position.set(m.pos[0], m.pos[1] + 0.09 * m.scale, m.pos[2]);
          _dummy.scale.set(m.scale * 1.15, m.scale * 0.72, m.scale * 1.15);
          _dummy.updateMatrix();
          mushroomCapsInstRef.current!.setMatrixAt(i, _dummy.matrix);
          _color.set(m.capColor);
          mushroomCapsInstRef.current!.setColorAt(i, _color);
        });
        mushroomStemsInstRef.current.instanceMatrix.needsUpdate = true;
        mushroomCapsInstRef.current.instanceMatrix.needsUpdate = true;
        if (mushroomCapsInstRef.current.instanceColor) {
          mushroomCapsInstRef.current.instanceColor.needsUpdate = true;
        }
      }
    }, [theme.isNight, roundTrees, pineTrees, bushes, fenceSegments, rocks, steppingStones, outerGrassBlades, mushrooms]);

    // Lightweight per-frame animations (using scratch _dummy — zero allocations!)
    useFrame((state) => {
      const t = state.clock.getElapsedTime();

      if (cloudsGroupRef.current) {
        cloudsGroupRef.current.position.x = Math.sin(t * 0.07) * 0.65;
      }

      // Twinkling stars at night
      if (starsInstRef.current && theme.isNight) {
        for (let i = 0; i < stars.length; i++) {
          const st = stars[i];
          const s = st.size * (0.65 + Math.sin(t * 3.0 + st.phase) * 0.35);
          _dummy.position.set(st.pos[0], st.pos[1], st.pos[2]);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(s, s, s);
          _dummy.updateMatrix();
          starsInstRef.current.setMatrixAt(i, _dummy.matrix);
        }
        starsInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Daytime butterflies
      if (butterfliesGroupRef.current && !theme.isNight) {
        butterfliesGroupRef.current.children.forEach((child, i) => {
          const b = butterflies[i];
          if (!b) return;
          const angle = t * b.speed + b.phase;
          child.position.set(
            b.base[0] + Math.cos(angle) * b.radius,
            b.base[1] + Math.sin(angle * 2.3) * 0.14,
            b.base[2] + Math.sin(angle) * (b.radius * 0.7)
          );
          child.rotation.y = -angle;
          const wingFlap = Math.abs(Math.sin(t * 14 + b.phase)) * 0.7 + 0.3;
          child.scale.set(wingFlap, 1, 1);
        });
      }

      // Swaying grass blades across valley & knolls (1 draw call!)
      if (grassInstRef.current) {
        for (let i = 0; i < grassBlades.length; i++) {
          const g = grassBlades[i];
          const sway = Math.sin(t * 1.9 + g.phase) * 0.075;
          _dummy.position.set(g.x, g.y + g.h * 0.48, g.z);
          _dummy.rotation.set(g.tiltX, g.rotY, g.tiltZ + sway);
          _dummy.scale.set(1, g.h / 0.18, 1);
          _dummy.updateMatrix();
          grassInstRef.current.setMatrixAt(i, _dummy.matrix);
        }
        grassInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Swaying tall pond reeds
      if (reedsInstRef.current) {
        for (let i = 0; i < reeds.length; i++) {
          const r = reeds[i];
          const sway = Math.sin(t * 1.5 + r.phase) * 0.09;
          _dummy.position.set(r.x, BASE_GROUND_Y + r.h * 0.48, r.z);
          _dummy.rotation.set(0.05, 0, r.tilt + sway);
          _dummy.scale.set(1, r.h / 0.4, 1);
          _dummy.updateMatrix();
          reedsInstRef.current.setMatrixAt(i, _dummy.matrix);
        }
        reedsInstRef.current.instanceMatrix.needsUpdate = true;
      }

      // Pond ripples
      if (ripple1Ref.current) {
        const p1 = (t * 0.32) % 1;
        const s1 = 0.25 + p1 * 0.95;
        ripple1Ref.current.scale.set(s1, s1, 1);
        (ripple1Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - p1) * 0.42;
      }
      if (ripple2Ref.current) {
        const p2 = (t * 0.32 + 0.5) % 1;
        const s2 = 0.25 + p2 * 0.85;
        ripple2Ref.current.scale.set(s2, s2, 1);
        (ripple2Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - p2) * 0.36;
      }

      // Water shimmer glints
      if (shimmerInstRef.current) {
        for (let i = 0; i < waterShimmers.length; i++) {
          const sh = waterShimmers[i];
          const drift = Math.sin(t * 1.3 + sh.phase) * 0.09;
          const pulse = 0.65 + Math.sin(t * 2.5 + sh.phase) * 0.35;
          _dummy.position.set(sh.pos[0] + drift, sh.pos[1], sh.pos[2]);
          _dummy.rotation.set(-Math.PI / 2, 0, -0.25);
          _dummy.scale.set(sh.width * pulse, 0.045, 1);
          _dummy.updateMatrix();
          shimmerInstRef.current.setMatrixAt(i, _dummy.matrix);
        }
        shimmerInstRef.current.instanceMatrix.needsUpdate = true;
      }
    });

    const isLanternLit = theme.isNight || theme.phase === "sunset";
    const woodColor = theme.isNight ? "#451A03" : "#92400E";
    const woodDarkColor = theme.isNight ? "#2D1002" : "#78350F";
    const cliffSoilColor = theme.isNight ? "#3B2618" : "#8D6E63";
    const cloudColor = weather === "rain" ? (theme.isNight ? "#1E293B" : "#94A3B8") : theme.cloudColor;
    const cloudOpacity = weather === "rain" ? Math.min(0.98, theme.cloudOpacity + 0.12) : theme.cloudOpacity;

    return (
      <group>
        {/* 1. Dynamic Sun or Crescent Moon */}
        <group position={theme.celestialPos}>
          <mesh>
            <sphereGeometry args={[theme.isNight ? 0.46 : 0.6, 20, 20]} />
            <meshBasicMaterial color={theme.celestialColor} />
          </mesh>
          <mesh>
            <sphereGeometry args={[theme.isNight ? 0.72 : 0.92, 16, 16]} />
            <meshBasicMaterial
              color={theme.celestialColor}
              transparent
              opacity={theme.isNight ? 0.22 : 0.3}
            />
          </mesh>
          {theme.isNight && (
            <mesh position={[0.18, 0.08, 0.14]}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshBasicMaterial color="#0D1736" />
            </mesh>
          )}
        </group>

        {/* 2. Twinkling Night Sky Stars */}
        {theme.isNight && (
          <instancedMesh ref={starsInstRef} args={[undefined, undefined, stars.length]} frustumCulled={false}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial color="#FFFFFF" />
          </instancedMesh>
        )}

        {/* Luminous Meadow Fireflies (Kunang-Kunang Berpendar saat Malam) */}
        <NightFireflies isNight={theme.isNight} />

        {/* Dynamic Vertical Pixel Rain & River Water Ripples */}
        <PixelRain isRaining={weather === "rain"} />

        {/* 3. Layered Distant Mountains & Rolling Green Horizon Hills */}
        <mesh position={[-3.8, -1.4, -10.5]} scale={[3.8, 2.4, 0.7]}>
          <coneGeometry args={[1.6, 2.2, 5]} />
          <meshBasicMaterial color={theme.hillFarColor} transparent opacity={0.55} />
        </mesh>
        <mesh position={[3.8, -1.35, -10.8]} scale={[4.2, 2.6, 0.7]}>
          <coneGeometry args={[1.6, 2.2, 5]} />
          <meshBasicMaterial color={theme.hillFarColor} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.2, -1.85, -8.5]} scale={[10.2, 1.85, 0.8]}>
          <sphereGeometry args={[1.6, 28, 12]} />
          <meshBasicMaterial color={theme.hillFarColor} />
        </mesh>
        <mesh position={[-5.6, -1.85, -6.8]} scale={[5.2, 1.4, 0.8]}>
          <sphereGeometry args={[1.5, 24, 12]} />
          <meshBasicMaterial color={theme.hillNearColor} />
        </mesh>
        <mesh position={[5.6, -1.85, -6.6]} scale={[5.4, 1.38, 0.8]}>
          <sphereGeometry args={[1.5, 24, 12]} />
          <meshBasicMaterial color={theme.hillNearColor} />
        </mesh>

        {/* 4. Instanced Forest Belt: 14 Round Trees + 12 Pine Trees + 16 Shrubs */}
        <instancedMesh ref={roundTreeTrunksInstRef} args={[undefined, undefined, roundTrees.length]}>
          <cylinderGeometry args={[0.065, 0.095, 0.48, 7]} />
          <meshLambertMaterial color={woodDarkColor} />
        </instancedMesh>
        <instancedMesh ref={roundTreeCrownsInstRef} args={[undefined, undefined, roundTrees.length]}>
          <sphereGeometry args={[0.4, 12, 10]} />
          <meshLambertMaterial color={theme.hillNearColor} />
        </instancedMesh>

        <instancedMesh ref={pineTrunksInstRef} args={[undefined, undefined, pineTrees.length]}>
          <cylinderGeometry args={[0.055, 0.085, 0.44, 6]} />
          <meshLambertMaterial color={woodDarkColor} />
        </instancedMesh>
        <instancedMesh ref={pineLowerInstRef} args={[undefined, undefined, pineTrees.length]}>
          <coneGeometry args={[0.44, 0.68, 7]} />
          <meshLambertMaterial color={theme.groundRimColor} />
        </instancedMesh>
        <instancedMesh ref={pineUpperInstRef} args={[undefined, undefined, pineTrees.length]}>
          <coneGeometry args={[0.32, 0.58, 7]} />
          <meshLambertMaterial color={theme.hillNearColor} />
        </instancedMesh>

        <instancedMesh ref={bushesInstRef} args={[undefined, undefined, bushes.length]}>
          <sphereGeometry args={[1, 9, 8]} />
          <meshLambertMaterial color={theme.grassTuftColor} />
        </instancedMesh>

        {/* 5. Rustic Wooden Garden Fences (2 Draw Calls) */}
        <instancedMesh ref={fencePostsInstRef} args={[undefined, undefined, fenceSegments.length]}>
          <boxGeometry args={[0.07, 0.34, 0.07]} />
          <meshLambertMaterial color={woodDarkColor} />
        </instancedMesh>
        <instancedMesh ref={fenceRailsInstRef} args={[undefined, undefined, fenceSegments.length]}>
          <boxGeometry args={[0.76, 0.05, 0.04]} />
          <meshLambertMaterial color={woodColor} />
        </instancedMesh>

        {/* 6. Drifting Fluffy Clouds */}
        <group ref={cloudsGroupRef} position={[0, 1.9, -6.2]}>
          <group position={[-3.8, 0.35, 0]}>
            <mesh><sphereGeometry args={[0.54, 12, 10]} /><meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} /></mesh>
            <mesh position={[0.44, -0.08, 0]}><sphereGeometry args={[0.4, 10, 8]} /><meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} /></mesh>
            <mesh position={[-0.44, -0.1, 0]}><sphereGeometry args={[0.36, 10, 8]} /><meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} /></mesh>
          </group>
          <group position={[3.8, 0.68, -0.4]}>
            <mesh><sphereGeometry args={[0.58, 12, 10]} /><meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} /></mesh>
            <mesh position={[0.5, -0.1, 0]}><sphereGeometry args={[0.44, 10, 8]} /><meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} /></mesh>
            <mesh position={[-0.48, -0.1, 0]}><sphereGeometry args={[0.4, 10, 8]} /><meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity} /></mesh>
          </group>
          <group position={[0.15, 1.15, -1.2]} scale={0.76}>
            <mesh><sphereGeometry args={[0.48, 10, 8]} /><meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity * 0.85} /></mesh>
            <mesh position={[0.38, -0.06, 0]}><sphereGeometry args={[0.34, 10, 8]} /><meshBasicMaterial color={cloudColor} transparent opacity={cloudOpacity * 0.85} /></mesh>
          </group>
        </group>

        {/* 7. Lush Grassy Valley Meadow Floor (Clickable to guide Juro!) */}
        <mesh
          position={[0, BASE_GROUND_Y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={handleGroundPointerDown}
          onClick={handleGroundClick}
        >
          <circleGeometry args={[24, 48]} />
          <meshLambertMaterial color={theme.groundColor} />
        </mesh>
        <mesh position={[0, BASE_GROUND_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[4.4, 40]} />
          <meshBasicMaterial color={theme.groundRimColor} opacity={0.22} transparent />
        </mesh>

        {/* 8. Jumpable Elevated Platforms, Grassy Knolls, Rock Ledge & Tree Stumps (Synced to MAP_PLATFORMS!) */}
        <group onPointerDown={handleGroundPointerDown} onClick={handleGroundClick}>
          {MAP_PLATFORMS.map((p) => {
            if (p.kind === "terrace") {
              return (
                <group key={p.id} position={[p.x, BASE_GROUND_Y, p.z]}>
                  {/* Earthy Cliff Side Base */}
                  <mesh position={[0, p.height * 0.44, 0]}>
                    <cylinderGeometry args={[p.radius * 0.98, p.radius * 1.12, p.height * 0.88, 22]} />
                    <meshLambertMaterial color={cliffSoilColor} />
                  </mesh>
                  {/* Lush Grassy Top Cap */}
                  <mesh position={[0, p.height - 0.045, 0]}>
                    <cylinderGeometry args={[p.radius * 1.0, p.radius * 1.03, 0.09, 22]} />
                    <meshLambertMaterial color={theme.groundColor} />
                  </mesh>
                  {/* Soft Highlight Meadow Ring on Top */}
                  <mesh position={[0, p.height + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[p.radius * 0.82, 20]} />
                    <meshBasicMaterial color={theme.groundRimColor} transparent opacity={0.28} />
                  </mesh>
                </group>
              );
            }

            if (p.kind === "rock-ledge") {
              return (
                <group key={p.id} position={[p.x, BASE_GROUND_Y, p.z]}>
                  <mesh position={[0, p.height * 0.48, 0]}>
                    <cylinderGeometry args={[p.radius * 0.94, p.radius * 1.1, p.height * 0.96, 9]} />
                    <meshLambertMaterial color={theme.isNight ? "#475569" : "#9CA3AF"} />
                  </mesh>
                  <mesh position={[0, p.height - 0.02, 0]}>
                    <cylinderGeometry args={[p.radius * 0.9, p.radius * 0.94, 0.045, 9]} />
                    <meshLambertMaterial color={theme.groundRimColor} />
                  </mesh>
                </group>
              );
            }

            // Tree stump Juro can hop right on top of!
            return (
              <group key={p.id} position={[p.x, BASE_GROUND_Y, p.z]}>
                <mesh position={[0, p.height * 0.5, 0]}>
                  <cylinderGeometry args={[p.radius * 0.92, p.radius * 1.08, p.height, 12]} />
                  <meshLambertMaterial color={woodDarkColor} />
                </mesh>
                <mesh position={[0, p.height + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[p.radius * 0.82, 12]} />
                  <meshLambertMaterial color={theme.isNight ? "#785334" : "#E7CBA9"} />
                </mesh>
              </group>
            );
          })}
        </group>

        {/* 9. Cozy Props atop the Knolls: Juro's Pet Sofa Bed (West) + Park Bench (East) */}
        <PetSofaBed
          theme={theme}
          woodColor={woodColor}
          woodDarkColor={woodDarkColor}
          onBedClick={onBedClick}
          onHoverChange={(hovered) => setHoveredLandmark(hovered ? "bed" : "none")}
        />

        {/* East Knoll Wooden Park Bench with Interactive "Duduk" (Sit) Trigger */}
        <ParkBench
          woodColor={woodColor}
          woodDarkColor={woodDarkColor}
          onBenchClick={onBenchClick}
          onHoverChange={(hovered) => setHoveredLandmark(hovered ? "bench" : "none")}
          isHovered={hoveredLandmark === "bench"}
          isSitting={isSittingOnBench}
        />

        {/* Interactive 3D Juro Shop Building ("TOKO") on Back-Right Hillside — Click to open /shop! */}
        <ShopBuildingLandmark
          theme={theme}
          woodColor={woodColor}
          woodDarkColor={woodDarkColor}
          isLanternLit={isLanternLit}
          isHovered={hoveredLandmark === "shop"}
          shopSignTex={shopSignTex}
          onPointerDown={handleLandmarkPointerDown}
          onClick={handleShopClick}
          onHoverChange={(hovered) => setHoveredLandmark(hovered ? "shop" : "none")}
        />

        {/* Interactive 3D Crystal Mine Cave ("TAMBANG") Straight North Across Bridge — Click to open /mine! */}
        <MineCaveLandmark
          theme={theme}
          woodColor={woodColor}
          woodDarkColor={woodDarkColor}
          isLanternLit={isLanternLit}
          isHovered={hoveredLandmark === "mine"}
          mineSignTex={mineSignTex}
          onPointerDown={handleLandmarkPointerDown}
          onClick={handleMineClick}
          onHoverChange={(hovered) => setHoveredLandmark(hovered ? "mine" : "none")}
        />

        {/* 10. Winding Brook & Cozy Lily Pond */}
        <group>
          <mesh position={[0, -0.912, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[streamBankShape]} />
            <meshBasicMaterial color={theme.waterRimColor} transparent opacity={0.42} />
          </mesh>
          <mesh position={[0, -0.909, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[streamWaterShape]} />
            <meshStandardMaterial
              color={theme.waterColor}
              roughness={0.14}
              metalness={0.18}
              emissive={theme.waterColor}
              emissiveIntensity={theme.isNight ? 0.25 : 0.08}
            />
          </mesh>

          <mesh position={[2.45, -0.911, -1.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[pondBankShape]} />
            <meshBasicMaterial color={theme.waterRimColor} transparent opacity={0.48} />
          </mesh>
          <mesh position={[2.45, -0.907, -1.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[pondWaterShape]} />
            <meshStandardMaterial
              color={theme.waterColor}
              roughness={0.12}
              metalness={0.2}
              emissive={theme.waterColor}
              emissiveIntensity={theme.isNight ? 0.28 : 0.1}
            />
          </mesh>

          <mesh ref={ripple1Ref} position={[2.3, -0.904, -1.0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.32, 24]} />
            <meshBasicMaterial color={theme.waterShimmerColor} transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <mesh ref={ripple2Ref} position={[2.75, -0.904, -1.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.235, 20]} />
            <meshBasicMaterial color={theme.waterShimmerColor} transparent opacity={0.3} depthWrite={false} />
          </mesh>

          <instancedMesh ref={shimmerInstRef} args={[undefined, undefined, waterShimmers.length]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={theme.waterShimmerColor} transparent opacity={0.32} depthWrite={false} />
          </instancedMesh>

          <group position={[2.92, -0.902, -0.82]}>
            <mesh rotation={[-Math.PI / 2, 0, 0.6]}>
              <circleGeometry args={[0.21, 16, 0, Math.PI * 1.82]} />
              <meshLambertMaterial color={theme.isNight ? "#15803D" : "#22C55E"} />
            </mesh>
            <mesh position={[0.02, 0.035, 0]} scale={[1.1, 0.75, 1.1]}>
              <sphereGeometry args={[0.055, 8, 8]} />
              <meshStandardMaterial color="#F472B6" roughness={0.4} emissive="#F472B6" emissiveIntensity={theme.isNight ? 0.28 : 0.05} />
            </mesh>
          </group>
          <mesh position={[2.02, -0.902, -1.32]} rotation={[-Math.PI / 2, 0, 2.5]}>
            <circleGeometry args={[0.145, 14, 0, Math.PI * 1.84]} />
            <meshLambertMaterial color={theme.isNight ? "#166534" : "#16A34A"} />
          </mesh>
        </group>

        {/* 11. Straight Flat Wooden Footbridge Over the Brook (Clickable!) */}
        <group
          position={[-0.36, -0.9, -2.32]}
          rotation={[0, 0, 0]}
          onPointerDown={handleGroundPointerDown}
          onClick={handleGroundClick}
        >
          {/* Two Straight Longitudinal Support Beams Underneath */}
          <mesh position={[-0.28, 0.05, 0]}>
            <boxGeometry args={[0.07, 0.06, 1.18]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>
          <mesh position={[0.28, 0.05, 0]}>
            <boxGeometry args={[0.07, 0.06, 1.18]} />
            <meshLambertMaterial color={woodDarkColor} />
          </mesh>

          {/* 5 Even, Level Wooden Bridge Planks */}
          {[-0.46, -0.23, 0, 0.23, 0.46].map((zOff, idx) => (
            <mesh key={idx} position={[0, 0.095, zOff]}>
              <boxGeometry args={[0.82, 0.045, 0.19]} />
              <meshLambertMaterial color={idx % 2 === 0 ? woodColor : woodDarkColor} />
            </mesh>
          ))}

          {/* 4 Straight Corner Posts */}
          {[-0.38, 0.38].map((xOff, xi) =>
            [-0.5, 0.5].map((zOff, zi) => (
              <mesh key={`${xi}-${zi}`} position={[xOff, 0.24, zOff]}>
                <boxGeometry args={[0.06, 0.36, 0.06]} />
                <meshLambertMaterial color={woodDarkColor} />
              </mesh>
            ))
          )}

          {/* Straight Left & Right Handrails */}
          <mesh position={[-0.38, 0.38, 0]}>
            <boxGeometry args={[0.048, 0.048, 1.06]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>
          <mesh position={[0.38, 0.38, 0]}>
            <boxGeometry args={[0.048, 0.048, 1.06]} />
            <meshLambertMaterial color={woodColor} />
          </mesh>
        </group>

        {/* 12. Two Cozy Glowing Meadow Lantern Posts (Bridge & East Path) */}
        {[
          { pos: [-1.45, BASE_GROUND_Y, -1.65] as [number, number, number], rotY: 0.45 },
          { pos: [2.25, BASE_GROUND_Y, 0.22] as [number, number, number], rotY: -2.2 },
        ].map((lamp, idx) => (
          <group key={idx} position={lamp.pos} rotation={[0, lamp.rotY, 0]}>
            <mesh position={[0, 0.38, 0]}>
              <boxGeometry args={[0.075, 0.76, 0.075]} />
              <meshLambertMaterial color={woodDarkColor} />
            </mesh>
            <mesh position={[0.14, 0.72, 0]}>
              <boxGeometry args={[0.32, 0.055, 0.055]} />
              <meshLambertMaterial color={woodColor} />
            </mesh>
            <mesh position={[0.26, 0.65, 0]}>
              <coneGeometry args={[0.1, 0.08, 4]} />
              <meshLambertMaterial color="#1F2937" />
            </mesh>
            <mesh position={[0.26, 0.56, 0]}>
              <boxGeometry args={[0.11, 0.13, 0.11]} />
              <meshStandardMaterial
                color={isLanternLit ? "#FEF08A" : "#E5E7EB"}
                emissive={isLanternLit ? "#F59E0B" : "#000000"}
                emissiveIntensity={isLanternLit ? 1.4 : 0}
              />
            </mesh>
            {isLanternLit && (
              <mesh position={[0.26, 0.56, 0]}>
                <sphereGeometry args={[0.3, 12, 10]} />
                <meshBasicMaterial color="#FDE047" transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}
          </group>
        ))}

        {/* 13. Instanced Stepping Stones, Rocks & Pebbles */}
        <instancedMesh ref={steppingStonesInstRef} args={[undefined, undefined, steppingStones.length]}>
          <cylinderGeometry args={[1, 1.05, 1, 8]} />
          <meshLambertMaterial color={theme.isNight ? "#475569" : "#D6D3D1"} />
        </instancedMesh>
        <instancedMesh ref={rocksInstRef} args={[undefined, undefined, rocks.length]}>
          <sphereGeometry args={[1, 8, 7]} />
          <meshLambertMaterial color="#FFFFFF" />
        </instancedMesh>

        {/* 14. Instanced Swaying Inner Grass, Static Outer Grass & Pond Reeds (3 Draw Calls Total!) */}
        <instancedMesh ref={grassInstRef} args={[undefined, undefined, grassBlades.length]} frustumCulled={false}>
          <coneGeometry args={[0.022, 0.18, 4]} />
          <meshLambertMaterial color={theme.grassTuftColor} />
        </instancedMesh>
        <instancedMesh ref={outerGrassInstRef} args={[undefined, undefined, outerGrassBlades.length]}>
          <coneGeometry args={[0.02, 0.18, 4]} />
          <meshLambertMaterial color={theme.grassTuftColor} />
        </instancedMesh>
        <instancedMesh ref={reedsInstRef} args={[undefined, undefined, reeds.length]} frustumCulled={false}>
          <coneGeometry args={[0.018, 0.4, 4]} />
          <meshLambertMaterial color={theme.groundRimColor} />
        </instancedMesh>

        {/* 15. Instanced Forest Mushrooms */}
        <instancedMesh ref={mushroomStemsInstRef} args={[undefined, undefined, mushrooms.length]}>
          <cylinderGeometry args={[0.022, 0.028, 0.09, 6]} />
          <meshLambertMaterial color="#FEF3C7" />
        </instancedMesh>
        <instancedMesh ref={mushroomCapsInstRef} args={[undefined, undefined, mushrooms.length]}>
          <sphereGeometry args={[0.055, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshLambertMaterial color="#FFFFFF" />
        </instancedMesh>

        {/* 16. Daytime Butterflies */}
        {!theme.isNight && (
          <group ref={butterfliesGroupRef}>
            {butterflies.map((b, idx) => (
              <group key={idx} position={b.base}>
                <mesh position={[-0.032, 0, 0]} rotation={[0.3, 0, 0.25]}>
                  <planeGeometry args={[0.058, 0.044]} />
                  <meshBasicMaterial color={b.color} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0.032, 0, 0]} rotation={[0.3, 0, -0.25]}>
                  <planeGeometry args={[0.058, 0.044]} />
                  <meshBasicMaterial color={b.color} side={THREE.DoubleSide} />
                </mesh>
              </group>
            ))}
          </group>
        )}
      </group>
    );
  }
);
