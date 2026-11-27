import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { PixelToast } from "../ui/PixelToast";
import { CaregiverHubModal } from "../caregiver/CaregiverHubModal";
import { DesktopPetGlance } from "../glance/DesktopPetGlance";
import { HomePage } from "../../pages/HomePage";
import { useCaregiverStore } from "../../stores/caregiverStore";
import { useUIStore } from "../../stores/uiStore";
import { isNightWeather } from "../../types/ui";
import { soundEffects } from "../../engine/audio/soundEffects";
import { isBedtimeHour } from "../../utils/timeOfDay";

const OVERLAY_ROUTES = new Set(["/shop", "/mine", "/collection", "/evolution", "/settings"]);

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isOverlayOpen = OVERLAY_ROUTES.has(location.pathname);
  const isHubModalOpen = useCaregiverStore((s) => s.isHubModalOpen);
  const closeHubModal = useCaregiverStore((s) => s.closeHubModal);
  const weather = useUIStore((s) => s.weather);
  const scanlinesEnabled = useUIStore((s) => s.scanlinesEnabled);

  // Seamless BGM switching per view & day/night phase
  useEffect(() => {
    if (!isOverlayOpen) {
      const isNight = isNightWeather(weather) || isBedtimeHour(new Date());
      soundEffects.setBgmTrack(isNight ? "lullaby" : "meadow");
    } else if (location.pathname === "/shop") {
      soundEffects.setBgmTrack("shop");
    } else if (location.pathname === "/mine") {
      soundEffects.setBgmTrack("mine");
    } else {
      soundEffects.setBgmTrack("cozy");
    }
  }, [isOverlayOpen, location.pathname, weather]);

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
    <div className="h-dvh overflow-hidden flex flex-col bg-[#F4EFE6] text-charcoal dark:bg-[#141519] dark:text-[#F4F4F5] transition-colors duration-150">
      <Navbar />
      <PixelToast />
      <CaregiverHubModal isOpen={isHubModalOpen} onClose={closeHubModal} />
      <DesktopPetGlance />

      <div className="relative flex-1 min-h-0 w-full flex flex-col pb-14 md:pb-0">
        {/* Persistent Live 3D Juro Viewport (pauses WebGL loop while overlay or modal covers screen) */}
        <HomePage isPaused={isOverlayOpen || isHubModalOpen} />

        {/* Handheld Expansion Screen Overlay for Toko, Tambang, Evolusi & Pengaturan */}
        {isOverlayOpen && (
          <div
            onClick={() => {
              soundEffects.playDismiss();
              navigate("/");
            }}
            className="absolute inset-0 z-40 flex items-center justify-center p-2.5 pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:p-5 sm:pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6 bg-charcoal/55 animate-fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-full flex flex-col rounded-[8px] bg-[#F4EFE6] dark:bg-[#141519] border-2 border-charcoal dark:border-[#4A4E5E] shadow-[6px_6px_0_#18181B] dark:shadow-[6px_6px_0_#09090B] overflow-hidden animate-scale-up"
            >
              {scanlinesEnabled && (
                <div
                  aria-hidden="true"
                  className="console-scanlines absolute inset-0 pointer-events-none z-50"
                />
              )}
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
