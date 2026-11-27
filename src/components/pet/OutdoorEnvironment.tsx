import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Armchair,
  Footprints,
  ArrowBigUp,
  ShoppingBag,
  Pickaxe,
  X,
} from "lucide-react";
import type { TimeThemeConfig } from "../../utils/timeOfDay";
import {
  JURO_BENCH_POS,
  JURO_TRAMPOLINE_POS,
  JURO_SHOP_POS,
  JURO_MINE_POS,
  clampToCircularWorld,
} from "../../engine/world/mapTerrain";
import { createPixelTextureSet } from "./environment/pixelTextures";
import { buildRetroWorld, type BuiltWorld } from "./environment/mapWorldBuilder";
import {
  type WeatherMode,
  isRainingWeather,
  normalizeWeather,
} from "../../types/ui";
import type { GraphicsProfile } from "../../engine/world/graphicsProfile";
import { evaluateTimeLapseAtmosphere } from "../../features/intro/introTimeline";

interface OutdoorEnvironmentProps {
  theme: TimeThemeConfig;
  weather?: WeatherMode;
  isRaining?: boolean;
  graphicsProfile?: GraphicsProfile;
  introActive?: boolean;
  introProgressRef?: React.RefObject<number>;
  onOpenShop?: () => void;
  onOpenMine?: () => void;
  onBedClick?: () => void;
  isBenchMenuOpen?: boolean;
  onBenchClick?: () => void;
  onSitOnBench?: () => void;
  onStandFromBench?: () => void;
  onCloseBenchMenu?: () => void;
  isSittingOnBench?: boolean;
  isTrampolineMenuOpen?: boolean;
  onTrampolineClick?: () => void;
  onStartBounce?: () => void;
  onStopBounce?: () => void;
  onCloseTrampolineMenu?: () => void;
  isBouncingOnTrampoline?: boolean;
  onGroundClick?: (point: { x: number; z: number }) => void;
}

