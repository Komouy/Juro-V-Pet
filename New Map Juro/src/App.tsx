import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import { RetroHud } from './components/RetroHud';
import { RetroMapEngine, TelemetrySnapshot } from './map/RetroMapEngine';
import { CameraMode, Landmark, PixelLevel, WeatherMode } from './map/worldData';

const INITIAL_TELEMETRY: TelemetrySnapshot = {
  playerX: -6.2,
  playerZ: 0.2,
  yaw: Math.PI * 0.25,
  isMoving: false,
  currentZone: 'Jembatan Kayu',
  nearestLandmark: null,
  activeTargetLabel: null,
  activeDestination: null,
  routeWaypoints: [],
  remainingMeters: 0,
  etaSeconds: 0,
  bearingLabel: 'U',
  vitals: {
    energy: 84,
    hydration: 78,
    stamina: 92,
    health: 96,
  },
  arrivedLandmark: null,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RetroMapEngine | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const lastArrivedIdRef = useRef<string | null>(null);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(INITIAL_TELEMETRY);
  const [weather, setWeather] = useState<WeatherMode>('cerah');
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [pixelLevel, setPixelLevel] = useState<PixelLevel>('soft');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [arrivedPopup, setArrivedPopup] = useState<Landmark | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new RetroMapEngine(
      container,
      (snap) => {
        setTelemetry(snap);
        if (
          snap.arrivedLandmark &&
          snap.arrivedLandmark.id !== lastArrivedIdRef.current
        ) {
          lastArrivedIdRef.current = snap.arrivedLandmark.id;
          setArrivedPopup(snap.arrivedLandmark);
        } else if (!snap.arrivedLandmark && snap.activeTargetLabel) {
          lastArrivedIdRef.current = null;
          setArrivedPopup(null);
        }
      },
      (lost) => setContextLost(lost),
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard shortcut 'H' to toggle HUD dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  const handleSelectLandmark = useCallback((id: string) => {
    setArrivedPopup(null);
    lastArrivedIdRef.current = null;
    engineRef.current?.navigateToLandmark(id);
  }, []);

  const handleNavigatePoint = useCallback((x: number, z: number) => {
    setArrivedPopup(null);
    lastArrivedIdRef.current = null;
    engineRef.current?.navigateToWorldPoint(x, z);
  }, []);

  const handleCancelRoute = useCallback(() => {
    engineRef.current?.cancelNavigation();
  }, []);

  const handleChangeWeather = useCallback((mode: WeatherMode) => {
    setWeather(mode);
    engineRef.current?.setWeather(mode);
  }, []);

  const handleChangeCamera = useCallback((mode: CameraMode) => {
    setCameraMode(mode);
    engineRef.current?.setCameraMode(mode);
  }, []);

  const handleChangePixelLevel = useCallback((level: PixelLevel) => {
    setPixelLevel(level);
    engineRef.current?.setPixelLevel(level);
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      engineRef.current?.audio.setEnabled(next);
      engineRef.current?.audio.setRainAmbiance(weather === 'hujan' && next);
      if (next) engineRef.current?.audio.playBlip(660);
      return next;
    });
  }, [weather]);

  const handleRecenter = useCallback(() => {
    setCameraMode('follow');
    engineRef.current?.focusCameraOnPlayer();
  }, []);

  const handleToggleGps = useCallback(() => {
    if (gpsActive) {
      if (gpsWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
      engineRef.current?.resetGpsAnchor();
      setGpsActive(false);
      setGpsMessage(null);
      return;
    }

    if (!navigator.geolocation) {
      setGpsMessage('Browser tidak mendukung GPS');
      window.setTimeout(() => setGpsMessage(null), 3000);
      return;
    }

    setGpsActive(true);
    setGpsMessage('Menghubungkan sinyal GPS...');
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsMessage(null);
        engineRef.current?.syncRealGps(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGpsActive(false);
        setGpsMessage('Izin GPS ditolak — gunakan klik peta / WASD');
        window.setTimeout(() => setGpsMessage(null), 3500);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 },
    );
  }, [gpsActive]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#eef7eb]">
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-pointer"
        aria-label="Peta 3D Storybook Interaktif"
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#eef7eb] p-6">
          <div className="soft-panel px-6 py-5 max-w-sm text-center">
            <h1 className="text-sm font-bold text-[#2d3a2f]">
              Memulihkan Render 3D
            </h1>
            <p className="text-xs text-[#5e6e5f] mt-2">
              Konteks WebGL sedang dimuat ulang. Mohon tunggu sebentar atau muat ulang halaman.
            </p>
          </div>
        </div>
      )}

      {/* Subtle Transient GPS Status Toast */}
      {gpsMessage && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-30 soft-panel px-3.5 py-1.5 text-xs text-[#2d3a2f] font-semibold">
          {gpsMessage}
        </div>
      )}

      {/* Semantic Retro HUD Overlay */}
      <RetroHud
        telemetry={telemetry}
        weather={weather}
        gpsActive={gpsActive}
        onNavigatePoint={handleNavigatePoint}
        onCancelRoute={handleCancelRoute}
        onDismissArrival={() => setArrivedPopup(null)}
        arrivedPopup={arrivedPopup}
      />

      {/* Collapsible Bottom Control Dock */}
      <ControlDock
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((p) => !p)}
        activeDestinationName={telemetry.activeTargetLabel}
        nearestLandmarkId={telemetry.nearestLandmark?.id ?? null}
        weather={weather}
        cameraMode={cameraMode}
        pixelLevel={pixelLevel}
        soundEnabled={soundEnabled}
        gpsActive={gpsActive}
        onSelectLandmark={handleSelectLandmark}
        onChangeWeather={handleChangeWeather}
        onChangeCamera={handleChangeCamera}
        onChangePixelLevel={handleChangePixelLevel}
        onToggleSound={handleToggleSound}
        onToggleGps={handleToggleGps}
        onRecenter={handleRecenter}
      />
    </div>
  );
}
