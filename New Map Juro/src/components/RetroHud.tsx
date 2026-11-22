import React from 'react';
import {
  CloudRain,
  Compass,
  Droplets,
  Flame,
  Heart,
  MapPin,
  Moon,
  Navigation,
  Sun,
  Sunset,
  Utensils,
  X,
} from 'lucide-react';
import { TelemetrySnapshot } from '../map/RetroMapEngine';
import { LANDMARKS, Landmark, WeatherMode } from '../map/worldData';
import { MiniMap } from './MiniMap';

interface RetroHudProps {
  telemetry: TelemetrySnapshot;
  weather: WeatherMode;
  gpsActive: boolean;
  onNavigatePoint: (x: number, z: number) => void;
  onCancelRoute: () => void;
  onDismissArrival: () => void;
  arrivedPopup: Landmark | null;
}

const WEATHER_LABELS: Record<WeatherMode, { label: string; icon: React.ReactNode }> = {
  cerah: { label: 'CERAH', icon: <Sun className="w-3.5 h-3.5 text-[#e69b28]" /> },
  hujan: { label: 'HUJAN', icon: <CloudRain className="w-3.5 h-3.5 text-[#429fd4]" /> },
  senja: { label: 'SENJA', icon: <Sunset className="w-3.5 h-3.5 text-[#e87846]" /> },
  malam: { label: 'MALAM', icon: <Moon className="w-3.5 h-3.5 text-[#5b77bd]" /> },
};

export const RetroHud: React.FC<RetroHudProps> = ({
  telemetry,
  weather,
  gpsActive,
  onNavigatePoint,
  onCancelRoute,
  onDismissArrival,
  arrivedPopup,
}) => {
  const weatherMeta = WEATHER_LABELS[weather];

  const vitalBars = [
    {
      label: 'Energi',
      val: telemetry.vitals.energy,
      color: '#f28b42',
      icon: <Utensils className="w-3 h-3 text-[#e07428]" />,
    },
    {
      label: 'Stamina',
      val: telemetry.vitals.stamina,
      color: '#8f7cf5',
      icon: <Flame className="w-3 h-3 text-[#7c69e0]" />,
    },
    {
      label: 'Sehat',
      val: telemetry.vitals.health,
      color: '#eb6c8c',
      icon: <Heart className="w-3 h-3 text-[#db5679]" />,
    },
    {
      label: 'Hidrasi',
      val: telemetry.vitals.hydration,
      color: '#4baee8',
      icon: <Droplets className="w-3 h-3 text-[#389ad4]" />,
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 p-3 sm:p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Soft Storybook Vitals & Zone Readout */}
        <div className="pointer-events-auto soft-panel px-3 py-2.5 w-[216px] sm:w-[240px]">
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5">
            {vitalBars.map((b) => (
              <div key={b.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="shrink-0">
                  {b.icon}
                </span>
                <div
                  className="flex-1 h-2.5 bg-[#ebe3d0] border border-[#c9bfa8] rounded-full overflow-hidden"
                  title={`${b.label}: ${b.val}%`}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-150"
                    style={{ width: `${b.val}%`, backgroundColor: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 pt-1.5 border-t border-[#e3dac6] flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#2d3a2f] truncate">
              {telemetry.currentZone}
            </span>
            <span className="font-mono-tabular text-[10px] text-[#6d7a6c] shrink-0">
              {telemetry.playerX.toFixed(0)},{telemetry.playerZ.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Top-Center: Active Turn-by-Turn Navigation or Arrival Banner */}
        <div className="hidden md:flex flex-col items-center gap-2 max-w-md">
          {telemetry.activeTargetLabel ? (
            <div className="pointer-events-auto soft-panel px-4 py-2 flex items-center gap-3">
              <Navigation className="w-4 h-4 text-[#e08b26] shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#2d3a2f] truncate">
                  Menuju {telemetry.activeTargetLabel}
                </div>
                <div className="font-mono-tabular text-[11px] text-[#5e6e5f] flex items-center gap-2">
                  <span>{telemetry.remainingMeters.toFixed(1)} m</span>
                  <span aria-hidden="true">·</span>
                  <span>{Math.max(1, Math.ceil(telemetry.etaSeconds))} dtk</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Compass className="w-3 h-3 text-[#d9822b]" />
                    {telemetry.bearingLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancelRoute}
                className="soft-btn bg-[#f5efe0] hover:bg-[#ebe1cb] text-[#3a473b] p-1.5 cursor-pointer shrink-0"
                title="Batalkan navigasi"
                aria-label="Batalkan navigasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : arrivedPopup ? (
            <div className="pointer-events-auto soft-panel px-4 py-2.5 flex items-start gap-3">
              <MapPin
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: arrivedPopup.color }}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#2d3a2f]">
                  Tiba di {arrivedPopup.name}
                </div>
                <p className="text-xs text-[#5b695c] leading-snug mt-0.5">
                  {arrivedPopup.description}
                </p>
              </div>
              <button
                type="button"
                onClick={onDismissArrival}
                className="text-[#6d7a6c] hover:text-[#2d3a2f] p-1 cursor-pointer shrink-0"
                aria-label="Tutup info lokasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="soft-panel px-3.5 py-1.5 text-[11px] text-[#4c5c4d] flex items-center gap-2">
              <span className="font-semibold text-[#2d3a2f]">
                Klik jalan atau radar untuk navigasi
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-[10px] text-[#6d7a6c]">
                WASD / Panah · {LANDMARKS.length} Lokasi
              </span>
            </div>
          )}
        </div>

        {/* Top-Right: Weather Status & Clickable Soft Radar Mini-Map */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="soft-panel px-3 py-1.5 flex items-center gap-2">
            {weatherMeta.icon}
            <span className="font-pixel text-[10px] tracking-wide text-[#2d3a2f] whitespace-nowrap">
              {weatherMeta.label}
            </span>
            {gpsActive && (
              <>
                <span aria-hidden="true" className="text-[#a5b0a2]">
                  ·
                </span>
                <span className="font-mono-tabular text-[10px] font-semibold text-[#2d8a4e] whitespace-nowrap">
                  GPS
                </span>
              </>
            )}
          </div>

          <div className="soft-panel p-1.5 hidden sm:block">
            <MiniMap
              playerX={telemetry.playerX}
              playerZ={telemetry.playerZ}
              yaw={telemetry.yaw}
              routeWaypoints={telemetry.routeWaypoints}
              activeDestination={telemetry.activeDestination}
              onNavigatePoint={onNavigatePoint}
            />
          </div>
        </div>
      </div>

      {/* Mobile Compact Route Banner */}
      {telemetry.activeTargetLabel && (
        <div className="md:hidden self-center mt-2 pointer-events-auto soft-panel px-3 py-1.5 flex items-center gap-2.5">
          <Navigation className="w-3.5 h-3.5 text-[#e08b26] shrink-0" />
          <span className="text-xs font-semibold text-[#2d3a2f] truncate max-w-[150px]">
            {telemetry.activeTargetLabel}
          </span>
          <span className="font-mono-tabular text-[10px] text-[#5e6e5f]">
            {telemetry.remainingMeters.toFixed(0)}m
          </span>
          <button
            type="button"
            onClick={onCancelRoute}
            className="text-[#2d3a2f] p-0.5 cursor-pointer"
            aria-label="Batalkan rute"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
