import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Settings, Sun, Moon, Volume2, VolumeX, RotateCcw, Users } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useUIStore } from "../../stores/uiStore";
import { useGameStore } from "../../stores/gameStore";
import { useCaregiverStore } from "../../stores/caregiverStore";

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
        <Link to="/" className="flex items-center gap-2 group">
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

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Caregiver Hub Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              openHubModal();
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 border-2 border-charcoal dark:border-neutral-600 bg-amber-50 dark:bg-neutral-800 text-charcoal dark:text-neutral-100 shadow-[2px_2px_0px_#171717] dark:shadow-[2px_2px_0px_#000000] hover:bg-amber-100 dark:hover:bg-neutral-700 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-colors"
            title="Buku Asuh & Kemitraan 2 Perawat"
            aria-label="Buka Hub Perawat Juro"
          >
            <Users size={13} className="text-juro-orange" />
            <span className="pixel-text text-[9px] uppercase font-bold tracking-tight max-w-[64px] sm:max-w-none truncate">
              {myProfile?.name || "Perawat"}
            </span>
            {partnerProfile && (
              <span className="px-1 py-0.2 bg-emerald-500 text-white pixel-text text-[7px] uppercase font-bold border border-charcoal">
                2P
              </span>
            )}
          </button>

          <IconButton
            icon={RotateCcw}
            label="Reset sudut pandang kamera"
            size="sm"
            onClick={handleResetCamera}
          />

          <IconButton
            icon={soundEnabled ? Volume2 : VolumeX}
            label={soundEnabled ? "Nonaktifkan suara" : "Aktifkan suara"}
            size="sm"
            onClick={handleToggleSound}
          />

          <IconButton
            icon={theme === "light" ? Moon : Sun}
            label="Ganti mode tema"
            size="sm"
            onClick={handleToggleTheme}
          />

          <Link to="/settings" onClick={() => soundEffects.playTab()}>
            <IconButton
              icon={Settings}
              label="Pengaturan"
              size="sm"
              isActive={location.pathname === "/settings"}
            />
          </Link>
        </div>
      </nav>
    </header>
  );
};
