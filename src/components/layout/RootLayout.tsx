import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { PixelToast } from "../ui/PixelToast";
import { CaregiverHubModal } from "../caregiver/CaregiverHubModal";
import { DesktopPetGlance } from "../glance/DesktopPetGlance";
import { HomePage } from "../../pages/HomePage";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { soundEffects } from "../../engine/audio/soundEffects";
import { isBedtimeHour } from "../../utils/timeOfDay";

const OVERLAY_ROUTES = new Set(["/shop", "/mine", "/collection", "/evolution", "/settings"]);

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isOverlayOpen = OVERLAY_ROUTES.has(location.pathname);
  const { isHubModalOpen, closeHubModal } = useCaregiverStore();

  // Seamless BGM switching per view
  useEffect(() => {
    if (!isOverlayOpen) {
      const isNight = isBedtimeHour(new Date());
      soundEffects.setBgmTrack(isNight ? "lullaby" : "meadow");
    } else if (location.pathname === "/shop") {
      soundEffects.setBgmTrack("shop");
    } else if (location.pathname === "/mine") {
      soundEffects.setBgmTrack("mine");
    } else {
      soundEffects.setBgmTrack("cozy");
    }
  }, [isOverlayOpen, location.pathname]);

  // Close active overlay back to Home when pressing Escape (unless Caregiver modal is open)
  useEffect(() => {
    if (!isOverlayOpen || isHubModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        soundEffects.playDismiss();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOverlayOpen, isHubModalOpen, navigate]);

  // Automatically reconnect Firebase listener if an active room exists
  useEffect(() => {
    const caregiver = useCaregiverStore.getState();
    if (caregiver.activeRoomCode && caregiver.myProfile) {
      caregiver.initRealtimeSubscription();
    }
  }, []);

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-neutral-50 text-neutral-900 dark:bg-dark-bg dark:text-neutral-100 transition-colors duration-150">
      <Navbar />
      <PixelToast />
      <CaregiverHubModal isOpen={isHubModalOpen} onClose={closeHubModal} />
      <DesktopPetGlance />

      <div className="relative flex-1 min-h-0 w-full flex flex-col pb-14 md:pb-0">
        {/* Persistent Live 3D Juro Viewport */}
        <HomePage />

        {/* Minimalist Floating Sheet Overlay for Toko, Tambang, Evolusi & Pengaturan */}
        {isOverlayOpen && (
          <div
            onClick={() => {
              soundEffects.playDismiss();
              navigate("/");
            }}
            className="absolute inset-0 z-40 flex items-center justify-center p-2.5 sm:p-5 md:p-6 bg-neutral-950/35 animate-fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-full flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xl overflow-hidden animate-scale-up"
            >
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div key={location.pathname} className="animate-page-enter">
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
};
