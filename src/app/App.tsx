import React, { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { persistenceService } from "../services/persistenceService";
import { notificationService } from "../services/notificationService";
import { desktopGlanceService } from "../services/desktopGlanceService";
import { usePetStore } from "../stores/petStore";
import { useCaregiverStore } from "../stores/caregiverStore";

export const App: React.FC = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const handleVisibilityChange = () => {
      const { hunger, energy, cleanliness, name } = usePetStore.getState();
      if (typeof document !== "undefined" && document.hidden) {
        // Saat aplikasi diminimalkan atau beralih ke latar belakang:
        // Jadwalkan alarm notifikasi native mandiri dan sinkronkan widget Android
        notificationService.scheduleBackgroundAlerts(
          { hunger, energy, cleanliness },
          name
        );
        desktopGlanceService.updateAndroidWidget(
          name,
          `${name} sedang santai di lembah.`,
          Math.round(hunger),
          Math.round(energy)
        );
      } else {
        // Saat aplikasi dibuka kembali: bersihkan jadwal pengingat lama agar tidak berulang
        notificationService.cancelScheduledAlerts();
        notificationService.checkCriticalNeeds({ hunger, energy, cleanliness });
      }
    };

    const boot = async () => {
      await persistenceService.initialize();
      await notificationService.initNotificationChannel();

      // Hubungkan kembali listener realtime 2-Player jika ada kamar aktif tersimpan
      const activeRoom = useCaregiverStore.getState().activeRoomCode;
      if (activeRoom) {
        useCaregiverStore.getState().initRealtimeSubscription();
      }

      setIsHydrated(true);

      // Periksa status kebutuhan kritis pada startup dan berkala tiap 60 detik saat aktif
      const checkNeeds = () => {
        const { hunger, energy, cleanliness } = usePetStore.getState();
        notificationService.checkCriticalNeeds({ hunger, energy, cleanliness });
      };

      checkNeeds();
      interval = setInterval(checkNeeds, 60_000);

      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.addEventListener("pagehide", handleVisibilityChange);
      }
    };

    boot();

    return () => {
      if (interval) clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", handleVisibilityChange);
      }
    };
  }, []);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-warm-white dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-card-bg dark:bg-dark-card border-2 border-charcoal dark:border-neutral-700 shadow-retro px-6 py-4 text-center">
          <p className="pixel-text text-sm font-bold text-charcoal dark:text-neutral-200">
            Memuat Dunia Juro...
          </p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
};
