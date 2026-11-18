import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { PixelToast } from "../ui/PixelToast";

const SUB_ROUTES = new Set(["/shop", "/mine", "/collection", "/evolution", "/settings"]);

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const isHome = !SUB_ROUTES.has(location.pathname);

  return (
    <div
      className={`${
        isHome ? "h-dvh overflow-hidden" : "min-h-screen"
      } flex flex-col bg-warm-white text-charcoal dark:bg-dark-bg dark:text-neutral-100 transition-colors duration-150`}
    >
      <Navbar />
      <PixelToast />
      <div
        className={`flex-1 flex flex-col w-full ${
          isHome ? "min-h-0 pb-15 md:pb-0" : "pb-20 md:pb-8"
        }`}
      >
        {isHome ? (
          <Outlet />
        ) : (
          <div key={location.pathname} className="animate-page-enter w-full flex-1 flex flex-col">
            <Outlet />
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
};
