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
} from "../../engine/world/mapTerrain";
import { createPixelTextureSet } from "./environment/pixelTextures";
import { buildRetroWorld, type BuiltWorld } from "./environment/mapWorldBuilder";
import {
  type WeatherMode,
  isRainingWeather,
  normalizeWeather,
} from "../../types/ui";
import type { GraphicsProfile } from "../../engine/world/graphicsProfile";

interface OutdoorEnvironmentProps {
  theme: TimeThemeConfig;
  weather?: WeatherMode;
  graphicsProfile?: GraphicsProfile;
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
}

const _dummy = new THREE.Object3D();

export const OutdoorEnvironment: React.FC<OutdoorEnvironmentProps> = React.memo(
  ({
    theme,
    weather = "clear",
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

    // Handle clicks across interactive landmarks in the 3D diorama
    const handleClick = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        const hitObj = e.object;
        const landmarkId = hitObj.userData?.landmarkId;
        const isInteractive =
          landmarkId === "cafe" ||
          landmarkId === "tunnel" ||
          landmarkId === "bed" ||
          landmarkId === "overlook" ||
          landmarkId === "trampoline";

        if (!isInteractive) {
          return;
        }

        e.stopPropagation();

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
      },
      [onOpenShop, onOpenMine, onBedClick, onBenchClick, onTrampolineClick]
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

      // Animate swimming koi and ducks
      for (let i = 0; i < kois.length; i++) {
        const k = kois[i];
        k.phase += delta * k.speed;
        k.group.position.x = k.centerX + Math.cos(k.phase) * k.radiusX;
        k.group.position.z = k.centerZ + Math.sin(k.phase) * k.radiusZ;
        k.group.rotation.y = -k.phase - Math.PI / 2;
        if (k.tail) {
          k.tail.rotation.y = Math.sin(k.phase * 5.0) * 0.28;
        }
      }

      // Animate rain & water ripples during rain
      const isRaining = isRainingWeather(weather);
      if (rain.mesh.visible !== isRaining) {
        rain.mesh.visible = isRaining;
        rain.ripples.forEach((r) => (r.visible = isRaining));
      }

      if (isRaining) {
        const pos = rain.positions;
        const speeds = rain.speeds;
        const count = rain.count;
        for (let i = 0; i < count; i++) {
          pos[i * 3 + 1] -= speeds[i] * delta;
          if (pos[i * 3 + 1] < -0.3) {
            pos[i * 3 + 1] = 16 + Math.random() * 4;
          }
          _dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          _dummy.updateMatrix();
          rain.mesh.setMatrixAt(i, _dummy.matrix);
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

      // Adjust lantern light intensity & bulb emissive based on weather / night
      const normW = normalizeWeather(weather);
      const isNight = normW === "malam" || (normW === "cerah" && theme.isNight);
      const isSunset = normW === "senja";
      const targetIntensity = isNight ? 3.0 : isSunset ? 1.9 : isRaining ? 1.5 : 0.0;
      const targetEmissive = isNight ? 2.3 : isSunset ? 1.6 : isRaining ? 1.3 : 0.35;
      const needLights = isNight || isSunset || isRaining;

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
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 shadow-md text-xs font-semibold text-amber-700 dark:text-amber-400 select-none pointer-events-none whitespace-nowrap">
              <ShoppingBag size={13} />
              Toko Kafe
            </div>
          </Html>
        )}

        {hoveredLandmark === "mine" && (
          <Html position={[JURO_MINE_POS.x, 1.8, JURO_MINE_POS.z]} center>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 shadow-md text-xs font-semibold text-amber-600 dark:text-amber-400 select-none pointer-events-none whitespace-nowrap">
              <Pickaxe size={13} />
              Tambang
            </div>
          </Html>
        )}

        {hoveredLandmark === "bench" && (
          <Html position={[JURO_BENCH_POS.x, JURO_BENCH_POS.seatY + 0.75, JURO_BENCH_POS.z]} center>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 shadow-md text-xs font-semibold text-emerald-700 dark:text-emerald-400 select-none pointer-events-none whitespace-nowrap">
              <Armchair size={13} />
              Pos Pandang
            </div>
          </Html>
        )}

        {hoveredLandmark === "trampoline" && (
          <Html position={[JURO_TRAMPOLINE_POS.x, JURO_TRAMPOLINE_POS.surfaceY + 0.75, JURO_TRAMPOLINE_POS.z]} center>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 shadow-md text-xs font-semibold text-rose-600 dark:text-rose-400 select-none pointer-events-none whitespace-nowrap">
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
              className="animate-tray-enter relative flex flex-col gap-2 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl min-w-[152px] pointer-events-auto select-none"
            >
              <div className="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Armchair size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Pos Pandang
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseBenchMenu}
                  className="p-0.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                  aria-label="Tutup menu kursi"
                >
                  <X size={14} />
                </button>
              </div>
              {isSittingOnBench ? (
                <button
                  type="button"
                  onClick={onStandFromBench}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  <Footprints size={14} />
                  Berdiri
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSitOnBench}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
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
              className="animate-tray-enter relative flex flex-col gap-2 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl min-w-[152px] pointer-events-auto select-none"
            >
              <div className="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <ArrowBigUp size={15} className="text-rose-500 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Trampolin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseTrampolineMenu}
                  className="p-0.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                  aria-label="Tutup menu trampolin"
                >
                  <X size={14} />
                </button>
              </div>
              {isBouncingOnTrampoline ? (
                <button
                  type="button"
                  onClick={onStopBounce}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  <Footprints size={14} />
                  Selesai
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartBounce}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
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
