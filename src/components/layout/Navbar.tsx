import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Settings,
  Sun,
  Moon,
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
  const { theme, soundEnabled, toggleTheme, toggleSound, triggerCameraReset } = useUIStore();
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

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-dark-surface/95 border-b-2 border-charcoal dark:border-neutral-700 backdrop-blur-xs">
      <nav className="w-full max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img
            src="/favicon.svg"
            alt="Logo Juro"
            className="w-7 h-7 object-contain [image-rendering:pixelated] group-hover:scale-105 transition-transform"
          />
          <span className="pixel-text text-base font-bold text-charcoal dark:text-white tracking-wider">
            JURO
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
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
                  relative pixel-text text-[11px] px-3 py-1.5 border-2 transition-all duration-75 select-none
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange
                  ${
                    isActive
                      ? "bg-juro-orange text-white border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000]"
                      : "bg-transparent text-muted hover:text-charcoal border-transparent hover:border-charcoal hover:bg-warm-white dark:hover:bg-neutral-800 dark:hover:text-white"
                  }
                `}
              >
                {label}
                {showDot && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 bg-sky-400 border border-charcoal"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Action Controls: Wallet Pill + Caregiver Badge + ListButton Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative" ref={menuRef}>
          {/* Retro Coin Wallet Pill */}
          <Link
            to="/shop"
            onClick={() => soundEffects.playClick()}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 border-2 border-charcoal dark:border-neutral-600 bg-warm-white dark:bg-neutral-800 text-charcoal dark:text-neutral-100 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-amber-500 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
            title="Buka Toko & Dompet"
            aria-label={`Saldo: ${coins} Koin`}
          >
            <Coins size={13} className="text-amber-500 shrink-0" />
            <span className="pixel-text text-[9px] sm:text-[9.5px] font-bold text-amber-600 dark:text-amber-400">
              {coins}
            </span>
          </Link>

          {/* Caregiver Hub Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              openHubModal();
            }}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 border-2 border-charcoal dark:border-neutral-600 bg-amber-50 dark:bg-neutral-800 text-charcoal dark:text-neutral-100 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:bg-amber-100 dark:hover:bg-neutral-700 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
            title="Buku Asuh & 2P"
            aria-label="Buka Hub Perawat Juro"
          >
            <Users size={13} className="text-juro-orange shrink-0" />
            <span className="pixel-text text-[9px] uppercase font-bold tracking-tight max-w-[64px] sm:max-w-none truncate">
              {myProfile?.name || "Perawat"}
            </span>
            {partnerProfile && (
              <span className="px-1 py-0.2 bg-emerald-500 text-white pixel-text text-[7px] uppercase font-bold border border-charcoal shrink-0">
                2P
              </span>
            )}
          </button>

          {/* Desktop Pet Glance Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              desktopGlanceService.openDesktopPip();
            }}
            className="hidden sm:flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 border-2 border-charcoal dark:border-neutral-600 bg-warm-white dark:bg-neutral-800 text-charcoal dark:text-neutral-100 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:border-juro-orange active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
            title="Buka Pet Glance (Mini Desktop Companion)"
            aria-label="Buka Pet Glance Desktop"
          >
            <AppWindow size={13} className="text-juro-orange shrink-0" />
            <span className="pixel-text text-[9px] uppercase font-bold tracking-tight">
              Glance
            </span>
          </button>

          {/* Single Menu Dropdown Toggle Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              setIsMenuOpen((prev) => !prev);
            }}
            aria-expanded={isMenuOpen}
            aria-label="Buka menu navigasi & pengaturan"
            title="Menu"
            className={`p-2 border-2 border-charcoal dark:border-neutral-600 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center ${
              isMenuOpen
                ? "bg-juro-orange text-white"
                : "bg-white dark:bg-neutral-800 text-charcoal dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
          >
            {isMenuOpen ? <X size={15} strokeWidth={2.5} /> : <Menu size={15} strokeWidth={2.5} />}
          </button>

          {/* ListButton Dropdown Menu Card */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-warm-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-600 shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#000000] p-1.5 z-50 flex flex-col gap-1 animate-scale-up select-none">
              {/* Mobile-Only Page Navigation Links */}
              <div className="md:hidden flex flex-col gap-1 pb-1 mb-1 border-b border-charcoal/20 dark:border-neutral-700">
                <span className="pixel-text text-[8px] uppercase font-bold text-neutral-400 px-1">
                  Halaman
                </span>
                {NAV_LINKS.map(({ path, label }) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => {
                        soundEffects.playTab();
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left border border-charcoal/20 hover:border-charcoal transition-colors cursor-pointer ${
                        isActive
                          ? "bg-juro-orange text-white font-bold"
                          : "bg-white dark:bg-neutral-800 text-charcoal dark:text-white hover:bg-amber-50 dark:hover:bg-neutral-700"
                      }`}
                    >
                      <span className="pixel-text text-[9.5px] uppercase font-bold">
                        {label}
                      </span>
                      <ChevronRight size={13} className={isActive ? "text-white" : "text-neutral-400"} />
                    </Link>
                  );
                })}
              </div>

              <div className="px-2 py-0.5 flex items-center justify-between mb-0.5">
                <span className="pixel-text text-[8px] uppercase font-bold text-neutral-400">
                  Opsi Cepat
                </span>
              </div>

              {/* Item 0: Pet Glance Desktop / Mini Companion */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  desktopGlanceService.openDesktopPip();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-left bg-white dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-neutral-700 border border-charcoal/20 hover:border-charcoal transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AppWindow size={14} className="text-juro-orange shrink-0" />
                  <span className="pixel-text text-[9.5px] uppercase font-bold text-charcoal dark:text-white truncate">
                    Pet Glance
                  </span>
                </div>
                <span className="pixel-text text-[7.5px] uppercase px-1.5 py-0.5 bg-juro-orange/15 text-juro-orange border border-charcoal/30">
                  Mini
                </span>
              </button>

              {/* Item 1: Reset Sudut Kamera */}
              <button
                type="button"
                onClick={() => {
                  handleResetCamera();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-left bg-white dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-neutral-700 border border-charcoal/20 hover:border-charcoal transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RotateCcw size={14} className="text-juro-orange shrink-0" />
                  <span className="pixel-text text-[9.5px] uppercase font-bold text-charcoal dark:text-white truncate">
                    Reset Kamera
                  </span>
                </div>
              </button>

              {/* Item 2: Suara (Toggle) */}
              <button
                type="button"
                onClick={handleToggleSound}
                className="w-full flex items-center justify-between px-2.5 py-2 text-left bg-white dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-neutral-700 border border-charcoal/20 hover:border-charcoal transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {soundEnabled ? (
                    <Volume2 size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <VolumeX size={14} className="text-neutral-400 shrink-0" />
                  )}
                  <span className="pixel-text text-[9.5px] uppercase font-bold text-charcoal dark:text-white truncate">
                    Efek Suara
                  </span>
                </div>
                <span
                  className={`pixel-text text-[8px] uppercase font-bold px-1.5 py-0.5 border border-charcoal ${
                    soundEnabled
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
                  }`}
                >
                  {soundEnabled ? "ON" : "OFF"}
                </span>
              </button>

              {/* Item 3: Mode Tema (Toggle) */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className="w-full flex items-center justify-between px-2.5 py-2 text-left bg-white dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-neutral-700 border border-charcoal/20 hover:border-charcoal transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {theme === "dark" ? (
                    <Moon size={14} className="text-indigo-400 shrink-0" />
                  ) : (
                    <Sun size={14} className="text-amber-500 shrink-0" />
                  )}
                  <span className="pixel-text text-[9.5px] uppercase font-bold text-charcoal dark:text-white truncate">
                    Tema Tampilan
                  </span>
                </div>
              </button>

              <div className="border-t border-charcoal/20 dark:border-neutral-700 my-0.5" />

              {/* Item 4: Pengaturan Lengkap */}
              <Link
                to="/settings"
                onClick={() => {
                  soundEffects.playTab();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-left bg-white dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-neutral-700 border border-charcoal/20 hover:border-charcoal transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Settings size={14} className="text-neutral-600 dark:text-neutral-300 shrink-0" />
                  <span className="pixel-text text-[9.5px] uppercase font-bold text-charcoal dark:text-white truncate">
                    Pengaturan
                  </span>
                </div>
                <ChevronRight size={13} className="text-neutral-400 shrink-0" />
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