export const OutdoorEnvironment: React.FC<OutdoorEnvironmentProps> = React.memo(
  ({
    theme,
    weather = "clear",
    isRaining: isRainingProp,
    graphicsProfile,
    onOpenShop,
    onOpenMine,
    onBedClick,
    isBenchMenuOpen = false,
    onBenchClick,
    onSitOnBench,
    onStandFromBench,
    onCloseBenchMenu,
    isSittingOnBench = false,
    isTrampolineMenuOpen = false,
    onTrampolineClick,
    onStartBounce,
    onStopBounce,
    onCloseTrampolineMenu,
    isBouncingOnTrampoline = false,
    onGroundClick,
    introActive = false,
    introProgressRef,
  }) => {
    const [hoveredLandmark, setHoveredLandmark] = useState<
      "none" | "shop" | "mine" | "bed" | "bench" | "trampoline"
    >("none");

    const gl = useThree((s) => s.gl);
    const worldRef = useRef<BuiltWorld | null>(null);

    const terrainSegments = graphicsProfile?.terrainSegments ?? 96;
    const shadowsEnabled = graphicsProfile?.shadowsEnabled ?? true;
    const maxPointLights = graphicsProfile?.maxPointLights ?? 3;
    const rainCount = graphicsProfile?.rainCount ?? 200;
    const anisotropyTarget = graphicsProfile?.anisotropy ?? 4;

    // Build the complete 3D Storybook world with pixel-art canvas textures scaled to graphics profile
    const { group, textures, built } = useMemo(() => {
      const g = new THREE.Group();
      const tex = createPixelTextureSet();
      const b = buildRetroWorld(g, tex, {
        terrainSegments,
        shadowsEnabled,
        maxPointLights,
        rainCount,
      });
      return { group: g, textures: tex, built: b };
    }, [terrainSegments, shadowsEnabled, maxPointLights, rainCount]);

    useEffect(() => {
      const maxSupported =
        typeof gl?.capabilities?.getMaxAnisotropy === "function"
          ? gl.capabilities.getMaxAnisotropy()
          : 4;
      textures.applyAnisotropy(Math.min(maxSupported, anisotropyTarget));
    }, [gl, textures, anisotropyTarget]);

    useEffect(() => {
      worldRef.current = built;
      return () => {
        built.dispose();
        textures.dispose();
        worldRef.current = null;
      };
    }, [built, textures]);

    // Manage mouse cursor on landmark hover
    useEffect(() => {
      if (typeof document === "undefined") return;
      document.body.style.cursor = hoveredLandmark !== "none" ? "pointer" : "auto";
      return () => {
        document.body.style.cursor = "auto";
      };
    }, [hoveredLandmark]);

    // Record pointer down coordinates to distinguish clean tap vs camera orbit/drag
    const pointerDownPosRef = useRef<{ x: number; y: number; time: number; isTouch: boolean } | null>(null);

    const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
      pointerDownPosRef.current = {
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
        time: Date.now(),
        isTouch: e.nativeEvent.pointerType === "touch",
      };
    }, []);

    // Handle clicks across interactive landmarks and walkable 3D valley ground
    const handleClick = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        if (e.nativeEvent.button !== 0) {
          return;
        }

        // Reject if this click was actually a camera rotate/drag gesture
        if (pointerDownPosRef.current) {
          const dx = e.nativeEvent.clientX - pointerDownPosRef.current.x;
          const dy = e.nativeEvent.clientY - pointerDownPosRef.current.y;
          const dist = Math.hypot(dx, dy);
          const elapsed = Date.now() - pointerDownPosRef.current.time;
          const maxSlop = pointerDownPosRef.current.isTouch ? 24 : 12;
          if (dist > maxSlop || elapsed > 1200) {
            return;
          }
        }

        const hitObj = e.object;
        const landmarkId = hitObj.userData?.landmarkId;
        const isInteractive =
          landmarkId === "cafe" ||
          landmarkId === "tunnel" ||
          landmarkId === "bed" ||
          landmarkId === "overlook" ||
          landmarkId === "trampoline";

        if (isInteractive) {
          e.stopPropagation();
          if (landmarkId === "cafe") {
            onOpenShop?.();
            return;
          }
          if (landmarkId === "tunnel") {
            onOpenMine?.();
            return;
          }
          if (landmarkId === "bed") {
            onBedClick?.();
            return;
          }
          if (landmarkId === "overlook") {
            onBenchClick?.();
            return;
          }
          if (landmarkId === "trampoline") {
            onTrampolineClick?.();
          }
          return;
        }

        if (onGroundClick && hitObj.name !== "island-cliff-skirt") {
          e.stopPropagation();
          const { x, z } = clampToCircularWorld(e.point.x, e.point.z);
          onGroundClick({ x, z });
        }
      },
      [onOpenShop, onOpenMine, onBedClick, onBenchClick, onTrampolineClick, onGroundClick]
    );

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
      const id = e.object.userData?.landmarkId;
      if (id === "cafe") {
        e.stopPropagation();
        setHoveredLandmark("shop");
      } else if (id === "tunnel") {
        e.stopPropagation();
        setHoveredLandmark("mine");
      } else if (id === "overlook") {
        e.stopPropagation();
        setHoveredLandmark("bench");
      } else if (id === "trampoline") {
        e.stopPropagation();
        setHoveredLandmark("trampoline");
      }
    }, []);

    const handlePointerOut = useCallback(() => {
      setHoveredLandmark("none");
    }, []);

    // 60fps frame loop for ambient animations (koi, ducks, ripples, rain, lanterns, water caustics)
    useFrame((state, delta) => {
      if (!worldRef.current) return;
      const { kois, rain, lanternLights, lanternBulbs } = worldRef.current;

      // Animate flowing water surface caustics
      if (textures.waterPixel) {
        textures.waterPixel.offset.x = (state.clock.elapsedTime * 0.04) % 1;
        textures.waterPixel.offset.y = (state.clock.elapsedTime * 0.035) % 1;
      }

      // Animate swimming koi along canal/pond with tangent heading, S-wave sway, fin paddling & water depth
      const elapsed = state.clock.elapsedTime;
      for (let i = 0; i < kois.length; i++) {
        const k = kois[i];
        k.phase += delta * k.speed;

        const rot = k.pathRotation ?? 0;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const meander = k.meanderAmp ?? 0;

        // Local elliptical patrol + gentle sinusoidal river weave
        const lx = Math.cos(k.phase) * k.radiusX;
        const lz = Math.sin(k.phase) * k.radiusZ + Math.sin(k.phase * 3.0) * meander;

        // Derivatives w.r.t. phase for exact forward tangent direction
        const dlx = -Math.sin(k.phase) * k.radiusX;
        const dlz = Math.cos(k.phase) * k.radiusZ + Math.cos(k.phase * 3.0) * 3.0 * meander;

        const wx = k.centerX + lx * cosR - lz * sinR;
        const wz = k.centerZ + lx * sinR + lz * cosR;
        const vx = dlx * cosR - dlz * sinR;
        const vz = dlx * sinR + dlz * cosR;

        const bob = Math.sin(elapsed * (k.isDuck ? 2.4 : 2.1) + i * 1.4) * (k.isDuck ? 0.018 : 0.022);
        k.group.position.set(wx, k.baseY + bob, wz);

        // Model nose faces +Z locally -> atan2(vx, vz) aligns nose exactly along motion vector
        k.group.rotation.y = Math.atan2(vx, vz);

        const swimWave = elapsed * (k.isDuck ? 4.8 : 7.5 + i * 0.4) + i * 1.3;
        if (k.tail) {
          k.tail.rotation.y = Math.sin(swimWave) * (k.isDuck ? 0.16 : 0.44);
        }
        if (k.body) {
          k.body.rotation.y = Math.sin(swimWave - 0.6) * 0.1;
          k.body.rotation.z = Math.sin(swimWave * 0.5) * 0.04;
        }
        if (k.leftFin && k.rightFin) {
          const pad = Math.sin(swimWave * 0.85) * 0.35;
          k.leftFin.rotation.y = -0.15 + pad;
          k.rightFin.rotation.y = 0.15 - pad;
        }
      }

      const introAtmo =
        introActive && introProgressRef
          ? evaluateTimeLapseAtmosphere(introProgressRef.current)
          : null;

      // Animate rain & water ripples during rain
      const isRaining = introAtmo ? introAtmo.isRaining : (isRainingProp ?? isRainingWeather(weather));
      if (rain.mesh.visible !== isRaining) {
        rain.mesh.visible = isRaining;
        rain.ripples.forEach((r) => (r.visible = isRaining));
      }

      if (isRaining) {
        const pos = rain.positions;
        const speeds = rain.speeds;
        const count = rain.count;
        const matrixArray = rain.mesh.instanceMatrix.array as Float32Array;
        for (let i = 0; i < count; i++) {
          let nextY = pos[i * 3 + 1] - speeds[i] * delta;
          if (nextY < -0.3) {
            nextY = 16 + ((i * 0.6180339) % 1) * 4;
          }
          pos[i * 3 + 1] = nextY;
          // Directly update the Y translation element of the 4x4 instance matrix
          matrixArray[i * 16 + 13] = nextY;
        }
        rain.mesh.instanceMatrix.needsUpdate = true;

        for (let r = 0; r < rain.ripples.length; r++) {
          rain.ripplePhases[r] += delta * 1.5;
          if (rain.ripplePhases[r] > 1.0) rain.ripplePhases[r] = 0;
          const s = 0.5 + rain.ripplePhases[r] * 1.2;
          rain.ripples[r].scale.set(s, s, s);
          const mat = rain.ripples[r].material as THREE.MeshBasicMaterial;
          mat.opacity = (1 - rain.ripplePhases[r]) * 0.5;
        }
      }

      // Adjust lantern light intensity & bulb emissive based on time-of-day + rain
      const normW = normalizeWeather(weather);
      const isNight = introAtmo ? introAtmo.isNight : (normW === "malam" || theme.isNight);
      const isSunset = introAtmo ? false : normW === "senja";
      const isMorning = introAtmo ? false : normW === "pagi";
      const targetIntensity = isNight
        ? isRaining
          ? 3.2
          : 3.0
        : isSunset
        ? isRaining
          ? 2.2
          : 1.9
        : isMorning
        ? isRaining
          ? 1.2
          : 0.45
        : isRaining
        ? 1.5
        : 0.0;
      const targetEmissive = isNight
        ? 2.3
        : isSunset
        ? isRaining
          ? 1.8
          : 1.6
        : isMorning
        ? isRaining
          ? 1.15
          : 0.65
        : isRaining
        ? 1.3
        : 0.35;
      const needLights = isNight || isSunset || isRaining || isMorning;

      // Adjust lantern light visibility & intensity to optimize mobile GPU shader passes
      if (lanternLights.length > 0) {
        for (let l = 0; l < lanternLights.length; l++) {
          const lt = lanternLights[l];
          if (lt.visible !== needLights) {
            lt.visible = needLights;
          }
          if (needLights && Math.abs(lt.intensity - targetIntensity) > 0.01) {
            lt.intensity = THREE.MathUtils.lerp(
              lt.intensity,
              targetIntensity,
              delta * 3.0
            );
          }
        }
        for (let b = 0; b < lanternBulbs.length; b++) {
          const mat = lanternBulbs[b].material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.emissiveIntensity = THREE.MathUtils.lerp(
              mat.emissiveIntensity,
              targetEmissive,
              delta * 3.0
            );
          }
        }
      }
    });

    return (
      <group>
        {/* The 3D Storybook World Mesh Hierarchy */}
        <primitive
          object={group}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />

        {/* 3D Contextual Hover Badges for Landmarks */}
        {hoveredLandmark === "shop" && (
          <Html position={[JURO_SHOP_POS.x, 1.6, JURO_SHOP_POS.z]} center>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_2px_0_#18181B] font-pixel text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 select-none pointer-events-none whitespace-nowrap">
              <ShoppingBag size={13} />
              Toko Kafe
            </div>
          </Html>
        )}

        {hoveredLandmark === "mine" && (
          <Html position={[JURO_MINE_POS.x, 1.8, JURO_MINE_POS.z]} center>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_2px_0_#18181B] font-pixel text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 select-none pointer-events-none whitespace-nowrap">
              <Pickaxe size={13} />
              Tambang
            </div>
          </Html>
        )}

        {hoveredLandmark === "bench" && (
          <Html position={[JURO_BENCH_POS.x, JURO_BENCH_POS.seatY + 0.75, JURO_BENCH_POS.z]} center>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_2px_0_#18181B] font-pixel text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 select-none pointer-events-none whitespace-nowrap">
              <Armchair size={13} />
              Pos Pandang
            </div>
          </Html>
        )}

        {hoveredLandmark === "trampoline" && (
          <Html position={[JURO_TRAMPOLINE_POS.x, JURO_TRAMPOLINE_POS.surfaceY + 0.75, JURO_TRAMPOLINE_POS.z]} center>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_2px_0_#18181B] font-pixel text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400 select-none pointer-events-none whitespace-nowrap">
              <ArrowBigUp size={13} />
              Trampolin
            </div>
          </Html>
        )}

        {/* 3D Contextual Menu for Park Bench at Pos Pandang */}
        {isBenchMenuOpen && (
          <Html
            position={[JURO_BENCH_POS.x, JURO_BENCH_POS.seatY + 0.7, JURO_BENCH_POS.z]}
            center
            zIndexRange={[80, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="animate-tray-enter relative flex flex-col gap-2 p-2.5 rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_4px_0_#18181B] min-w-[160px] pointer-events-auto select-none"
            >
              <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E] pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Armchair size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-pixel text-[11px] font-bold uppercase text-charcoal dark:text-white">
                    Pos Pandang
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseBenchMenu}
                  className="p-0.5 rounded-[3px] text-neutral-500 hover:text-charcoal dark:hover:text-white cursor-pointer"
                  aria-label="Tutup menu kursi"
                >
                  <X size={14} />
                </button>
              </div>
              {isSittingOnBench ? (
                <button
                  type="button"
                  onClick={onStandFromBench}
                  className="console-btn-bevel w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[4px] bg-amber-500 hover:bg-amber-600 text-charcoal border-2 border-charcoal shadow-[0_2px_0_#18181B] font-pixel text-[11px] font-bold uppercase cursor-pointer"
                >
                  <Footprints size={14} />
                  Berdiri
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSitOnBench}
                  className="console-btn-bevel w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[4px] bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-charcoal shadow-[0_2px_0_#18181B] font-pixel text-[11px] font-bold uppercase cursor-pointer"
                >
                  <Armchair size={14} />
                  Duduk
                </button>
              )}
            </div>
          </Html>
        )}

        {/* 3D Contextual Menu for Trampoline */}
        {isTrampolineMenuOpen && (
          <Html
            position={[JURO_TRAMPOLINE_POS.x, JURO_TRAMPOLINE_POS.surfaceY + 0.7, JURO_TRAMPOLINE_POS.z]}
            center
            zIndexRange={[80, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="animate-tray-enter relative flex flex-col gap-2 p-2.5 rounded-[6px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[0_4px_0_#18181B] min-w-[160px] pointer-events-auto select-none"
            >
              <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-charcoal/20 dark:border-[#3F424E] pb-1.5">
                <div className="flex items-center gap-1.5">
                  <ArrowBigUp size={15} className="text-rose-500 shrink-0" />
                  <span className="font-pixel text-[11px] font-bold uppercase text-charcoal dark:text-white">
                    Trampolin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseTrampolineMenu}
                  className="p-0.5 rounded-[3px] text-neutral-500 hover:text-charcoal dark:hover:text-white cursor-pointer"
                  aria-label="Tutup menu trampolin"
                >
                  <X size={14} />
                </button>
              </div>
              {isBouncingOnTrampoline ? (
                <button
                  type="button"
                  onClick={onStopBounce}
                  className="console-btn-bevel w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[4px] bg-amber-500 hover:bg-amber-600 text-charcoal border-2 border-charcoal shadow-[0_2px_0_#18181B] font-pixel text-[11px] font-bold uppercase cursor-pointer"
                >
                  <Footprints size={14} />
                  Selesai
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartBounce}
                  className="console-btn-bevel w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white border-2 border-charcoal shadow-[0_2px_0_#18181B] font-pixel text-[11px] font-bold uppercase cursor-pointer"
                >
                  <ArrowBigUp size={14} />
                  Lompat
                </button>
              )}
            </div>
          </Html>
        )}
      </group>
    );
  }
);
