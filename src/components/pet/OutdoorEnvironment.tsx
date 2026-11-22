import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
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
  walkableHeightAt,
} from "../../engine/world/mapTerrain";
import { createPixelTextureSet } from "./environment/pixelTextures";
import { buildRetroWorld, type BuiltWorld } from "./environment/mapWorldBuilder";
import { WalkTargetMarker } from "./environment/WalkTargetMarker";
import {
  type WeatherMode,
  isRainingWeather,
  normalizeWeather,
} from "../../types/ui";
import type { WalkCommand } from "../../features/character/JuroModel";

interface OutdoorEnvironmentProps {
  theme: TimeThemeConfig;
  weather?: WeatherMode;
  onWalkPointSelect?: (x: number, z: number) => void;
  walkCommand?: WalkCommand | null;
  routeWaypoints?: Array<{ x: number; z: number }>;
  juroWorldPosRef?: React.RefObject<THREE.Vector3>;
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
const _navV1 = new THREE.Vector3();
const _navEuler = new THREE.Euler();
const _navQuat = new THREE.Quaternion();
const _navScale = new THREE.Vector3(1, 1, 1);
const _navMat4 = new THREE.Matrix4();
const _crumbSamplesX = new Float32Array(64);
const _crumbSamplesZ = new Float32Array(64);

export const OutdoorEnvironment: React.FC<OutdoorEnvironmentProps> = React.memo(
  ({
    theme,
    weather = "clear",
    onWalkPointSelect,
    walkCommand,
    routeWaypoints = [],
    juroWorldPosRef,
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

    const worldRef = useRef<BuiltWorld | null>(null);

    // Build the complete 3D Storybook world with pixel-art canvas textures
    const { group, textures, built } = useMemo(() => {
      const g = new THREE.Group();
      const tex = createPixelTextureSet();
      const b = buildRetroWorld(g, tex, false);
      return { group: g, textures: tex, built: b };
    }, []);

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
    const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

    const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
      pointerDownPosRef.current = {
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
        time: Date.now(),
      };
    }, []);

    // Handle clicks across the 3D diorama
    const handleClick = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();

        // Reject if this click was actually a camera rotate/drag gesture (>8px movement or >1200ms hold)
        if (pointerDownPosRef.current) {
          const dx = e.nativeEvent.clientX - pointerDownPosRef.current.x;
          const dy = e.nativeEvent.clientY - pointerDownPosRef.current.y;
          const dist = Math.hypot(dx, dy);
          const elapsed = Date.now() - pointerDownPosRef.current.time;
          if (dist > 8 || elapsed > 1200) {
            return;
          }
        }

        const hitObj = e.object;
        const landmarkId = hitObj.userData?.landmarkId;

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
          return;
        }

