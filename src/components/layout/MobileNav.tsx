import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Store, Pickaxe, TrendingUp } from "lucide-react";
import { soundEffects } from "../../engine/audio/soundEffects";
import { useGameStore } from "../../stores/gameStore";

const MOBILE_LINKS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/shop", label: "Toko", icon: Store },
  { path: "/mine", label: "Tambang", icon: Pickaxe },
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200/80 dark:border-neutral-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 px-2 max-w-lg mx-auto">
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
                relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors select-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juro-orange focus-visible:ring-inset
                ${
                  isActive
                    ? "text-juro-orange font-semibold"
                    : "text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white"
                }
              `}
            >
              {isActive && (
                <span
                  className="absolute top-0 w-6 h-0.5 rounded-full bg-juro-orange"
                  aria-hidden="true"
                />
              )}
              <span className="relative inline-flex">
                <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
                {showDot && (
                  <span
                    className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-sky-500"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="text-[11px] font-medium mt-0.5 leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
