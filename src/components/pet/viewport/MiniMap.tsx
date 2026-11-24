import React, { useEffect, useRef } from "react";
import type * as THREE from "three";
import {
  HALF_WORLD,
  JURO_TRAMPOLINE_POS,
  LANDMARKS,
  WORLD_SIZE,
  grassPatchFactor,
  groundHeightAt,
  isBridgeDeck,
  isInCanalOrPond,
  isOnCobblePath,
  isOnTrail,
} from "../../../engine/world/mapTerrain";
export interface MiniMapProps {
  playerX: number;
  playerZ: number;
  yaw?: number;
  juroWorldPosRef?: React.RefObject<THREE.Vector3>;
  juroYawRef?: React.RefObject<number>;
}

const MAP_PX = 144;
const BASE_RES = 72;

export const MiniMap: React.FC<MiniMapProps> = ({
  playerX,
  playerZ,
  yaw = 0,
  juroWorldPosRef,
  juroYawRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseTerrainRef = useRef<HTMLCanvasElement | null>(null);

  // Pre-render static base terrain once onto an offscreen canvas
  useEffect(() => {
    if (typeof document === "undefined") return;
    const off = document.createElement("canvas");
    off.width = BASE_RES;
    off.height = BASE_RES;
    const ctx = off.getContext("2d");
    if (!ctx) return;

    for (let gz = 0; gz < BASE_RES; gz++) {
      for (let gx = 0; gx < BASE_RES; gx++) {
        const wx = (gx / BASE_RES) * WORLD_SIZE - HALF_WORLD;
        const wz = (gz / BASE_RES) * WORLD_SIZE - HALF_WORLD;

        if (isBridgeDeck(wx, wz)) {
          ctx.fillStyle = "#cf924a";
        } else if (isInCanalOrPond(wx, wz)) {
          ctx.fillStyle = "#52b6f0";
        } else if (isOnTrail(wx, wz)) {
          ctx.fillStyle = "#f2cb77";
        } else if (isOnCobblePath(wx, wz)) {
          ctx.fillStyle = "#dfd3bd";
        } else {
          const patch = grassPatchFactor(wx, wz);
          const h = groundHeightAt(wx, wz);
          if (h > 1.7) ctx.fillStyle = "#97d464";
          else if (patch > 0.35) ctx.fillStyle = "#6db246";
          else ctx.fillStyle = "#85c758";
        }
        ctx.fillRect(gx, gz, 1, 1);
      }
    }
    baseTerrainRef.current = off;
  }, []);

  // 60fps RAF loop when live refs are available, or single-shot redraw on prop updates
  useEffect(() => {
    const toPx = (val: number) => ((val + HALF_WORLD) / WORLD_SIZE) * MAP_PX;

    const drawOverlay = (curX: number, curZ: number, curYaw: number) => {
      const canvas = canvasRef.current;
      const base = baseTerrainRef.current;
      if (!canvas || !base) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, MAP_PX, MAP_PX);
      ctx.drawImage(base, 0, 0, MAP_PX, MAP_PX);

      // Subtle soft grid lines (3x3 grid)
      ctx.strokeStyle = "rgba(58, 76, 56, 0.1)";
      ctx.lineWidth = 1;
      for (let p = 36; p < MAP_PX; p += 36) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, MAP_PX);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(MAP_PX, p);
        ctx.stroke();
      }

      // Storybook Landmarks
      for (const lm of LANDMARKS) {
        const lx = Math.round(toPx(lm.position.x));
        const lz = Math.round(toPx(lm.position.z));
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(lx, lz, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = lm.color;
        ctx.beginPath();
        ctx.arc(lx, lz, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Interactive Mushroom Trampoline Marker
      const tx = Math.round(toPx(JURO_TRAMPOLINE_POS.x));
      const tz = Math.round(toPx(JURO_TRAMPOLINE_POS.z));
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(tx, tz, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(tx, tz, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Explorer / Juro Directional Chevron Arrow (dark outline with orange body)
      const px = toPx(curX);
      const pz = toPx(curZ);
      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(-curYaw + Math.PI);

      // Dark background chevron
      ctx.fillStyle = "#2d3a2f";
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();

      // Orange inner chevron
      ctx.fillStyle = "#f28b42";
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(3.5, 3.5);
      ctx.lineTo(0, 1.5);
      ctx.lineTo(-3.5, 3.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    let animId = 0;
    let lastX = Number.NaN;
    let lastZ = Number.NaN;
    let lastYaw = Number.NaN;
    let needsInitialDraw = true;

    const tick = () => {
      const curX = juroWorldPosRef?.current ? juroWorldPosRef.current.x : playerX;
      const curZ = juroWorldPosRef?.current ? juroWorldPosRef.current.z : playerZ;
      const curYaw = juroYawRef?.current !== undefined ? juroYawRef.current : yaw;

      const moved =
        needsInitialDraw ||
        Math.hypot(curX - lastX, curZ - lastZ) >= 0.015 ||
        Math.abs(curYaw - lastYaw) >= 0.015;

      if (moved) {
        drawOverlay(curX, curZ, curYaw);
        lastX = curX;
        lastZ = curZ;
        lastYaw = curYaw;
        needsInitialDraw = false;
      }

      if (juroWorldPosRef || juroYawRef) {
        animId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [playerX, playerZ, yaw, juroWorldPosRef, juroYawRef]);

  return (
    <div className="relative rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 p-1 shadow-sm select-none pointer-events-auto">
      <canvas
        ref={canvasRef}
        width={MAP_PX}
        height={MAP_PX}
        className="w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] block cursor-default rounded-xl"
        title="Peta lembah"
      />
      <span className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-neutral-800 bg-white/85 px-1 rounded leading-tight">
        U
      </span>
    </div>
  );
};
