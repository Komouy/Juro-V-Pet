import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { desktopGlanceService } from "../../services/desktopGlanceService";
import { PetGlanceCard } from "./PetGlanceCard";
import { soundEffects } from "../../engine/audio/soundEffects";

export const DesktopPetGlance: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setTick] = useState(0);

  useEffect(() => {
    return desktopGlanceService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const handleOpenValley3D = useCallback(() => {
    desktopGlanceService.focusMainWindow();
    if (desktopGlanceService.isPipActive()) {
      desktopGlanceService.closeDesktopPip();
    }
    if (desktopGlanceService.isGlanceDockOpen()) {
      desktopGlanceService.toggleDock(false);
    }
    soundEffects.playClick();
    if (location.pathname !== "/") {
      navigate("/");
    }
  }, [location.pathname, navigate]);

  const handleCloseGlance = useCallback(() => {
    soundEffects.playDismiss();
    if (desktopGlanceService.isPipActive()) {
      desktopGlanceService.closeDesktopPip();
    }
    if (desktopGlanceService.isGlanceDockOpen()) {
      desktopGlanceService.toggleDock(false);
    }
  }, []);

  // 0. Render Native Android Picture-in-Picture full-viewport overlay
  if (desktopGlanceService.isNativePipActive()) {
    return (
      <div className="fixed inset-0 z-[9999] bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-2 overflow-hidden select-none">
        <PetGlanceCard
          isDetachedWindow={true}
          onClose={handleCloseGlance}
          onOpenValley3D={handleOpenValley3D}
        />
      </div>
    );
  }

  // 1. Render directly into Desktop Picture-in-Picture window if active
  const pipContainer = desktopGlanceService.getPipContainer();
  if (desktopGlanceService.isPipActive() && pipContainer) {
    return ReactDOM.createPortal(
      <div className="w-full h-full p-2 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <PetGlanceCard
          isDetachedWindow={true}
          onClose={handleCloseGlance}
          onOpenValley3D={handleOpenValley3D}
        />
      </div>,
      pipContainer
    );
  }

  // 2. Render In-Tab Floating Dock if dock is opened
  if (desktopGlanceService.isGlanceDockOpen()) {
    return (
      <div className="fixed bottom-18 md:bottom-5 right-4 z-50 animate-tray-enter">
        <PetGlanceCard
          isDetachedWindow={false}
          onClose={handleCloseGlance}
          onOpenValley3D={handleOpenValley3D}
        />
      </div>
    );
  }

  return null;
};
