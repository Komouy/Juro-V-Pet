import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Settings,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  RotateCcw,
  Menu,
  X,
  ChevronRight,
  Coins,
  AppWindow,
} from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useUIStore } from "../../stores/uiStore";
import { useGameStore } from "../../stores/gameStore";
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
  const {
    theme,
    soundEnabled,
    toggleTheme,
    toggleSound,
    triggerCameraReset,
  } = useUIStore();
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

  return (
    <header className="sticky top-0 z-50 bg-[#FDFBF7] dark:bg-[#1E2028] border-b-2 border-charcoal dark:border-[#3F424E]">
      <nav className="w-full max-w-6xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-3">
        {/* Console Brand & Power LED */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img
            src="/favicon.svg"
            alt="Logo Juro"
            className="w-6 h-6 object-contain group-hover:scale-105 transition-transform"
          />
          <span className="font-pixel text-sm sm:text-base font-bold text-charcoal dark:text-white tracking-wider uppercase whitespace-nowrap">
            JURO
          </span>
        </Link>

        {/* Desktop Cartridge Channel Tabs */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-[5px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E]">
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
                  relative font-pixel text-xs font-bold uppercase tracking-wide px-3.5 py-1.5 rounded-[3px] transition-all duration-120 select-none whitespace-nowrap shrink-0
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange
                  ${
                    isActive
                      ? "bg-juro-orange text-white border-2 border-charcoal shadow-[0_2px_0_#18181B] dark:border-[#18181B]"
                      : "border-2 border-transparent text-charcoal/70 hover:text-charcoal hover:bg-[#FDFBF7]/70 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-[#1E2028]"
                  }
                `}
              >
                {label}
                {showDot && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-[1px] bg-sky-500 border border-charcoal ml-1.5 align-middle"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Action Cluster (Console Hardware Readouts & Controls) */}
        <div className="flex items-center gap-1.5 relative shrink-0" ref={menuRef}>
          {/* Coin Wallet Readout */}
          <Link
            to="/shop"
            onClick={() => soundEffects.playClick()}
            className="console-btn-bevel inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#EFE9DC] dark:bg-[#101114] border-2 border-charcoal dark:border-[#3F424E] text-charcoal dark:text-neutral-100 hover:border-juro-orange cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Buka Toko & Dompet"
            aria-label={`Saldo: ${coins} Koin`}
          >
            <Coins size={14} className="text-amber-500 shrink-0" />
            <span className="font-mono-hud text-xs sm:text-sm font-bold text-charcoal dark:text-white">
              {coins}
            </span>
          </Link>

          {/* Desktop Pet Glance */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              desktopGlanceService.openDesktopPip();
            }}
            className="console-btn-bevel hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-[4px] bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] dark:shadow-[0_2px_0_#09090B] text-charcoal dark:text-neutral-200 hover:text-juro-orange cursor-pointer transition-colors"
            title="Buka Pet Glance"
            aria-label="Buka Pet Glance Desktop"
          >
            <AppWindow size={15} />
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
            className={`console-btn-bevel w-9 h-9 rounded-[4px] border-2 border-charcoal dark:border-[#3F424E] shadow-[0_2px_0_#18181B] dark:shadow-[0_2px_0_#09090B] cursor-pointer transition-colors inline-flex items-center justify-center ${
              isMenuOpen
                ? "bg-juro-orange text-white"
                : "bg-[#FDFBF7] text-charcoal hover:bg-[#EFE9DC] dark:bg-[#1E2028] dark:text-neutral-200 dark:hover:bg-[#272A35]"
            }`}
          >
            {isMenuOpen ? <X size={16} strokeWidth={2.4} /> : <Menu size={16} strokeWidth={2.4} />}
          </button>

          {/* Console Control Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-60 bg-[#FDFBF7] dark:bg-[#1E2028] border-2 border-charcoal dark:border-[#4A4E5E] rounded-[6px] shadow-[4px_4px_0_#18181B] dark:shadow-[4px_4px_0_#09090B] p-1.5 z-50 flex flex-col gap-0.5 animate-tray-enter select-none">
              {/* Pet Glance */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  desktopGlanceService.openDesktopPip();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-left hover:bg-[#EFE9DC] dark:hover:bg-[#101114] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AppWindow size={15} className="text-juro-orange shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-charcoal dark:text-neutral-100 truncate">
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-left hover:bg-[#EFE9DC] dark:hover:bg-[#101114] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RotateCcw size={15} className="text-juro-orange shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-charcoal dark:text-neutral-100 truncate">
                    Reset Kamera
                  </span>
                </div>
              </button>

              {/* Efek Suara */}
              <button
                type="button"
                onClick={handleToggleSound}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-left hover:bg-[#EFE9DC] dark:hover:bg-[#101114] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {soundEnabled ? (
                    <Volume2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <VolumeX size={15} className="text-neutral-400 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-semibold text-charcoal dark:text-neutral-100 truncate">
                    Suara
                  </span>
                </div>
                <span
                  className={`font-pixel text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[2px] border ${
                    soundEnabled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-neutral-200 text-neutral-600 border-neutral-400 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {soundEnabled ? "ON" : "OFF"}
                </span>
              </button>

              {/* Tema */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-left hover:bg-[#EFE9DC] dark:hover:bg-[#101114] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {theme === "dark" ? (
                    <Moon size={15} className="text-indigo-400 shrink-0" />
                  ) : (
                    <Sun size={15} className="text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-semibold text-charcoal dark:text-neutral-100 truncate">
                    Tema
                  </span>
                </div>
                <span className="font-pixel text-[10px] font-bold uppercase text-charcoal/70 dark:text-neutral-300">
                  {theme === "dark" ? "Gelap" : "Terang"}
                </span>
              </button>

              <div className="border-t-2 border-dashed border-charcoal/20 dark:border-[#3F424E] my-1" />

              {/* Pengaturan */}
              <Link
                to="/settings"
                onClick={() => {
                  soundEffects.playTab();
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-left transition-colors cursor-pointer ${
                  location.pathname === "/settings"
                    ? "bg-juro-orange text-white border border-charcoal"
                    : "hover:bg-[#EFE9DC] dark:hover:bg-[#101114] text-charcoal dark:text-neutral-100"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Settings
                    size={15}
                    className={
                      location.pathname === "/settings"
                        ? "text-white shrink-0"
                        : "text-charcoal/70 dark:text-neutral-300 shrink-0"
                    }
                  />
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    Pengaturan
                  </span>
                </div>
                <ChevronRight
                  size={14}
                  className={
                    location.pathname === "/settings"
                      ? "text-white shrink-0"
                      : "text-neutral-400 shrink-0"
                  }
                />
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
