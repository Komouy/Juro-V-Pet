import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Settings,
  Sun,
  Sunset,
  Moon,
  CloudRain,
  Volume2,
  VolumeX,
  RotateCcw,
  Users,
  Menu,
  X,
  ChevronRight,
  Coins,
  AppWindow,
} from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useUIStore } from "../../stores/uiStore";
import { useGameStore } from "../../stores/gameStore";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { desktopGlanceService } from "../../services/desktopGlanceService";

const NAV_LINKS = [
  { path: "/", label: "Home" },
  { path: "/shop", label: "Toko" },
  { path: "/mine", label: "Tambang" },
  { path: "/evolution", label: "Evolusi" },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, soundEnabled, weather, toggleTheme, toggleSound, toggleWeather, triggerCameraReset } = useUIStore();
  const { myProfile, partnerProfile, openHubModal } = useCaregiverStore();
  const coins = useGameStore((s) => s.coins);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tutup menu saat klik di luar atau menekan tombol Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const hasCrystals = useGameStore(
    (s) =>
      (s.crystals.quartz ?? 0) +
        (s.crystals.amber ?? 0) +
        (s.crystals.emerald ?? 0) +
        (s.crystals.amethyst ?? 0) >
      0
  );

  const handleResetCamera = () => {
    soundEffects.playClick();
    triggerCameraReset();
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleToggleSound = () => {
    soundEffects.unlockAudio();
    if (!soundEnabled) {
      toggleSound();
      soundEffects.playToggle(true);
    } else {
      soundEffects.playToggle(false);
      toggleSound();
    }
  };

  const handleToggleTheme = () => {
    soundEffects.playToggle(theme === "dark");
    toggleTheme();
  };

  const handleToggleWeather = () => {
    soundEffects.playClick();
    toggleWeather();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200/80 dark:border-neutral-800">
      <nav className="w-full max-w-6xl mx-auto px-3.5 sm:px-5 h-13 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img
            src="/favicon.svg"
            alt="Logo Juro"
            className="w-6 h-6 object-contain group-hover:scale-105 transition-transform"
          />
          <span className="text-base font-bold text-neutral-900 dark:text-white tracking-tight whitespace-nowrap">
            Juro
          </span>
        </Link>

        {/* Desktop Center Segmented Nav */}
        <div className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/90">
          {NAV_LINKS.map(({ path, label }) => {
            const isActive = location.pathname === path;
            const showDot = path === "/shop" && hasCrystals && !isActive;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => {
                  if (!isActive) soundEffects.playTab();
                }}
                className={`
                  relative text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-lg transition-all duration-150 select-none whitespace-nowrap shrink-0
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange
                  ${
                    isActive
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }
                `}
              >
                {label}
                {showDot && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 ml-1.5 align-middle"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Action Cluster (Unified Minimalist Row) */}
        <div className="flex items-center gap-1 relative shrink-0" ref={menuRef}>
          {/* Coin Wallet */}
          <Link
            to="/shop"
            onClick={() => soundEffects.playClick()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-[0.98] cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Buka Toko & Dompet"
            aria-label={`Saldo: ${coins} Koin`}
          >
            <Coins size={15} className="text-amber-500 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
              {coins}
            </span>
          </Link>

          <span className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-0.5" aria-hidden="true" />

          {/* Caregiver Hub */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              openHubModal();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-[0.98] cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Buku Asuh & 2P"
            aria-label="Buka Hub Perawat Juro"
          >
            <Users size={15} className="text-juro-orange shrink-0" />
            <span className="text-xs sm:text-sm font-medium max-w-[76px] sm:max-w-[120px] truncate">
              {myProfile?.name || "Perawat"}
            </span>
            {partnerProfile && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                · 2P
              </span>
            )}
          </button>

          {/* Desktop Pet Glance */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              desktopGlanceService.openDesktopPip();
            }}
            className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-juro-orange active:scale-[0.98] cursor-pointer transition-colors"
            title="Buka Pet Glance"
            aria-label="Buka Pet Glance Desktop"
          >
            <AppWindow size={16} />
          </button>

          {/* Menu Dropdown Trigger */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              setIsMenuOpen((prev) => !prev);
            }}
            aria-expanded={isMenuOpen}
            aria-label="Buka menu kontrol & pengaturan"
            title="Menu"
            className={`w-8 h-8 rounded-lg cursor-pointer transition-colors active:scale-[0.98] inline-flex items-center justify-center ${
              isMenuOpen
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            {isMenuOpen ? <X size={17} strokeWidth={2} /> : <Menu size={17} strokeWidth={2} />}
          </button>

          {/* Minimalist Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-tray-enter select-none">
              {/* Pet Glance (always accessible on mobile & desktop) */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  desktopGlanceService.openDesktopPip();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AppWindow size={15} className="text-juro-orange shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                    Pet Glance
                  </span>
                </div>
              </button>

              {/* Reset Kamera */}
              <button
                type="button"
                onClick={() => {
                  handleResetCamera();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RotateCcw size={15} className="text-juro-orange shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                    Reset Kamera
                  </span>
                </div>
              </button>

              {/* Efek Suara */}
              <button
                type="button"
                onClick={handleToggleSound}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {soundEnabled ? (
                    <Volume2 size={15} className="text-emerald-500 shrink-0" />
                  ) : (
                    <VolumeX size={15} className="text-neutral-400 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                    Suara
                  </span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    soundEnabled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-400"
                  }`}
                >
                  {soundEnabled ? "Aktif" : "Mati"}
                </span>
              </button>

              {/* Tema */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {theme === "dark" ? (
                    <Moon size={15} className="text-indigo-400 shrink-0" />
                  ) : (
                    <Sun size={15} className="text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                    Tema
                  </span>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {theme === "dark" ? "Gelap" : "Terang"}
                </span>
              </button>

              {/* Waktu & Cuaca */}
              <button
                type="button"
                onClick={handleToggleWeather}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {weather === "senja" ? (
                    <Sunset size={15} className="text-orange-500 shrink-0" />
                  ) : weather === "malam" ? (
                    <Moon size={15} className="text-blue-400 shrink-0" />
                  ) : weather === "hujan" || weather === "rain" ? (
                    <CloudRain size={15} className="text-sky-400 shrink-0" />
                  ) : (
                    <Sun size={15} className="text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                    Suasana
                  </span>
                </div>
                <span className="text-xs font-medium text-juro-orange">
                  {weather === "auto"
                    ? "Auto"
                    : weather === "cerah" || weather === "clear"
                    ? "Siang"
                    : weather === "senja"
                    ? "Sore"
                    : weather === "malam"
                    ? "Malam"
                    : "Hujan"}
                </span>
              </button>

              <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />

              {/* Pengaturan */}
              <Link
                to="/settings"
                onClick={() => {
                  soundEffects.playTab();
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  location.pathname === "/settings"
                    ? "bg-orange-50 dark:bg-orange-500/15 text-juro-orange"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-100"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Settings
                    size={15}
                    className={
                      location.pathname === "/settings"
                        ? "text-juro-orange shrink-0"
                        : "text-neutral-500 dark:text-neutral-300 shrink-0"
                    }
                  />
                  <span className="text-xs sm:text-sm font-medium truncate">
                    Pengaturan
                  </span>
                </div>
                <ChevronRight size={14} className="text-neutral-400 shrink-0" />
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
