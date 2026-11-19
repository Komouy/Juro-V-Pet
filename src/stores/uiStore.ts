import { create } from "zustand";
import type { ThemeMode, WeatherMode } from "../types/ui";

export type ToastTone = "success" | "warn" | "info";

export interface UIToast {
  id: number;
  text: string;
  tone: ToastTone;
}

let toastSeq = 0;

interface UIState {
  theme: ThemeMode;
  weather: WeatherMode;
  soundEnabled: boolean;
  isMobileNavOpen: boolean;
  toast: UIToast | null;
  cameraResetNonce: number;
  toggleTheme: () => void;
  toggleWeather: () => void;
  setWeather: (weather: WeatherMode) => void;
  toggleSound: () => void;
  setMobileNav: (open: boolean) => void;
  showToast: (text: string, tone?: ToastTone) => void;
  clearToast: () => void;
  triggerCameraReset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  weather: "clear",
  soundEnabled: true,
  isMobileNavOpen: false,
  toast: null,
  cameraResetNonce: 0,
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { theme: next };
    }),
  toggleWeather: () =>
    set((s) => ({
      weather: s.weather === "clear" ? "rain" : "clear",
    })),
  setWeather: (weather) => set({ weather }),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  setMobileNav: (open) => set({ isMobileNavOpen: open }),
  showToast: (text, tone = "success") =>
    set({
      toast: {
        id: ++toastSeq,
        text,
        tone,
      },
    }),
  clearToast: () => set({ toast: null }),
  triggerCameraReset: () => set((s) => ({ cameraResetNonce: s.cameraResetNonce + 1 })),
}));