        // Click on walkable ground / trail / bridge / plaza
        if (e.point) {
          onWalkPointSelect?.(e.point.x, e.point.z);
        }
      },
      [onOpenShop, onOpenMine, onBedClick, onBenchClick, onTrampolineClick, onWalkPointSelect]
    );

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.object.userData?.landmarkId;
      if (id === "cafe") setHoveredLandmark("shop");
      else if (id === "tunnel") setHoveredLandmark("mine");
      else if (id === "overlook") setHoveredLandmark("bench");
      else if (id === "trampoline") setHoveredLandmark("trampoline");
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

      // Animate navigation visuals (breadcrumbs & destination beacon)
      const nv = worldRef.current?.navVisuals;
      if (nv) {
        const hasDest = Boolean(walkCommand);
        const juroPos = juroWorldPosRef?.current;
        const destX = walkCommand?.x ?? 0;
        const destZ = walkCommand?.z ?? 0;
        const distToDest = juroPos ? Math.hypot(destX - juroPos.x, destZ - juroPos.z) : 999;

        if (hasDest && distToDest > 0.65) {
          nv.beaconGroup.visible = true;
          nv.beaconGroup.position.set(destX, walkableHeightAt(destX, destZ), destZ);

          const elapsed = state.clock.elapsedTime;
          const ringPulse = 0.88 + Math.sin(elapsed * 4.5) * 0.14;
          nv.beaconRing.scale.set(ringPulse, ringPulse, 1);

          // Update breadcrumbs along remaining route (Zero heap allocations per frame!)
          if (routeWaypoints && routeWaypoints.length > 0 && juroPos) {
            let sampleCount = 0;
            let prevX = juroPos.x;
            let prevZ = juroPos.z;
            for (let p = 0; p < routeWaypoints.length; p++) {
              const pt = routeWaypoints[p];
              const segLen = Math.hypot(pt.x - prevX, pt.z - prevZ);
              const count = Math.max(1, Math.floor(segLen / 1.15));
              for (let i = 1; i <= count; i++) {
                if (sampleCount >= nv.maxBreadcrumbs) break;
                const t = i / count;
                _crumbSamplesX[sampleCount] = prevX + (pt.x - prevX) * t;
                _crumbSamplesZ[sampleCount] = prevZ + (pt.z - prevZ) * t;
                sampleCount++;
              }
              prevX = pt.x;
              prevZ = pt.z;
            }

            nv.breadcrumbs.count = sampleCount;
            for (let i = 0; i < sampleCount; i++) {
              const sx = _crumbSamplesX[i];
              const sz = _crumbSamplesZ[i];
              const y = walkableHeightAt(sx, sz) + 0.28;
              _navV1.set(sx, y, sz);
              _navEuler.set(0, i * 0.4, 0);
              _navQuat.setFromEuler(_navEuler);
              _navMat4.compose(_navV1, _navQuat, _navScale);
              nv.breadcrumbs.setMatrixAt(i, _navMat4);
            }
            nv.breadcrumbs.instanceMatrix.needsUpdate = true;
          } else {
            nv.breadcrumbs.count = 0;
          }
        } else {
          nv.beaconGroup.visible = false;
          nv.breadcrumbs.count = 0;
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

        {/* Animated Ground Destination Walk Marker Ring */}
        {walkCommand && (
          <WalkTargetMarker
            key={walkCommand.nonce}
            x={walkCommand.x}
            z={walkCommand.z}
          />
        )}

        {/* 3D Contextual Hover Badges for Landmarks */}
        {hoveredLandmark === "shop" && (
          <Html position={[JURO_SHOP_POS.x, 1.6, JURO_SHOP_POS.z]} center>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-warm-white/95 dark:bg-neutral-900/95 border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase select-none pointer-events-none">
              <ShoppingBag size={12} />
              Toko Kafe
            </div>
          </Html>
        )}

        {hoveredLandmark === "mine" && (
          <Html position={[JURO_MINE_POS.x, 1.8, JURO_MINE_POS.z]} center>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-warm-white/95 dark:bg-neutral-900/95 border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase select-none pointer-events-none">
              <Pickaxe size={12} />
              Tambang
            </div>
          </Html>
        )}


        {hoveredLandmark === "bench" && (
          <Html position={[JURO_BENCH_POS.x, JURO_BENCH_POS.seatY + 0.75, JURO_BENCH_POS.z]} center>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-warm-white/95 dark:bg-neutral-900/95 border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase select-none pointer-events-none">
              <Armchair size={12} />
              Pos Pandang
            </div>
          </Html>
        )}

        {hoveredLandmark === "trampoline" && (
          <Html position={[JURO_TRAMPOLINE_POS.x, JURO_TRAMPOLINE_POS.surfaceY + 0.75, JURO_TRAMPOLINE_POS.z]} center>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-warm-white/95 dark:bg-neutral-900/95 border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase select-none pointer-events-none">
              <ArrowBigUp size={12} />
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
              className="animate-tray-enter relative flex flex-col gap-1.5 p-2 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] min-w-[140px] pointer-events-auto select-none"
            >
              <div className="flex items-center justify-between gap-2 border-b border-neutral-300 dark:border-neutral-700 pb-1">
                <div className="flex items-center gap-1.5">
                  <Armchair size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="pixel-text text-[9px] uppercase font-bold text-charcoal dark:text-white">
                    Pos Pandang
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseBenchMenu}
                  className="text-neutral-400 hover:text-charcoal dark:hover:text-white cursor-pointer"
                  aria-label="Tutup menu kursi"
                >
                  <X size={12} />
                </button>
              </div>
              {isSittingOnBench ? (
                <button
                  type="button"
                  onClick={onStandFromBench}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  <Footprints size={12} />
                  Berdiri
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSitOnBench}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  <Armchair size={12} />
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
              className="animate-tray-enter relative flex flex-col gap-1.5 p-2 bg-warm-white/95 dark:bg-neutral-900/95 backdrop-blur-xs border-2 border-charcoal dark:border-neutral-600 shadow-[3px_3px_0px_#171717] dark:shadow-[3px_3px_0px_#000000] min-w-[140px] pointer-events-auto select-none"
            >
              <div className="flex items-center justify-between gap-2 border-b border-neutral-300 dark:border-neutral-700 pb-1">
                <div className="flex items-center gap-1.5">
                  <ArrowBigUp size={14} className="text-rose-500 shrink-0" />
                  <span className="pixel-text text-[9px] uppercase font-bold text-charcoal dark:text-white">
                    Trampolin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseTrampolineMenu}
                  className="text-neutral-400 hover:text-charcoal dark:hover:text-white cursor-pointer"
                  aria-label="Tutup menu trampolin"
                >
                  <X size={12} />
                </button>
              </div>
              {isBouncingOnTrampoline ? (
                <button
                  type="button"
                  onClick={onStopBounce}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  <Footprints size={12} />
                  Selesai
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartBounce}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-500 hover:bg-rose-600 text-white border-2 border-charcoal shadow-[2px_2px_0px_#171717] pixel-text text-[9px] uppercase font-bold cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  <ArrowBigUp size={12} />
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
