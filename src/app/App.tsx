import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { persistenceService } from "../services/persistenceService";
import { notificationService } from "../services/notificationService";
import { usePetStore } from "../stores/petStore";

export const App: React.FC = () => {
  useEffect(() => {
    persistenceService.initialize();

    // Periksa status kebutuhan kritis pada startup dan berkala tiap 60 detik
    const checkNeeds = () => {
      const { hunger, energy, cleanliness } = usePetStore.getState();
      notificationService.checkCriticalNeeds({ hunger, energy, cleanliness });
    };

    checkNeeds();
    const interval = setInterval(checkNeeds, 60_000);

    return () => clearInterval(interval);
  }, []);

  return <RouterProvider router={router} />;
};
