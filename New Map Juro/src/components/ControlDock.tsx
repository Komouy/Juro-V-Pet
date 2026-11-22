import React from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Crosshair,
  Grid,
  LocateFixed,
  MapPin,
  Moon,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CameraMode,
  LANDMARKS,
  PixelLevel,
  WeatherMode,
} from '../map/worldData';

interface ControlDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeDestinationName: string | null;
  nearestLandmarkId: string | null;
  weather: WeatherMode;
  cameraMode: CameraMode;
  pixelLevel: PixelLevel;
  soundEnabled: boolean;
  gpsActive: boolean;
  onSelectLandmark: (id: string) => void;
  onChangeWeather: (mode: WeatherMode) => void;
  onChangeCamera: (mode: CameraMode) => void;
  onChangePixelLevel: (level: PixelLevel) => void;
  onToggleSound: () => void;
  onToggleGps: () => void;
  onRecenter: () => void;
}

const WEATHER_OPTIONS: Array<{
  id: WeatherMode;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'cerah', label: 'Cerah', icon: <Sun className="w-3.5 h-3.5" /> },
  { id: 'hujan', label: 'Hujan', icon: <CloudRain className="w-3.5 h-3.5" /> },
  { id: 'senja', label: 'Senja', icon: <Sunset className="w-3.5 h-3.5" /> },
  { id: 'malam', label: 'Malam', icon: <Moon className="w-3.5 h-3.5" /> },
];

const CAMERA_OPTIONS: Array<{ id: CameraMode; label: string }> = [
  { id: 'follow', label: 'Ikuti' },
  { id: 'isometric', label: 'Isometrik' },
  { id: 'orbit', label: 'Bebas' },
];

const PIXEL_OPTIONS: Array<{ id: PixelLevel; label: string }> = [
  { id: 'soft', label: 'Lembut' },
  { id: 'crisp', label: 'Piksel 2x' },
  { id: 'retro', label: 'Retro 3x' },
];

export const ControlDock: React.FC<ControlDockProps> = ({
  collapsed,
  onToggleCollapse,
  activeDestinationName,
  nearestLandmarkId,
  weather,
  cameraMode,
  pixelLevel,
  soundEnabled,
  gpsActive,
  onSelectLandmark,
  onChangeWeather,
  onChangeCamera,
  onChangePixelLevel,
  onToggleSound,
  onToggleGps,
  onRecenter,
}) => {
  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(940px,95vw)] flex flex-col items-center">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="pointer-events-auto soft-panel px-3.5 py-1 mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#2d3a2f] hover:text-[#3d7a36] cursor-pointer whitespace-nowrap"
        title="Tekan H untuk sembunyikan/tampilkan kontrol"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Tampilkan Kontrol (H)</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Sembunyikan Kontrol (H)</span>
          </>
        )}
      </button>

      {!collapsed && (
        <div className="pointer-events-auto soft-panel w-full px-3 py-2.5 flex flex-col gap-2">
          {/* Row 1: Landmark Real-Time Navigation Destinations */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <span className="text-[11px] font-semibold text-[#6b786a] whitespace-nowrap shrink-0 mr-1">
              Rute:
            </span>
            {LANDMARKS.map((lm) => {
              const isTarget = activeDestinationName === lm.name;
              const isHere = !activeDestinationName && nearestLandmarkId === lm.id;
              return (
                <button
                  key={lm.id}
                  type="button"
                  onClick={() => onSelectLandmark(lm.id)}
                  className={`soft-btn px-2.5 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    isTarget
                      ? 'bg-[#f4cd7d] text-[#2d2412] border-[#d69e3a]'
                      : isHere
                        ? 'bg-[#e5f3d8] text-[#2a5426] border-[#82b552]'
                        : 'bg-[#f9f5ea] text-[#334034] hover:bg-[#f0ebd9]'
                  }`}
                >
                  <MapPin
                    className="w-3 h-3 shrink-0"
                    style={{ color: isTarget ? '#784e12' : lm.color }}
                  />
                  <span className="font-medium">{lm.name}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Weather Blend, Camera, Render Style, GPS & Audio */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#e5dcc9]">
            <div className="flex items-center gap-1">
              {WEATHER_OPTIONS.map((opt) => {
                const active = weather === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeWeather(opt.id)}
                    className={`soft-btn px-2.5 py-1 text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#e5f3d8] text-[#2a5426] border-[#82b552] font-semibold'
                        : 'bg-[#f9f5ea] text-[#4b594c] hover:bg-[#f0ebd9]'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {/* Camera Switch */}
              <div className="flex items-center bg-[#f2ecdc] border border-[#d5ccb8] rounded-[10px] p-0.5 shrink-0">
                <Camera className="w-3.5 h-3.5 text-[#6b786a] mx-1.5 shrink-0" />
                {CAMERA_OPTIONS.map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onChangeCamera(cam.id)}
                    className={`px-2 py-0.5 rounded-[7px] text-[11px] whitespace-nowrap cursor-pointer ${
                      cameraMode === cam.id
                        ? 'bg-white text-[#2d3a2f] font-semibold shadow-sm'
                        : 'text-[#627063] hover:text-[#2d3a2f]'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              {/* Render Style Switch */}
              <div className="flex items-center bg-[#f2ecdc] border border-[#d5ccb8] rounded-[10px] p-0.5 shrink-0">
                <Grid className="w-3.5 h-3.5 text-[#6b786a] mx-1.5 shrink-0" />
                {PIXEL_OPTIONS.map((px) => (
                  <button
                    key={px.id}
                    type="button"
                    onClick={() => onChangePixelLevel(px.id)}
                    className={`px-2 py-0.5 rounded-[7px] text-[11px] whitespace-nowrap cursor-pointer ${
                      pixelLevel === px.id
                        ? 'bg-white text-[#2d3a2f] font-semibold shadow-sm'
                        : 'text-[#627063] hover:text-[#2d3a2f]'
                    }`}
                  >
                    {px.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onRecenter}
                className="soft-btn px-2 py-1 text-[11px] bg-[#f9f5ea] text-[#334034] hover:bg-[#f0ebd9] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="Fokus kamera ke karakter"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Fokus</span>
              </button>

              <button
                type="button"
                onClick={onToggleGps}
                className={`soft-btn px-2 py-1 text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  gpsActive
                    ? 'bg-[#dcfce7] text-[#166534] border-[#4ade80] font-semibold'
                    : 'bg-[#f9f5ea] text-[#334034] hover:bg-[#f0ebd9]'
                }`}
                title="Sinkronisasi lokasi GPS real-time"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>GPS</span>
              </button>

              <button
                type="button"
                onClick={onToggleSound}
                className={`soft-btn px-2 py-1 text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  soundEnabled
                    ? 'bg-[#f4cd7d] text-[#2d2412] border-[#d69e3a]'
                    : 'bg-[#f9f5ea] text-[#6b786a] hover:text-[#2d3a2f]'
                }`}
                title="Suara efek"
                aria-label="Suara efek"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
