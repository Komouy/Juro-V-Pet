import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Store, Pickaxe, Archive, TrendingUp } from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useGameStore } from "../../stores/gameStore";

const MOBILE_LINKS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/shop", label: "Toko", icon: Store },
  { path: "/mine", label: "Tambang", icon: Pickaxe },
  { path: "/collection", label: "Koleksi", icon: Archive },
  { path: "/evolution", label: "Evolusi", icon: TrendingUp },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const hasCrystals = useGameStore(
    (s) =>
      (s.crystals.quartz ?? 0) +
        (s.crystals.amber ?? 0) +
        (s.crystals.emerald ?? 0) +
        (s.crystals.amethyst ?? 0) >
      0
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-dark-surface/95 border-t-2 border-charcoal dark:border-neutral-700 backdrop-blur-xs pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-15 px-1 max-w-lg mx-auto">
        {MOBILE_LINKS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          const showDot = path === "/shop" && hasCrystals && !isActive;
          return (
            <Link
              key={path}
              to={path}
              aria-label={label}
              onClick={() => {
                if (!isActive) soundEffects.playTab();
              }}
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all select-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange focus-visible:ring-inset
                ${
                  isActive
                    ? "text-juro-orange border-t-2 border-juro-orange -mt-[2px] font-bold"
                    : "text-muted hover:text-charcoal dark:hover:text-white"
                }
              `}
            >
              <span className="relative inline-flex">
                <Icon size={18} strokeWidth={isActive ? 2.8 : 2.2} />
                {showDot && (
                  <span
                    className="absolute -top-0.5 -right-1 w-2 h-2 bg-sky-400 border border-charcoal"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="pixel-text text-[8.5px] uppercase tracking-tight mt-1">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
