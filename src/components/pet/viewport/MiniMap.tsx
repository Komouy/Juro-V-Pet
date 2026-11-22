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
import type { WorldPoint } from "../../../engine/world/pathfinding";

export interface MiniMapProps {
  playerX: number;
  playerZ: number;
  yaw?: number;
  routeWaypoints?: WorldPoint[];
  activeDestination?: { x: number; z: number } | null;
  onNavigatePoint?: (x: number, z: number) => void;
  juroWorldPosRef?: React.RefObject<THREE.Vector3>;
  juroYawRef?: React.RefObject<number>;
}

const MAP_PX = 144;
const BASE_RES = 72;

export const MiniMap: React.FC<MiniMapProps> = ({
  playerX,
  playerZ,
  yaw = 0,
  routeWaypoints = [],
  activeDestination = null,
  onNavigatePoint,
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

      // Active navigation route: dashed golden-orange trail with node markers
      if (routeWaypoints && routeWaypoints.length > 0) {
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(toPx(curX), toPx(curZ));
        for (const wp of routeWaypoints) {
          ctx.lineTo(toPx(wp.x), toPx(wp.z));
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Waypoint circle nodes
        for (const wp of routeWaypoints) {
          const wx = Math.round(toPx(wp.x));
          const wz = Math.round(toPx(wp.z));
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(wx, wz, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#d97706";
          ctx.beginPath();
          ctx.arc(wx, wz, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Destination crosshair / circle
      if (activeDestination) {
        const dx = Math.round(toPx(activeDestination.x));
        const dz = Math.round(toPx(activeDestination.z));
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(dx, dz, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
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

    let animId: number;

    const tick = () => {
      const curX = juroWorldPosRef?.current ? juroWorldPosRef.current.x : playerX;
      const curZ = juroWorldPosRef?.current ? juroWorldPosRef.current.z : playerZ;
      const curYaw = juroYawRef?.current !== undefined ? juroYawRef.current : yaw;
      drawOverlay(curX, curZ, curYaw);

      if (juroWorldPosRef || juroYawRef) {
        animId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [playerX, playerZ, yaw, routeWaypoints, activeDestination, juroWorldPosRef, juroYawRef]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onNavigatePoint) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const wx = (clickX / rect.width) * WORLD_SIZE - HALF_WORLD;
    const wz = (clickY / rect.height) * WORLD_SIZE - HALF_WORLD;
    onNavigatePoint(wx, wz);
  };

  return (
    <div className="relative rounded-2xl border-2 sm:border-[2.5px] border-[#efe8d6] dark:border-neutral-700 bg-[#fbf9f2] dark:bg-neutral-800 p-1 shadow-md select-none pointer-events-auto">
      <canvas
        ref={canvasRef}
        width={MAP_PX}
        height={MAP_PX}
        onClick={handleCanvasClick}
        className="w-[86px] h-[86px] sm:w-[96px] sm:h-[96px] block cursor-crosshair rounded-xl"
        title="Ketuk radar untuk navigasi langsung"
      />
      <span className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 font-pixel text-[7.5px] font-bold text-[#2d3a2f] dark:text-neutral-200 bg-white/90 dark:bg-neutral-900/90 px-1.5 py-0.2 rounded-full border border-black/10 shadow-xs">
        U
      </span>
    </div>
  );
};
