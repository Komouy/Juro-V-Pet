import React, { useEffect, useRef } from 'react';
import { WorldPoint } from '../map/pathfinding';
import {
  HALF_WORLD,
  LANDMARKS,
  WORLD_SIZE,
  grassPatchFactor,
  groundHeightAt,
  isBridgeDeck,
  isInCanalOrPond,
  isOnCobblePath,
  isOnTrail,
} from '../map/worldData';

interface MiniMapProps {
  playerX: number;
  playerZ: number;
  yaw: number;
  routeWaypoints: WorldPoint[];
  activeDestination: WorldPoint | null;
  onNavigatePoint: (x: number, z: number) => void;
}

const MAP_PX = 144;
const BASE_RES = 72;

export const MiniMap: React.FC<MiniMapProps> = ({
  playerX,
  playerZ,
  yaw,
  routeWaypoints,
  activeDestination,
  onNavigatePoint,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseTerrainRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const off = document.createElement('canvas');
    off.width = BASE_RES;
    off.height = BASE_RES;
    const ctx = off.getContext('2d')!;

    for (let gz = 0; gz < BASE_RES; gz++) {
      for (let gx = 0; gx < BASE_RES; gx++) {
        const wx = gx - HALF_WORLD + 0.5;
        const wz = gz - HALF_WORLD + 0.5;

        if (isBridgeDeck(wx, wz)) {
          ctx.fillStyle = '#cf924a';
        } else if (isInCanalOrPond(wx, wz)) {
          ctx.fillStyle = '#52b6f0';
        } else if (isOnTrail(wx, wz)) {
          ctx.fillStyle = '#f2cb77';
        } else if (isOnCobblePath(wx, wz)) {
          ctx.fillStyle = '#dfd3bd';
        } else {
          const patch = grassPatchFactor(wx, wz);
          const h = groundHeightAt(wx, wz);
          if (h > 1.7) ctx.fillStyle = '#97d464';
          else if (patch > 0.35) ctx.fillStyle = '#6db246';
          else ctx.fillStyle = '#85c758';
        }
        ctx.fillRect(gx, gz, 1, 1);
      }
    }
    baseTerrainRef.current = off;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const base = baseTerrainRef.current;
    if (!canvas || !base) return;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, MAP_PX, MAP_PX);
    ctx.drawImage(base, 0, 0, MAP_PX, MAP_PX);

    const toPx = (val: number) => ((val + HALF_WORLD) / WORLD_SIZE) * MAP_PX;

    // Subtle soft grid lines
    ctx.strokeStyle = 'rgba(58, 76, 56, 0.1)';
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

    // Active navigation route
    if (routeWaypoints.length > 0) {
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(toPx(playerX), toPx(playerZ));
      for (const wp of routeWaypoints) {
        ctx.lineTo(toPx(wp.x), toPx(wp.z));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Destination crosshair
    if (activeDestination) {
      const dx = Math.round(toPx(activeDestination.x));
      const dz = Math.round(toPx(activeDestination.z));
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(dx, dz, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Landmarks
    for (const lm of LANDMARKS) {
      const lx = Math.round(toPx(lm.position.x));
      const lz = Math.round(toPx(lm.position.z));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lx, lz, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(lx, lz, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Explorer directional arrow
    const px = toPx(playerX);
    const pz = toPx(playerZ);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-yaw + Math.PI);
    ctx.fillStyle = '#2d3a2f';
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f28b42';
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.lineTo(3.5, 3.5);
    ctx.lineTo(0, 1.5);
    ctx.lineTo(-3.5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [playerX, playerZ, yaw, routeWaypoints, activeDestination]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const nz = (e.clientY - rect.top) / rect.height;
    const wx = nx * WORLD_SIZE - HALF_WORLD;
    const wz = nz * WORLD_SIZE - HALF_WORLD;
    onNavigatePoint(wx, wz);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={MAP_PX}
        height={MAP_PX}
        onClick={handleClick}
        title="Klik pada radar untuk navigasi langsung"
        className="block w-[136px] h-[136px] sm:w-[144px] sm:h-[144px] cursor-crosshair rounded-lg border-2 border-[#d5ccb8]"
      />
      <span className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 font-pixel text-[9px] text-[#2d3a2f] bg-white/85 px-1.5 rounded">
        U
      </span>
    </div>
  );
};
